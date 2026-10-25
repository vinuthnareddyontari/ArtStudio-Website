
console.log("Art Studio frontend loaded successfully!");

let allPaintings = [];
let ratePerSqFt = null;
let currentUser = null;

// Authentication token is stored for the current browser.
const TOKEN_KEY = "artStudioToken";
const API_BASE = "/api";

// 1. GENERAL API HELPER

async function apiRequest(url, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);

  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  const contentType = response.headers.get("content-type") || "";
  const result = contentType.includes("application/json")
    ? await response.json()
    : {};

  if (response.status === 401 && token) {
    localStorage.removeItem(TOKEN_KEY);
    currentUser = null;
    updateAuthUI();
  }

  if (!response.ok) {
    throw new Error(
      result.message ||
      result.error ||
      `Request failed (${response.status}).`
    );
  }

  return result;
}

function showMessage(element, message) {
  if (element) element.textContent = message;
}

function setButtonLoading(button, loading, normalText) {
  if (!button) return;

  button.disabled = loading;
  button.textContent = loading ? "Please wait..." : normalText;
}

// 2. AUTHENTICATION UI


function updateAuthUI() {
  const status = document.querySelector("#authStatus");
  const logoutButton = document.querySelector("#logoutButton");
  const registerForm = document.querySelector("#registerForm");
  const loginForm = document.querySelector("#loginForm");
  const studioLoginForm = document.querySelector("#studioLoginForm");
  const studioDashboard = document.querySelector("#studioDashboard");

  const isLoggedIn = Boolean(currentUser);
  const isStudio = currentUser?.role === "studio";

  if (isLoggedIn) {
    const roleLabel = isStudio
      ? "Studio administrator"
      : "Customer";

    showMessage(
      status,
      `Logged in as ${currentUser.name || currentUser.email} (${roleLabel}).`
    );
  } else {
    showMessage(
      status,
      "You are not logged in. Log in to make bookings and pottery orders."
    );
  }

  if (logoutButton) logoutButton.hidden = !isLoggedIn;
  if (registerForm) registerForm.hidden = isLoggedIn;
  if (loginForm) loginForm.hidden = isLoggedIn;
  if (studioLoginForm) studioLoginForm.hidden = isLoggedIn;

  // Show the admin dashboard only to authenticated studio users.
  if (studioDashboard) {
    studioDashboard.hidden = !isStudio;
  }
}

async function loadAdminWallBookings() {
  const container = document.querySelector("#adminWallBookings");
  const button = document.querySelector("#loadWallBookings");

  if (!container || currentUser?.role !== "studio") {
    return;
  }

  container.textContent = "Loading wall bookings...";
  if (button) button.disabled = true;

  try {
    const result = await apiRequest(`${API_BASE}/studio/wall-bookings`);
    const bookings = Array.isArray(result)
      ? result
      : result.bookings || result.wallBookings || [];

    if (bookings.length === 0) {
      container.textContent = "No wall-painting bookings found.";
      return;
    }

    container.replaceChildren();

    bookings.forEach((booking) => {
      const card = document.createElement("article");
      const heading = document.createElement("h4");
      const details = document.createElement("p");
      const status = document.createElement("p");

      heading.textContent = `Booking: ${booking.date || "Date not available"}`;

      details.textContent =
        `Wall size: ${booking.wallSize ?? booking.sizeSqFt ?? booking.size ?? "N/A"} sq ft | ` +
        `Address: ${booking.address || "N/A"} | ` +
        `Price: ₹${booking.totalPrice ?? booking.price ?? "N/A"}`;

      status.textContent = `Status: ${booking.status || "unknown"}`;

      card.append(heading, details, status);

      const bookingId = booking._id || booking.id;

      if (booking.status === "requested" && bookingId) {
        ["accepted", "declined"].forEach((nextStatus) => {
          const actionButton = document.createElement("button");
          actionButton.type = "button";
          actionButton.textContent =
            nextStatus === "accepted" ? "Accept" : "Decline";

          actionButton.addEventListener("click", async () => {
            actionButton.disabled = true;

            try {
              await apiRequest(
                `${API_BASE}/studio/wall-bookings/${encodeURIComponent(bookingId)}/status`,
                {
                  method: "PATCH",
                  body: JSON.stringify({ status: nextStatus })
                }
              );

              await loadAdminWallBookings();
            } catch (error) {
              alert(`Could not update booking: ${error.message}`);
              actionButton.disabled = false;
            }
          });

          card.appendChild(actionButton);
        });
      }

      card.style.border = "1px solid #ddd";
      card.style.borderRadius = "8px";
      card.style.padding = "12px";
      card.style.marginBottom = "12px";

      container.appendChild(card);
    });
  } catch (error) {
    container.textContent = `Could not load bookings: ${error.message}`;
  } finally {
    if (button) button.disabled = false;
  }
}

async function loadAdminPotteryOrders() {
  const container = document.querySelector("#adminPotteryOrders");
  const button = document.querySelector("#loadPotteryOrders");

  if (!container || currentUser?.role !== "studio") {
    return;
  }

  container.textContent = "Loading pottery orders...";
  if (button) button.disabled = true;

  try {
    const result = await apiRequest(`${API_BASE}/studio/pottery-orders`);

    const orders = Array.isArray(result)
      ? result
      : result.orders || result.potteryOrders || [];

    if (orders.length === 0) {
      container.textContent = "No custom pottery orders found.";
      return;
    }

    container.replaceChildren();

    orders.forEach((order) => {
      const card = document.createElement("article");
      const heading = document.createElement("h4");
      const details = document.createElement("p");
      const status = document.createElement("p");

      heading.textContent = order.itemName || order.item || "Custom pottery order";

      details.textContent =
        `Glaze: ${order.glazeName || order.glaze || "N/A"} | ` +
        `Quantity: ${order.quantity ?? "N/A"} | ` +
        `Needed by: ${order.neededBy || order.neededByDate || "N/A"}`;

      status.textContent = `Status: ${order.status || "unknown"}`;

      card.append(heading, details, status);

      const orderId = order._id || order.id;

      if (order.status === "requested" && orderId) {
        ["accepted", "declined"].forEach((nextStatus) => {
          const actionButton = document.createElement("button");
          actionButton.type = "button";
          actionButton.textContent =
            nextStatus === "accepted" ? "Accept" : "Decline";

          actionButton.addEventListener("click", async () => {
            actionButton.disabled = true;

            try {
              await apiRequest(
                `${API_BASE}/studio/pottery-orders/${encodeURIComponent(orderId)}/status`,
                {
                  method: "PATCH",
                  body: JSON.stringify({ status: nextStatus })
                }
              );

              await loadAdminPotteryOrders();
            } catch (error) {
              alert(`Could not update pottery order: ${error.message}`);
              actionButton.disabled = false;
            }
          });

          card.appendChild(actionButton);
        });
      }

      card.style.border = "1px solid #ddd";
      card.style.borderRadius = "8px";
      card.style.padding = "12px";
      card.style.marginBottom = "12px";

      container.appendChild(card);
    });
  } catch (error) {
    container.textContent = `Could not load pottery orders: ${error.message}`;
  } finally {
    if (button) button.disabled = false;
  }
}


async function loadCurrentUser() {
  const token = localStorage.getItem(TOKEN_KEY);

  console.log("Session restoration started.");
  console.log("Saved token exists:", Boolean(token));

  if (!token) {
    currentUser = null;
    updateAuthUI();
    console.log("No saved token found.");
    return;
  }

  try {
    console.log("Calling /api/auth/me...");

    const result = await apiRequest(`${API_BASE}/auth/me`);

    currentUser = result.user || result;

    console.log("Session restored. Role:", currentUser.role);
  } catch (error) {
    console.error("Session restoration failed:", error.message);

    // Keep the token temporarily so we can investigate the error.
    // Don't clear it until we've identified the cause.
    currentUser = null;
  }

  updateAuthUI();
}

function setupRegistration() {
  const form = document.querySelector("#registerForm");
  const message = document.querySelector("#registerMessage");
  const button = document.querySelector("#registerSubmit");

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showMessage(message, "");
    setButtonLoading(button, true, "Create Account");

    try {
      const payload = {
        name: document.querySelector("#registerName").value.trim(),
        email: document.querySelector("#registerEmail").value.trim(),
        password: document.querySelector("#registerPassword").value
      };

      const result = await apiRequest(`${API_BASE}/auth/register`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      showMessage(
        message,
        result.message || "Account created successfully. Please log in."
      );

      form.reset();

      // Registration does not automatically log in unless the API
      // explicitly returns a token.
      if (result.token) {
        localStorage.setItem(TOKEN_KEY, result.token);
        currentUser = result.user || null;
        updateAuthUI();
      }
    } catch (error) {
      showMessage(message, error.message);
    } finally {
      setButtonLoading(button, false, "Create Account");
    }
  });
}

async function performLogin(email, password, message, button, expectedRole) {
  showMessage(message, "");
  setButtonLoading(button, true, expectedRole === "studio" ? "Studio Login" : "Login");

  try {
    const result = await apiRequest(`${API_BASE}/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    if (!result.token) {
      throw new Error("The server did not return an authentication token.");
    }

    const user = result.user;

    if (!user || !user.role) {
      throw new Error("The server returned incomplete account information.");
    }

    if (user.role !== expectedRole) {
      throw new Error(
        expectedRole === "studio"
          ? "This account is not a studio account. Use customer login instead."
          : "This is a studio account. Please use Studio Administration login."
      );
    }

    localStorage.setItem(TOKEN_KEY, result.token);
    currentUser = user;
    updateAuthUI();

    showMessage(message, result.message || "Login successful!");

    // Refresh protected information if applicable.
    await loadMyRequestsIfPresent();
  } catch (error) {
    showMessage(message, error.message);
  } finally {
    setButtonLoading(
      button,
      false,
      expectedRole === "studio" ? "Studio Login" : "Login"
    );
  }
}

function setupLogin() {
  const form = document.querySelector("#loginForm");
  const message = document.querySelector("#loginMessage");
  const button = document.querySelector("#loginSubmit");

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      await performLogin(
        document.querySelector("#loginEmail").value.trim(),
        document.querySelector("#loginPassword").value,
        message,
        button,
        "customer"
      );
    });
  }

  const studioForm = document.querySelector("#studioLoginForm");
  const studioMessage = document.querySelector("#studioLoginMessage");
  const studioButton = document.querySelector("#studioLoginSubmit");

  if (studioForm) {
    studioForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      await performLogin(
        document.querySelector("#studioEmail").value.trim(),
        document.querySelector("#studioPassword").value,
        studioMessage,
        studioButton,
        "studio"
      );
    });
  }

  const logoutButton = document.querySelector("#logoutButton");

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      localStorage.removeItem(TOKEN_KEY);
      currentUser = null;
      updateAuthUI();

      showMessage(
        document.querySelector("#loginMessage"),
        "You have logged out successfully."
      );

      showMessage(document.querySelector("#registerMessage"), "");
      showMessage(document.querySelector("#studioLoginMessage"), "");
    });
  }
}

// Placeholder for the customer request-history feature we will add later.
async function loadMyRequestsIfPresent() {
  // Request history UI will be connected in a later step.
}

// 3. LOAD PAINTINGS

async function loadPaintings() {
  const gallery = document.querySelector("#gallery");
  const count = document.querySelector("#paintingCount");

  if (!gallery) return;

  try {
    gallery.textContent = "Loading paintings...";

    const response = await fetch(`${API_BASE}/paintings`);
    if (!response.ok) throw new Error("Failed to load paintings.");

    allPaintings = await response.json();
    renderPaintings();
  } catch (error) {
    console.error("Error loading paintings:", error);
    gallery.textContent = "Unable to load paintings. Please try again.";

    if (count) count.textContent = "Unable to load paintings.";
  }
}

// 4. SEARCH, FILTER, SORT AND DISPLAY PAINTINGS


function renderPaintings() {
  const gallery = document.querySelector("#gallery");
  const count = document.querySelector("#paintingCount");
  const searchInput = document.querySelector("#searchInput");
  const statusFilter = document.querySelector("#statusFilter");
  const sortSelect = document.querySelector("#sortSelect");

  if (!gallery) return;

  const searchTerm = searchInput?.value.trim().toLowerCase() || "";
  const selectedStatus = statusFilter?.value || "all";
  const sortOption = sortSelect?.value || "default";

  let filtered = allPaintings.filter((painting) => {
    const title = (painting.title || "").toLowerCase();
    const artist = (painting.artist || "").toLowerCase();
    const status = (painting.status || "available").toLowerCase();

    return (
      (title.includes(searchTerm) || artist.includes(searchTerm)) &&
      (selectedStatus === "all" || status === selectedStatus)
    );
  });

  if (sortOption === "low-high") {
    filtered.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  } else if (sortOption === "high-low") {
    filtered.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  }

  gallery.replaceChildren();

  if (count) {
    count.textContent =
      `Showing ${filtered.length} of ${allPaintings.length} paintings`;
  }

  if (filtered.length === 0) {
    gallery.textContent =
      "No paintings match your search. Try changing your filters.";
    return;
  }

  filtered.forEach((painting) => {
    const card = document.createElement("article");
    card.className = "painting-card";

    const image = document.createElement("img");
    image.src = painting.imageUrl || "";
    image.alt = painting.title || "Artwork";
    image.loading = "lazy";

    image.addEventListener("error", () => {
      image.style.display = "none";
    });

    const title = document.createElement("h3");
    title.textContent = painting.title || "Untitled";

    const artist = document.createElement("p");
    artist.textContent = `Artist: ${painting.artist || "Unknown"}`;

    const description = document.createElement("p");
    description.textContent = painting.description || "";

    const price = document.createElement("p");
    price.className = "painting-price";
    price.textContent = painting.price != null
      ? `₹${Number(painting.price).toLocaleString("en-IN")}`
      : "Price unavailable";

    const status = document.createElement("p");
    status.className = "painting-status";

    const paintingStatus =
      (painting.status || "available").toLowerCase();
    const available = paintingStatus === "available";

    status.textContent = available ? "Available" : "Sold";

    if (!available) status.classList.add("sold");

    card.append(image, title, artist, description, price, status);

    // Add the purchase button for customers only.
    if (currentUser?.role === "customer" && available) {
      const buyButton = document.createElement("button");
      buyButton.type = "button";
      buyButton.textContent = "Buy Painting";

      buyButton.addEventListener("click", async () => {
        const confirmed = window.confirm(
          `Purchase "${painting.title}" for ₹${Number(
            painting.price
          ).toLocaleString("en-IN")}?`
        );

        if (!confirmed) return;

        buyButton.disabled = true;
        buyButton.textContent = "Processing...";

        try {
          const result = await apiRequest(
            `${API_BASE}/paintings/${encodeURIComponent(painting.id)}/buy`,
            { method: "POST" }
          );

          window.alert(
            result.message || "Painting purchased successfully!"
          );

          await loadPaintings();
        } catch (error) {
          window.alert(error.message || "Unable to purchase painting.");
          await loadPaintings();
        } finally {
          buyButton.disabled = false;
          buyButton.textContent = "Buy Painting";
        }
      });

      card.appendChild(buyButton);
    }

    gallery.appendChild(card);
  });
}


// 5. DATE HELPERS

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function setupBookingDates() {
  const input = document.querySelector("#bookingDate");
  if (!input) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const min = new Date(today);
  min.setDate(min.getDate() + 7);

  const max = new Date(today);
  max.setDate(max.getDate() + 90);

  input.min = formatDate(min);
  input.max = formatDate(max);
}

function setupPotteryDate() {
  const input = document.querySelector("#potteryNeededBy");
  if (!input) return;

  const min = new Date();
  min.setHours(0, 0, 0, 0);
  min.setDate(min.getDate() + 14);

  input.min = formatDate(min);
}

// 6. LOAD WALL-PAINTING RATE

async function loadMuralRate() {
  const wallPrice = document.querySelector("#wallPrice");
  if (!wallPrice) return;

  try {
    wallPrice.textContent = "Loading wall-painting rate...";

    const response = await fetch(`${API_BASE}/mural-rate`);
    if (!response.ok) throw new Error("Rate request failed.");

    const data = await response.json();
    const rate = Number(data.ratePerSqFt);

    if (!Number.isFinite(rate) || rate < 0) {
      throw new Error("Invalid wall-painting rate.");
    }

    ratePerSqFt = rate;
    updateWallPrice();
  } catch (error) {
    console.error("Error loading mural rate:", error);
    wallPrice.textContent =
      "Unable to load the price. Please check the server.";
  }
}

// 7. CALCULATE WALL PRICE

function updateWallPrice() {
  const sizeInput = document.querySelector("#wallSize");
  const wallPrice = document.querySelector("#wallPrice");

  if (!sizeInput || !wallPrice) return;

  if (sizeInput.value.trim() === "") {
    wallPrice.textContent = "Enter the wall size to calculate the price.";
    return;
  }

  const size = Number(sizeInput.value);

  if (!Number.isFinite(size) || size < 10 || size > 500) {
    wallPrice.textContent =
      "Wall size must be between 10 and 500 sq. ft.";
    return;
  }

  if (ratePerSqFt === null) {
    wallPrice.textContent = "Waiting for the wall-painting rate...";
    return;
  }

  wallPrice.textContent =
    `Estimated price: ₹${(size * ratePerSqFt).toLocaleString("en-IN")} ` +
    `(${size} sq. ft. × ₹${ratePerSqFt.toLocaleString("en-IN")}/sq. ft.)`;
}

// 8. LOAD POTTERY OPTIONS

async function loadPotteryOptions() {
  const itemSelect = document.querySelector("#potteryItem");
  const glazeSelect = document.querySelector("#potteryGlaze");
  const message = document.querySelector("#potteryMessageStatus");
  const submit = document.querySelector("#potterySubmit");

  if (!itemSelect || !glazeSelect) return;

  try {
    itemSelect.replaceChildren();
    glazeSelect.replaceChildren();

    const response = await fetch(`${API_BASE}/pottery-options`);
    if (!response.ok) throw new Error("Unable to load pottery options.");

    const data = await response.json();

    function fillSelect(select, placeholder, items) {
      select.replaceChildren();

      const first = document.createElement("option");
      first.value = "";
      first.textContent = placeholder;
      select.appendChild(first);

      items.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = item.name;
        select.appendChild(option);
      });
    }

    fillSelect(itemSelect, "Choose a pottery item", data.potteryItems || []);
    fillSelect(glazeSelect, "Choose a glaze", data.glazes || []);

    if (message) message.textContent = "";
    if (submit) submit.disabled = false;
  } catch (error) {
    console.error("Error loading pottery options:", error);

    itemSelect.replaceChildren();
    glazeSelect.replaceChildren();

    const itemError = document.createElement("option");
    itemError.textContent = "Could not load pottery items";
    itemSelect.appendChild(itemError);

    const glazeError = document.createElement("option");
    glazeError.textContent = "Could not load glazes";
    glazeSelect.appendChild(glazeError);

    if (message) message.textContent = error.message;
    if (submit) submit.disabled = true;
  }
}

// 9. SUBMIT WALL BOOKING

function setupWallBookingForm() {
  const form = document.querySelector("#wallBookingForm");
  const message = document.querySelector("#bookingMessageStatus");
  const submit = document.querySelector("#bookingSubmit");

  if (!form || !message || !submit) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";

    if (!localStorage.getItem(TOKEN_KEY) || !currentUser) {
      message.textContent = "Please log in with your customer account first.";
      document.querySelector("#account")?.scrollIntoView({
        behavior: "smooth"
      });
      return;
    }

    if (currentUser.role !== "customer") {
      message.textContent =
        "Only customer accounts can submit wall-painting bookings.";
      return;
    }

    setButtonLoading(submit, true, "Submit Booking Request");

    try {
      const payload = {
        date: document.querySelector("#bookingDate").value,
        wallSize: Number(document.querySelector("#wallSize").value),
        address: document.querySelector("#wallAddress").value.trim()
      };

      const result = await apiRequest(`${API_BASE}/wall-bookings`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      const booking = result.booking || {};

      const price = Number(booking.totalPrice);
      const priceText = Number.isFinite(price)
        ? ` Total price: ${new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR"
          }).format(price)}.`
        : "";

      message.textContent =
        (result.message || "Booking request submitted.") + priceText;

      form.reset();
      setupBookingDates();
      updateWallPrice();
    } catch (error) {
      message.textContent = error.message;
    } finally {
      setButtonLoading(submit, false, "Submit Booking Request");
    }
  });
}

// 10. SUBMIT POTTERY ORDER

function setupPotteryOrderForm() {
  const form = document.querySelector("#potteryOrderForm");
  const message = document.querySelector("#potteryMessageStatus");
  const submit = document.querySelector("#potterySubmit");

  if (!form || !message || !submit) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";

    if (!localStorage.getItem(TOKEN_KEY) || !currentUser) {
      message.textContent = "Please log in with your customer account first.";
      document.querySelector("#account")?.scrollIntoView({
        behavior: "smooth"
      });
      return;
    }

    if (currentUser.role !== "customer") {
      message.textContent =
        "Only customer accounts can submit pottery orders.";
      return;
    }

    setButtonLoading(submit, true, "Submit Pottery Request");

    try {
      const payload = {
        itemId: document.querySelector("#potteryItem").value,
        glazeId: document.querySelector("#potteryGlaze").value,
        quantity: Number(document.querySelector("#potteryQuantity").value),
        neededBy: document.querySelector("#potteryNeededBy").value
      };

      const result = await apiRequest(`${API_BASE}/pottery-orders`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      message.textContent = result.message || "Pottery request submitted.";

      form.reset();
      setupPotteryDate();
    } catch (error) {
      message.textContent = error.message;
    } finally {
      setButtonLoading(submit, false, "Submit Pottery Request");
    }
  });
}

// 11. INITIALIZE EVERYTHING

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.querySelector("#searchInput");
  const statusFilter = document.querySelector("#statusFilter");
  const sortSelect = document.querySelector("#sortSelect");
  const wallSize = document.querySelector("#wallSize");

  if (searchInput) {
    searchInput.addEventListener("input", renderPaintings);
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", renderPaintings);
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", renderPaintings);
  }

  if (wallSize) {
    wallSize.addEventListener("input", updateWallPrice);
  }

  setupBookingDates();
  setupPotteryDate();

  setupRegistration();
  setupLogin();
  setupWallBookingForm();
  setupPotteryOrderForm();

  loadMuralRate();
loadPotteryOptions();

loadCurrentUser().then(() => {
  loadPaintings();
});
  const loadWallBookingsButton =
  document.querySelector("#loadWallBookings");

if (loadWallBookingsButton) {
  loadWallBookingsButton.addEventListener(
    "click",
    loadAdminWallBookings
  );
}
const loadPotteryOrdersButton =
  document.querySelector("#loadPotteryOrders");

if (loadPotteryOrdersButton) {
  loadPotteryOrdersButton.addEventListener(
    "click",
    loadAdminPotteryOrders
  );
}
});

const addPaintingForm = document.querySelector("#addPaintingForm");

if (addPaintingForm) {
  addPaintingForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = document.querySelector("#addPaintingMessage");
    const submitButton = document.querySelector("#addPaintingSubmit");

    const painting = {
      id: document.querySelector("#paintingId").value.trim(),
      title: document.querySelector("#paintingTitle").value.trim(),
      artist: document.querySelector("#paintingArtist").value.trim(),
      description: document.querySelector("#paintingDescription").value.trim(),
      price: Number(document.querySelector("#paintingPrice").value),
      imageUrl: document.querySelector("#paintingImageUrl").value.trim()
    };

    try {
      submitButton.disabled = true;
      message.textContent = "Adding painting...";

      await apiRequest(`${API_BASE}/paintings`, {
        method: "POST",
        body: JSON.stringify(painting)
      });

      message.textContent = "Painting added successfully!";

      addPaintingForm.reset();

      // Refresh the gallery to show the new painting.
      if (typeof loadPaintings === "function") {
        await loadPaintings();
      } else {
        window.location.reload();
      }
    } catch (error) {
      message.textContent = error.message;
    } finally {
      submitButton.disabled = false;
    }
  });
}
