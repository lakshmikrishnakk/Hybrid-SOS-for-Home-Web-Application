const express = require("express");
const router = express.Router();
const {
  getSocialWorkers,
  seedSocialWorkers,
  registerSocialWorker,
  deleteSocialWorker,
} = require("../controllers/workerController");
const { protect } = require("../middleware/authMiddleware");

// Public routes for viewing and seeding social workers
router.get("/", getSocialWorkers);
router.post("/seed", seedSocialWorkers);

// Protected routes for managing demo social workers
router.post("/", protect, registerSocialWorker);
router.delete("/:id", protect, deleteSocialWorker);

module.exports = router;
