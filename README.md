# ArtStudio — Art Gallery and Booking Website

## 1. Project Overview

ArtStudio is a web application designed to showcase paintings and allow customers to submit requests for wall painting services and custom pottery. It also includes a studio interface for managing paintings and customer requests.

The project uses HTML, CSS, and JavaScript for the frontend, Node.js and Express for the backend, and MongoDB for data storage.

## 2. Objectives

- Display paintings in an organized gallery.
- Allow users to register and log in.
- Provide search, filtering, and sorting options for paintings.
- Allow customers to submit wall painting booking requests.
- Allow customers to submit custom pottery requests.
- Provide studio functionality for managing paintings and customer requests.
- Store application data in MongoDB.

## 3. Technologies Used

| Technology | Purpose |
|---|---|
| HTML | Website structure |
| CSS | Website styling and layout |
| JavaScript | Frontend interactions and API requests |
| Node.js | JavaScript runtime for the backend |
| Express.js | Backend server and API routes |
| MongoDB | Database for application data |
| Mongoose | MongoDB connection and database integration |
| dotenv | Loading environment variables |

Authentication-related packages are also used where included in the project's `package.json`.

## 4. Main Features

### Painting Gallery
- Displays paintings stored in the database.
- Shows painting information and images.
- Supports searching, filtering, and sorting.
- Provides a way for eligible customers to initiate a purchase of available paintings, subject to the implemented backend workflow.

### User Authentication
- Supports customer and studio accounts.
- Uses role-based access checks for restricted operations.
- Keeps configuration secrets outside the source code using environment variables.

### Wall Painting Bookings
- Provides a form for submitting wall painting booking requests.
- Calculates an estimated price based on the wall size and the configured rate.

### Custom Pottery
- Provides pottery options for customers.
- Allows customers to submit custom pottery requests.

### Studio Management
- Includes backend functionality for studio-related operations.
- Supports adding paintings and managing booking or pottery requests where the corresponding workflows are implemented and enabled.

## 5. Project Structure

The main project files are organized as follows:

```text
ArtStudio/
├── public/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── images/
│       ├── p-001.jpg
│       ├── p-002.jpg
│       └── ...
├── seed-data/
│   └── seedData/
│       ├── seed.json
│       └── images/
├── database.js
├── server.js
├── seed.js
├── .env
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
└── DESIGN.md
```

The exact contents of `seed-data/` and other folders may vary depending on the files included in the project.

## 6. Prerequisites

Install the following before running the project:

- Node.js and npm
- MongoDB Community Server, or another accessible MongoDB deployment
- Visual Studio Code or another code editor

## 7. Installation and Setup

### Step 1: Get the project

Clone the public GitHub repository:

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd ArtStudio
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with the actual repository URL.

Alternatively, download the repository and open its project folder in a terminal.

### Step 2: Install dependencies

Run:

```bash
npm install
```

### Step 3: Configure environment variables

Create a `.env` file in the project root. Use `.env.example` as a template.

Example:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/artstudio
JWT_SECRET=replace_with_a_long_random_secret
PORT=5000
```

Use your own secret value. Do not commit `.env` or expose its contents publicly.

### Step 4: Start MongoDB

Ensure that your MongoDB service is running and that the database connection string is correct.

### Step 5: Prepare the database

If the project is being installed for the first time and the database needs sample data, review `seed.js` before running it.

If the seed script is designed to clear and recreate collections, running it against an existing database may delete existing records. Back up important data first.

Run the seed script only when appropriate:

```bash
node seed.js
```

### Step 6: Start the application

Run:

```bash
node server.js
```

The server should report a successful database connection and start listening on the configured port.

### Step 7: Open the website

Open the following address in your browser:

```text
http://localhost:5000
```

If the server uses a different port, open the corresponding address.

## 8. Database

The application uses MongoDB to store and retrieve its data.

The seeded dataset includes information for the following collections:

- `paintings` — painting details and availability.
- `potteryitems` — pottery options.
- `glazes` — available glaze options.
- `settings` — application settings, including the mural pricing configuration.
- `users` — user accounts and roles.

Additional collections may be created by booking, purchase, or order-related workflows.

## 9. API and Backend

The Express backend serves the website and provides API routes for application functionality.

The project includes routes for health checking, retrieving paintings, mural pricing, pottery options, authentication, and other operations implemented in `server.js`.

For the exact routes, request methods, required fields, and authentication requirements, refer to the current implementation in `server.js`.

## 10. Security Considerations

- Keep `.env` out of the public repository.
- Use `.env.example` to document required configuration variables without exposing secret values.
- Protect restricted backend operations with appropriate authentication and role checks.
- Validate user input on the server.
- Use a strong, unique secret for token signing.
- Do not publish real credentials or private user information.

## 11. Current Scope and Future Improvements

Potential improvements include:

- More complete testing of painting purchases and order records.
- Testing booking and pottery request workflows from submission through studio approval.
- Improving error handling and validation.
- Strengthening protection against duplicate bookings and simultaneous purchase requests.
- Adding order history and other customer account features if required.
- Deploying the application to a public hosting environment.

## 12. Conclusion

ArtStudio brings painting discovery, wall painting bookings, and custom pottery requests together in one web application. It combines a browser-based interface with an Express backend and MongoDB storage, providing a foundation for an online art studio.