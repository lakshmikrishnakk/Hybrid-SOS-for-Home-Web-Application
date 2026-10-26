const mongoose = require("mongoose");
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

// @desc    Register a new clearly labelled Demo Social Worker
// @route   POST /api/workers
// @access  Private (JWT Protected)
const registerSocialWorker = async (req, res) => {
  try {
    const { name, phone, badgeNumber, agency, currentEta } = req.body;

    // Validate presence of required fields
    if (!name || !phone || !badgeNumber) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields: name, phone, and badgeNumber.",
      });
    }

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedBadge = badgeNumber.trim();
    const trimmedAgency =
      agency && agency.trim() ? agency.trim() : "Hybrid SOS Demo Responder Unit";

    if (!trimmedName || !trimmedPhone || !trimmedBadge) {
      return res.status(400).json({
        success: false,
        message: "Fields cannot be blank.",
      });
    }

    // Check for duplicate badge number (case-insensitive)
    const escapedBadge = trimmedBadge.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const existing = await SocialWorker.findOne({
      badgeNumber: { $regex: new RegExp(`^${escapedBadge}$`, "i") },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A social worker with badge number "${trimmedBadge}" already exists.`,
      });
    }

    // Create clearly labelled demo social worker (explicitly unverified / simulation only)
    const worker = await SocialWorker.create({
      name: trimmedName,
      badgeNumber: trimmedBadge,
      agency: trimmedAgency,
      phone: trimmedPhone,
      status: "Available",
      currentEta: currentEta && currentEta.trim() ? currentEta.trim() : "5 mins",
      isDemo: true,
      isVerified: false,
    });

    return res.status(201).json({
      success: true,
      message:
        "Demo social worker registered successfully (simulation responder only; not verified emergency personnel).",
      worker,
    });
  } catch (error) {
    console.error("Register social worker error:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A social worker with this badge number already exists.",
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Server error registering demo social worker.",
    });
  }
};

// @desc    Delete a demo social worker
// @route   DELETE /api/workers/:id
// @access  Private
const deleteSocialWorker = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid social worker ID format.",
      });
    }

    const worker = await SocialWorker.findById(id);

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Social worker not found.",
      });
    }

    // Safety check: Only allow deletion of unverified demo workers
    if (worker.isVerified || !worker.isDemo) {
      return res.status(403).json({
        success: false,
        message: "Deletion restricted: Only unverified demo social workers can be deleted.",
      });
    }

    await SocialWorker.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: `Demo social worker "${worker.name}" deleted successfully.`,
      id,
    });
  } catch (error) {
    console.error("Delete social worker error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error deleting demo social worker.",
    });
  }
};

module.exports = {
  getSocialWorkers,
  seedSocialWorkers,
  registerSocialWorker,
  deleteSocialWorker,
};

