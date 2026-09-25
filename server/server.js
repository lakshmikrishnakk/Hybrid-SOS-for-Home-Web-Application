require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");

// Initialize Express
const app = express();

// Connect to MongoDB Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Basic Root / Health-Check Route
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    app: "Hybrid SOS Emergency Backend API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);

// Port & Server Startup
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Hybrid SOS Server listening on port ${PORT}`);
  console.log(`📡 Health-check endpoint: http://localhost:${PORT}/`);
});

module.exports = app;
