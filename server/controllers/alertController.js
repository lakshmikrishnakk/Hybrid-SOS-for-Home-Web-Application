const mongoose = require("mongoose");
const EmergencyAlert = require("../models/EmergencyAlert");
const SocialWorker = require("../models/SocialWorker");
const Contact = require("../models/Contact");

// Fallback demo worker definition if database has none
const FALLBACK_WORKER = {
  name: "Sarah Jenkins, LCSW",
  badgeNumber: "SW-4821",
  agency: "Metropolitan Crisis & Emergency Social Care",
  phone: "+1 (555) 789-0123",
  status: "Available",
  currentEta: "7 mins",
};

/**
 * Generate a unique alert ID like SOS-123456
 */
const generateUniqueAlertId = async () => {
  let unique = false;
  let alertId = "";

  while (!unique) {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    alertId = `SOS-${randomDigits}`;
    const existing = await EmergencyAlert.findOne({ alertId });
    if (!existing) {
      unique = true;
    }
  }

  return alertId;
};

// @desc    Trigger a new SOS Emergency Alert
// @route   POST /api/alerts/trigger
// @access  Private (JWT Protected)
const triggerSOS = async (req, res) => {
  try {
    const { latitude, longitude, accuracy, address, notes } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude coordinates are required to trigger an SOS alert.",
      });
    }

    // 1. Generate unique SOS alert ID
    const alertId = await generateUniqueAlertId();

    // 2. Fetch logged-in user's registered emergency contacts
    const userContacts = await Contact.find({ userId: req.user._id });

    const notifiedContacts = userContacts.map((contact) => ({
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone,
      notifiedAt: new Date(),
    }));

    // Update contacts status to 'Notified' for simulation
    if (userContacts.length > 0) {
      await Contact.updateMany(
        { userId: req.user._id },
        { status: "Notified" }
      );
    }

    // 3. Find and assign an available social worker
    let assignedWorkerData = null;
    let worker = await SocialWorker.findOne({ status: "Available" });

    // If none are available, try any worker or auto-create fallback
    if (!worker) {
      worker = await SocialWorker.findOne();
      if (!worker) {
        worker = await SocialWorker.create(FALLBACK_WORKER);
      }
    }

    if (worker) {
      // Mark worker as En Route
      worker.status = "En Route";
      await worker.save();

      assignedWorkerData = {
        workerId: worker._id,
        name: worker.name,
        badgeNumber: worker.badgeNumber,
        phone: worker.phone,
        eta: worker.currentEta || "8 mins",
      };
    }

    // 4. Create Emergency Alert in MongoDB
    const alert = await EmergencyAlert.create({
      alertId,
      userId: req.user._id,
      userName: req.user.fullName || "Citizen in Distress",
      userEmail: req.user.email,
      userPhone: req.user.phoneNumber || "",
      location: {
        latitude: Number(latitude),
        longitude: Number(longitude),
        accuracy: accuracy !== undefined ? Number(accuracy) : 15,
        address: address || "Active GPS Coordinates",
      },
      status: "ACTIVE_DISPATCH",
      assignedWorker: assignedWorkerData,
      notifiedContacts,
      notes:
        notes ||
        "Urgent beacon triggered by user. High-priority dispatch active.",
    });

    return res.status(201).json({
      success: true,
      message: "SOS Emergency Alert dispatched successfully.",
      alert,
    });
  } catch (error) {
    console.error("Trigger SOS error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error triggering SOS emergency alert.",
    });
  }
};

// @desc    Get emergency alert history for logged-in user
// @route   GET /api/alerts/history
// @access  Private (JWT Protected)
const getAlertHistory = async (req, res) => {
  try {
    const alerts = await EmergencyAlert.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: alerts.length,
      alerts,
    });
  } catch (error) {
    console.error("Get alert history error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error fetching alert history.",
    });
  }
};

// @desc    Resolve an active SOS emergency alert
// @route   PUT /api/alerts/:id/resolve
// @access  Private (JWT Protected)
const resolveSOS = async (req, res) => {
  try {
    const { id } = req.params;

    // Support lookup by either MongoDB _id or custom alertId (e.g. SOS-123456)
    let query;
    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { _id: id };
    } else {
      query = { alertId: id };
    }

    const alert = await EmergencyAlert.findOne(query);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Emergency alert not found.",
      });
    }

    // Verify ownership: user must own this alert
    if (alert.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to resolve this emergency alert.",
      });
    }

    if (alert.status === "RESOLVED") {
      return res.status(200).json({
        success: true,
        message: "Emergency alert is already resolved.",
        alert,
      });
    }

    // Update alert status
    alert.status = "RESOLVED";
    alert.resolvedAt = new Date();
    if (req.body.notes) {
      alert.notes = `${alert.notes ? alert.notes + " | " : ""}Resolution: ${req.body.notes}`;
    }
    await alert.save();

    // Release assigned social worker back to 'Available'
    if (alert.assignedWorker && alert.assignedWorker.workerId) {
      await SocialWorker.findByIdAndUpdate(alert.assignedWorker.workerId, {
        status: "Available",
      });
    }

    // Reset user contacts status back to 'Ready'
    await Contact.updateMany(
      { userId: req.user._id },
      { status: "Ready" }
    );

    return res.status(200).json({
      success: true,
      message: "Emergency alert resolved successfully.",
      alert,
    });
  } catch (error) {
    console.error("Resolve SOS error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error resolving SOS emergency alert.",
    });
  }
};

module.exports = {
  triggerSOS,
  getAlertHistory,
  resolveSOS,
};
