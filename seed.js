
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config();

async function seedDatabase() {
  try {
    // Read the existing seed data
    const seedPath = path.join(
      __dirname,
      "seed-data",
      "seedData",
      "seed.json"
    );

    const seedData = JSON.parse(fs.readFileSync(seedPath, "utf8"));

    // Connect only to the ArtStudio database
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    console.log("Connected to ArtStudio database.");

    // Prepare the studio account with a hashed password
    const studio = {
      ...seedData.studioAccount,
      password: await bcrypt.hash(
        seedData.studioAccount.password,
        10
      ),
    };

    // Store the seed data in separate collections.
    // Replace only the documents in these ArtStudio collections.
    const collections = {
      paintings: seedData.paintings,
      potteryitems: seedData.potteryItems,
      glazes: seedData.glazes,
      settings: [
        {
          currency: seedData.currency,
          mural: seedData.mural,
        },
      ],
      users: [studio],
    };

    for (const [collectionName, documents] of Object.entries(collections)) {
      await db.collection(collectionName).deleteMany({});
      await db.collection(collectionName).insertMany(documents);

      console.log(
        `Imported ${documents.length} records into "${collectionName}".`
      );
    }

    console.log("\nSeed data imported successfully! 🎨");
  } catch (error) {
    console.error("Seed import failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

seedDatabase();
