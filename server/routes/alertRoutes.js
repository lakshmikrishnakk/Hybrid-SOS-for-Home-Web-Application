const express = require("express");
const router = express.Router();
const {
  triggerSOS,
  getAlertHistory,
  resolveSOS,
} = require("../controllers/alertController");
const { protect } = require("../middleware/authMiddleware");

// All alert routes require authentication
router.use(protect);

// SOS Alert lifecycle routes
router.post("/trigger", triggerSOS);
router.get("/history", getAlertHistory);
router.put("/:id/resolve", resolveSOS);

module.exports = router;
