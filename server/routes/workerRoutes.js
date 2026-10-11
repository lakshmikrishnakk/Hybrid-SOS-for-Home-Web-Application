const express = require("express");
const router = express.Router();
const {
  getSocialWorkers,
  seedSocialWorkers,
} = require("../controllers/workerController");

// Public routes for viewing and seeding social workers
router.get("/", getSocialWorkers);
router.post("/seed", seedSocialWorkers);

module.exports = router;
