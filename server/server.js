const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const contactRoutes = require("./routes/contactRoutes");
const workerRoutes = require("./routes/workerRoutes");
const alertRoutes = require("./routes/alertRoutes");

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
app.use("/api/contacts", contactRoutes);
app.use("/api/workers", workerRoutes);
app.use("/api/alerts", alertRoutes);

// Port & Server Startup
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Hybrid SOS Server listening on port ${PORT}`);
  console.log(`📡 Health-check endpoint: http://localhost:${PORT}/`);
});

module.exports = app;
