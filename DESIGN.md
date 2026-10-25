# ArtStudio — Design Decisions

## 1. How does login work, and how are customer and studio permissions handled?

ArtStudio supports different roles for customers and studio users. The frontend collects login details and sends them to the backend for authentication.

After successful authentication, the application uses the user's role to determine which operations they are permitted to perform. Customer operations include accessing customer features, while studio operations include managing paintings and reviewing customer requests.

Authentication and role checks should be enforced by the backend rather than relying only on frontend visibility. This prevents users from accessing restricted operations simply by changing the page or sending a request manually.

## 2. Why was MongoDB chosen for the database?

MongoDB was selected because it stores data in flexible document structures that work well with JavaScript applications.

ArtStudio contains different types of data, including paintings, user accounts, pottery options, glazes, settings, bookings, and orders. MongoDB makes it possible to store these records as documents and retrieve them through backend API routes.

The Express backend connects the frontend to the database and handles application requests.

## 3. How are duplicate paintings, bookings, and purchases handled?

Painting records have an identifier that can be checked when adding new paintings. The backend should reject a new painting if its identifier already exists.

Wall bookings also need validation to prevent conflicting or duplicate reservations. This should be enforced by the backend and, where appropriate, by database constraints.

For painting purchases, the backend should check that a painting is still available before marking it as sold and recording the order. The availability check and update should be designed to handle simultaneous purchase requests safely.

These protections must be tested against the actual implementation. In particular, concurrent bookings, simultaneous purchase attempts, and recovery from failed order creation should be verified before claiming that every duplicate or race condition is prevented.

## 4. What has been implemented, what is out of scope, and what would be improved next?

### Implemented project components

- A website built with HTML, CSS, and JavaScript.
- An Express backend running on Node.js.
- A MongoDB connection and sample dataset.
- A painting gallery with search, filtering, and sorting functionality.
- Authentication-related functionality and customer/studio roles.
- Backend routes for retrieving paintings, mural pricing, and pottery options.
- Wall booking and custom pottery forms.
- Studio-related functionality for adding paintings and managing requests, where supported by the current code.

### Out of scope or requiring further verification

- Complete end-to-end verification of every purchase and order workflow.
- Complete end-to-end verification of booking and pottery request submission, approval, editing, and cancellation.
- Comprehensive testing of duplicate bookings and simultaneous purchases.
- Payment gateway integration.
- Email notifications and password recovery.
- Public production deployment.

### Future improvements

The next steps would be to test every workflow from the customer's perspective and the studio's perspective, improve validation and error handling, strengthen database-level protection against conflicting operations, and add further customer order-management features if required.

The application could also be deployed publicly after configuration, security, and end-to-end testing are completed.