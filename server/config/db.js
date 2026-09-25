const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      console.warn("⚠️ Warning: MONGODB_URI is not defined in server/.env");
      return;
    }

    const conn = await mongoose.connect(mongoUri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error("👉 Please ensure MongoDB is running locally (e.g., mongod) or provide a valid MongoDB Atlas connection string in server/.env");
  }
};

module.exports = connectDB;
