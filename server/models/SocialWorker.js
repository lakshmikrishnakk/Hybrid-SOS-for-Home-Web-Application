const mongoose = require("mongoose");

const socialWorkerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Social worker name is required"],
      trim: true,
    },
    badgeNumber: {
      type: String,
      required: [true, "Badge number is required"],
      unique: true,
      trim: true,
    },
    agency: {
      type: String,
      default: "Metropolitan Crisis & Emergency Social Care",
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Contact phone number is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["Available", "En Route", "Off Duty"],
      default: "Available",
    },
    currentEta: {
      type: String,
      default: "7 mins",
    },
  },
  {
    timestamps: true,
  }
);

socialWorkerSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("SocialWorker", socialWorkerSchema);
