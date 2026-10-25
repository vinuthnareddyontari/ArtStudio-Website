
const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const connectDB = require("./database");
const seedData = require("./seed-data/seedData/seed.json");

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function getDB() {
  return app.locals.db;
}

// ---------------- AUTHENTICATION MIDDLEWARE ----------------

function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Please log in to continue."
    });
  }

  const token = header.slice(7);

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({
      message: "Your login session is invalid or expired. Please log in again."
    });
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "You do not have permission to perform this action."
      });
    }

    next();
  };
}

function validDate(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);

  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date;
}

function daysFromToday(date) {
  const today = new Date();
  const todayUTC = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  );

  return Math.round(
    (new Date(`${date}T00:00:00.000Z`).getTime() - todayUTC) /
      (24 * 60 * 60 * 1000)
  );
}

function isValidId(id) {
  return typeof id === "string" && ObjectId.isValid(id);
}

function ownerId(userId) {
  return new ObjectId(userId);
}

// ---------------- HEALTH CHECK ----------------

app.get("/api/health", (req, res) => {
  res.json({ message: "Art Studio server is running!" });
});

// ---------------- CUSTOMER REGISTRATION ----------------

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      name.trim().length > 100 ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "Provide a valid name, email, and password."
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        message: "Please provide a valid email address."
      });
    }

    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({
        message: "Password must contain 8–72 characters."
      });
    }

    const db = getDB();
    const users = db.collection("users");

    const existing = await users.findOne({ email: cleanEmail });

    if (existing) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    const user = {
      name: name.trim(),
      email: cleanEmail,
      password: await bcrypt.hash(password, 10),
      role: "customer",
      createdAt: new Date()
    };

    const result = await users.insertOne(user);

    res.status(201).json({
      message: "Registration successful! You can now log in.",
      user: {
        id: result.insertedId.toString(),
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    console.error("Registration error:", error.message);
    res.status(500).json({ message: "Registration failed." });
  }
});

// ---------------- LOGIN: CUSTOMER OR STUDIO ----------------

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Please enter your email and password."
      });
    }

    const user = await getDB()
      .collection("users")
      .findOne({ email: email.trim().toLowerCase() });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Incorrect email or password."
      });
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      message: "Login successful!",
      token,
      user: {
        id: user._id.toString(),
        name: user.name || "Studio",
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Login failed." });
  }
});

// ---------------- CURRENT ACCOUNT ----------------

app.get("/api/auth/me", requireAuth, async (req, res) => {
  try {
    const user = await getDB().collection("users").findOne(
      { _id: ownerId(req.user.userId) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(401).json({
        message: "Account not found. Please log in again."
      });
    }

    res.json({
      user: {
        id: user._id.toString(),
        name: user.name || "Studio",
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Unable to load account." });
  }
});

// ---------------- PAINTINGS ----------------

app.get("/api/paintings", async (req, res) => {
  try {
    const paintings = await getDB()
      .collection("paintings")
      .find({})
      .toArray();

    res.json(paintings);
  } catch (error) {
    console.error("Error fetching paintings:", error.message);
    res.status(500).json({ message: "Failed to fetch paintings." });
  }
});

app.post(
  "/api/paintings",
  requireAuth,
  allowRoles("studio"),
  async (req, res) => {
    try {
      const { id, title, artist, description, price, imageUrl } = req.body;

      // Validate required fields
      if (
        typeof id !== "string" ||
        typeof title !== "string" ||
        typeof artist !== "string" ||
        typeof description !== "string" ||
        typeof imageUrl !== "string" ||
        !id.trim() ||
        !title.trim() ||
        !artist.trim() ||
        !description.trim() ||
        !imageUrl.trim() ||
        !Number.isFinite(price) ||
        price <= 0
      ) {
        return res.status(400).json({
          message:
            "Provide a valid ID, title, artist, description, image URL, and positive price."
        });
      }

      const paintings = getDB().collection("paintings");

      // Prevent duplicate painting IDs
      const existingPainting = await paintings.findOne({
        id: id.trim()
      });

      if (existingPainting) {
        return res.status(409).json({
          message: "A painting with this ID already exists."
        });
      }

      const newPainting = {
        id: id.trim(),
        title: title.trim(),
        artist: artist.trim(),
        description: description.trim(),
        price,
        imageUrl: imageUrl.trim(),
        status: "available"
      };

      await paintings.insertOne(newPainting);

      return res.status(201).json({
        message: "Painting added successfully!",
        painting: newPainting
      });
    } catch (error) {
      console.error("Error adding painting:", error.message);
      return res.status(500).json({
        message: "Failed to add painting."
      });
    }
  }
);

app.post(
  "/api/paintings/:id/buy",
  requireAuth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const paintingId = req.params.id;

      if (!paintingId || !paintingId.trim()) {
        return res.status(400).json({
          message: "A valid painting ID is required."
        });
      }

      const db = getDB();
      const paintings = db.collection("paintings");
      const orders = db.collection("painting_orders");

      // Atomically reserve only an available painting.
      const painting = await paintings.findOneAndUpdate(
        {
          id: paintingId,
          status: "available"
        },
        {
          $set: { status: "sold" }
        },
        { returnDocument: "before" }
      );

      // MongoDB driver versions may return the document
      // directly or inside a "value" property.
      const purchasedPainting = painting?.value ?? painting;

      if (!purchasedPainting) {
        const exists = await paintings.findOne({ id: paintingId });

        if (!exists) {
          return res.status(404).json({
            message: "Painting not found."
          });
        }

        return res.status(409).json({
          message: "This painting is no longer available."
        });
      }

      const order = {
        customerId: ownerId(req.user.userId),
        paintingId: purchasedPainting.id,
        title: purchasedPainting.title,
        artist: purchasedPainting.artist,
        price: purchasedPainting.price,
        imageUrl: purchasedPainting.imageUrl,
        status: "purchased",
        createdAt: new Date()
      };

      try {
        const result = await orders.insertOne(order);

        return res.status(201).json({
          message: "Painting purchased successfully!",
          order: {
            id: result.insertedId.toString(),
            ...order
          }
        });
      } catch (error) {
        // Restore availability if saving the order fails.
        await paintings.updateOne(
          { id: paintingId, status: "sold" },
          { $set: { status: "available" } }
        );

        throw error;
      }
    } catch (error) {
      console.error("Painting purchase error:", error.message);

      return res.status(500).json({
        message: "Failed to purchase painting."
      });
    }
  }
);


// ---------------- WALL PAINTING RATE ----------------

app.get("/api/mural-rate", (req, res) => {
  const rate = seedData.mural?.ratePerSqFt;

  if (typeof rate !== "number" || !Number.isFinite(rate)) {
    return res.status(500).json({
      message: "Mural price is missing or invalid in seed.json."
    });
  }

  res.json({ ratePerSqFt: rate });
});

// ---------------- CREATE WALL BOOKING ----------------

app.post(
  "/api/wall-bookings",
  requireAuth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const { date, wallSize, address } = req.body;

      if (!date || wallSize === undefined || !address) {
        return res.status(400).json({
          message: "Please provide a date, wall size, and address."
        });
      }

      if (!validDate(date)) {
        return res.status(400).json({
          message: "Please provide a valid calendar date."
        });
      }

      const daysAhead = daysFromToday(date);

      if (daysAhead < 7 || daysAhead > 90) {
        return res.status(400).json({
          message: "Choose a date between 7 and 90 days from today."
        });
      }

      const size = Number(wallSize);

      if (!Number.isFinite(size) || size < 10 || size > 500) {
        return res.status(400).json({
          message: "Wall size must be between 10 and 500 sq. ft."
        });
      }

      if (
        typeof address !== "string" ||
        address.trim().length < 5 ||
        address.trim().length > 500
      ) {
        return res.status(400).json({
          message: "Please enter an address between 5 and 500 characters."
        });
      }

      const rate = seedData.mural?.ratePerSqFt;

      if (typeof rate !== "number" || !Number.isFinite(rate) || rate < 0) {
        return res.status(500).json({
          message: "The wall painting rate is not configured correctly."
        });
      }

      const booking = {
        customerId: ownerId(req.user.userId),
        date,
        wallSize: size,
        address: address.trim(),
        ratePerSqFt: rate,
        totalPrice: size * rate,
        status: "requested",
        createdAt: new Date()
      };

      const result = await getDB()
        .collection("wall_bookings")
        .insertOne(booking);

      res.status(201).json({
        message: "Wall painting booking request submitted successfully!",
        booking: { id: result.insertedId.toString(), ...booking }
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          message: "Sorry, this date is already booked. Please choose another date."
        });
      }

      console.error("Wall booking error:", error.message);
      res.status(500).json({ message: "Failed to submit booking." });
    }
  }
);

// ---------------- CUSTOMER'S WALL BOOKINGS ----------------

app.get(
  "/api/wall-bookings/mine",
  requireAuth,
  allowRoles("customer"),
  async (req, res) => {
    const bookings = await getDB()
      .collection("wall_bookings")
      .find({ customerId: ownerId(req.user.userId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(bookings);
  }
);

// ---------------- CANCEL WALL BOOKING ----------------

app.patch(
  "/api/wall-bookings/:id/cancel",
  requireAuth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!isValidId(id)) {
        return res.status(404).json({ message: "Booking not found." });
      }

      const bookings = getDB().collection("wall_bookings");
      const booking = await bookings.findOne({
        _id: new ObjectId(id),
        customerId: ownerId(req.user.userId)
      });

      if (!booking) {
        return res.status(404).json({ message: "Booking not found." });
      }

      if (!["requested", "accepted"].includes(booking.status)) {
        return res.status(400).json({
          message: "This booking cannot be cancelled."
        });
      }

      if (daysFromToday(booking.date) < 3) {
        return res.status(400).json({
          message: "Bookings can only be cancelled at least 3 days in advance."
        });
      }

      await bookings.updateOne(
        { _id: booking._id },
        { $set: { status: "cancelled", cancelledAt: new Date() } }
      );

      res.json({ message: "Wall booking cancelled successfully." });
    } catch (error) {
      res.status(500).json({ message: "Unable to cancel booking." });
    }
  }
);

// ---------------- STUDIO: VIEW WALL BOOKINGS ----------------

app.get(
  "/api/studio/wall-bookings",
  requireAuth,
  allowRoles("studio"),
  async (req, res) => {
    const bookings = await getDB()
      .collection("wall_bookings")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.json(bookings);
  }
);

// ---------------- STUDIO: ACCEPT OR DECLINE WALL BOOKING ----------------

app.patch(
  "/api/studio/wall-bookings/:id/status",
  requireAuth,
  allowRoles("studio"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!isValidId(id)) {
        return res.status(404).json({ message: "Booking not found." });
      }

      if (!["accepted", "declined"].includes(status)) {
        return res.status(400).json({
          message: "Status must be accepted or declined."
        });
      }

      const result = await getDB().collection("wall_bookings").updateOne(
        { _id: new ObjectId(id), status: "requested" },
        { $set: { status, reviewedAt: new Date() } }
      );

      if (!result.matchedCount) {
        return res.status(404).json({
          message: "Pending booking not found."
        });
      }

      res.json({ message: `Wall booking ${status}.` });
    } catch (error) {
      res.status(500).json({ message: "Unable to update booking." });
    }
  }
);

// ---------------- POTTERY OPTIONS ----------------

app.get("/api/pottery-options", (req, res) => {
  res.json({
    potteryItems: seedData.potteryItems || [],
    glazes: seedData.glazes || []
  });
});

// ---------------- CREATE POTTERY ORDER ----------------

app.post(
  "/api/pottery-orders",
  requireAuth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const { itemId, glazeId, quantity, neededBy } = req.body;

      if (!itemId || !glazeId || quantity === undefined || !neededBy) {
        return res.status(400).json({
          message: "Please complete all pottery order fields."
        });
      }

      const item = seedData.potteryItems?.find(
        entry => entry.id === itemId
      );

      const glaze = seedData.glazes?.find(
        entry => entry.id === glazeId
      );

      if (!item || !glaze) {
        return res.status(400).json({
          message: "Please select a valid pottery item and glaze."
        });
      }

      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 12) {
        return res.status(400).json({
          message: "Quantity must be a whole number between 1 and 12."
        });
      }

      if (!validDate(neededBy) || daysFromToday(neededBy) < 14) {
        return res.status(400).json({
          message: "Choose a valid needed-by date at least 14 days from today."
        });
      }

      const order = {
        customerId: ownerId(req.user.userId),
        itemId: item.id,
        itemName: item.name,
        glazeId: glaze.id,
        glazeName: glaze.name,
        quantity,
        neededBy,
        status: "requested",
        createdAt: new Date()
      };

      const result = await getDB()
        .collection("pottery_orders")
        .insertOne(order);

      res.status(201).json({
        message: "Pottery order request submitted successfully!",
        order: { id: result.insertedId.toString(), ...order }
      });
    } catch (error) {
      console.error("Pottery order error:", error.message);
      res.status(500).json({ message: "Failed to submit pottery order." });
    }
  }
);

// ---------------- CUSTOMER'S POTTERY ORDERS ----------------

app.get(
  "/api/pottery-orders/mine",
  requireAuth,
  allowRoles("customer"),
  async (req, res) => {
    const orders = await getDB()
      .collection("pottery_orders")
      .find({ customerId: ownerId(req.user.userId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(orders);
  }
);

// ---------------- EDIT PENDING POTTERY ORDER ----------------

app.patch(
  "/api/pottery-orders/:id",
  requireAuth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!isValidId(id)) {
        return res.status(404).json({ message: "Pottery order not found." });
      }

      const orders = getDB().collection("pottery_orders");
      const order = await orders.findOne({
        _id: new ObjectId(id),
        customerId: ownerId(req.user.userId)
      });

      if (!order) {
        return res.status(404).json({ message: "Pottery order not found." });
      }

      if (order.status !== "requested") {
        return res.status(400).json({
          message: "Only requested pottery orders can be edited."
        });
      }

      const { itemId, glazeId, quantity, neededBy } = req.body;

      const item = seedData.potteryItems?.find(
        entry => entry.id === itemId
      );
      const glaze = seedData.glazes?.find(
        entry => entry.id === glazeId
      );

      if (
        !item ||
        !glaze ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 12 ||
        !validDate(neededBy) ||
        daysFromToday(neededBy) < 14
      ) {
        return res.status(400).json({
          message: "Provide valid pottery options, quantity, and date."
        });
      }

      await orders.updateOne(
        { _id: order._id, status: "requested" },
        {
          $set: {
            itemId: item.id,
            itemName: item.name,
            glazeId: glaze.id,
            glazeName: glaze.name,
            quantity,
            neededBy,
            updatedAt: new Date()
          }
        }
      );

      res.json({ message: "Pottery order updated successfully." });
    } catch (error) {
      res.status(500).json({ message: "Unable to update pottery order." });
    }
  }
);

// ---------------- CANCEL POTTERY ORDER ----------------

app.patch(
  "/api/pottery-orders/:id/cancel",
  requireAuth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!isValidId(id)) {
        return res.status(404).json({ message: "Pottery order not found." });
      }

      const result = await getDB().collection("pottery_orders").updateOne(
        {
          _id: new ObjectId(id),
          customerId: ownerId(req.user.userId),
          status: "requested"
        },
        { $set: { status: "cancelled", cancelledAt: new Date() } }
      );

      if (!result.matchedCount) {
        return res.status(404).json({
          message: "Pending pottery order not found."
        });
      }

      res.json({ message: "Pottery order cancelled successfully." });
    } catch (error) {
      res.status(500).json({ message: "Unable to cancel pottery order." });
    }
  }
);

// ---------------- STUDIO: VIEW POTTERY ORDERS ----------------

app.get(
  "/api/studio/pottery-orders",
  requireAuth,
  allowRoles("studio"),
  async (req, res) => {
    const orders = await getDB()
      .collection("pottery_orders")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.json(orders);
  }
);

// ---------------- STUDIO: ACCEPT OR DECLINE POTTERY ORDER ----------------

app.patch(
  "/api/studio/pottery-orders/:id/status",
  requireAuth,
  allowRoles("studio"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!isValidId(id)) {
        return res.status(404).json({ message: "Pottery order not found." });
      }

      if (!["accepted", "declined"].includes(status)) {
        return res.status(400).json({
          message: "Status must be accepted or declined."
        });
      }

      const result = await getDB().collection("pottery_orders").updateOne(
        { _id: new ObjectId(id), status: "requested" },
        { $set: { status, reviewedAt: new Date() } }
      );

      if (!result.matchedCount) {
        return res.status(404).json({
          message: "Pending pottery order not found."
        });
      }

      res.json({ message: `Pottery order ${status}.` });
    } catch (error) {
      res.status(500).json({ message: "Unable to update pottery order." });
    }
  }
);

// ---------------- START SERVER ----------------

async function startServer() {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error("Set a strong JWT_SECRET in your .env file.");
    }

    await connectDB();

    app.locals.db = require("mongoose").connection.db;

    // Email addresses must be unique, ignoring capitalization.
    await app.locals.db.collection("users").createIndex(
      { email: 1 },
      { unique: true }
    );

    // Keep the existing unique wall-booking date index for now.
    // We will handle rebooking cancelled dates in the next database step.
    await app.locals.db.collection("wall_bookings").createIndex(
      { date: 1 },
      { unique: true }
    );

    const port = process.env.PORT || 5000;

    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
