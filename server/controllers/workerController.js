const SocialWorker = require("../models/SocialWorker");

// Demo Social Workers suitable for college project demonstration
const DEMO_WORKERS = [
  {
    name: "Sarah Jenkins, LCSW",
    badgeNumber: "SW-4821",
    agency: "Metropolitan Crisis & Emergency Social Care",
    phone: "+1 (555) 789-0123",
    status: "Available",
    currentEta: "7 mins",
  },
  {
    name: "Marcus Vance, MSW",
    badgeNumber: "SW-3290",
    agency: "Community Emergency Response & Social Care",
    phone: "+1 (555) 890-1234",
    status: "Available",
    currentEta: "10 mins",
  },
  {
    name: "Elena Rostova, LCSW",
    badgeNumber: "SW-5104",
    agency: "Rapid Family & Trauma Crisis Dispatch",
    phone: "+1 (555) 901-2345",
    status: "Available",
    currentEta: "12 mins",
  },
];

// @desc    Get all registered social workers
// @route   GET /api/workers
// @access  Public
const getSocialWorkers = async (req, res) => {
  try {
    let workers = await SocialWorker.find().sort({ createdAt: 1 });

    // Auto-seed demo workers if collection is empty
    if (workers.length === 0) {
      await SocialWorker.insertMany(DEMO_WORKERS);
      workers = await SocialWorker.find().sort({ createdAt: 1 });
    }

    return res.status(200).json({
      success: true,
      count: workers.length,
      workers,
    });
  } catch (error) {
    console.error("Get social workers error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error fetching social workers.",
    });
  }
};

// @desc    Seed default demo social workers
// @route   POST /api/workers/seed
// @access  Public
const seedSocialWorkers = async (req, res) => {
  try {
    const results = [];

    for (const workerData of DEMO_WORKERS) {
      const existing = await SocialWorker.findOne({
        badgeNumber: workerData.badgeNumber,
      });

      if (!existing) {
        const created = await SocialWorker.create(workerData);
        results.push(created);
      } else {
        results.push(existing);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Social workers verified and seeded successfully.",
      count: results.length,
      workers: results,
    });
  } catch (error) {
    console.error("Seed social workers error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error seeding social workers.",
    });
  }
};

module.exports = {
  getSocialWorkers,
  seedSocialWorkers,
};
