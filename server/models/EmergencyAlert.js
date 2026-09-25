const mongoose = require("mongoose");

const emergencyAlertSchema = new mongoose.Schema(
  {
    alertId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userEmail: {
      type: String,
    },
    userPhone: {
      type: String,
    },
    location: {
      latitude: {
        type: Number,
        required: true,
      },
      longitude: {
        type: Number,
        required: true,
      },
      accuracy: {
        type: Number,
        default: 15,
      },
      address: {
        type: String,
        default: "Active GPS Coordinates",
      },
    },
    status: {
      type: String,
      enum: ["ACTIVE_DISPATCH", "RESOLVED"],
      default: "ACTIVE_DISPATCH",
      index: true,
    },
    assignedWorker: {
      workerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SocialWorker",
      },
      name: String,
      badgeNumber: String,
      phone: String,
      eta: String,
    },
    notifiedContacts: [
      {
        name: String,
        relationship: String,
        phone: String,
        notifiedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    notes: {
      type: String,
      default: "Urgent beacon triggered by user. High-priority dispatch active.",
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

emergencyAlertSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("EmergencyAlert", emergencyAlertSchema);
