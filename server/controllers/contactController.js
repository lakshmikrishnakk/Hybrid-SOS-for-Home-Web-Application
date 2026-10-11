const Contact = require("../models/Contact");

// @desc    Get all emergency contacts for logged-in user
// @route   GET /api/contacts
// @access  Private
const getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: contacts.length,
      contacts,
    });
  } catch (error) {
    console.error("Get contacts error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error fetching emergency contacts.",
    });
  }
};

// @desc    Add a new emergency contact
// @route   POST /api/contacts
// @access  Private
const addContact = async (req, res) => {
  try {
    const { name, relationship, phone } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Please provide both contact name and phone number.",
      });
    }

    const contact = await Contact.create({
      userId: req.user._id,
      name: name.trim(),
      relationship: relationship ? relationship.trim() : "Emergency Contact",
      phone: phone.trim(),
      status: "Ready",
    });

    return res.status(201).json({
      success: true,
      message: "Emergency contact added successfully.",
      contact,
    });
  } catch (error) {
    console.error("Add contact error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error creating emergency contact.",
    });
  }
};

// @desc    Delete an emergency contact
// @route   DELETE /api/contacts/:id
// @access  Private
const deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Emergency contact not found.",
      });
    }

    // Ensure the contact belongs to the logged-in user
    if (contact.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this contact.",
      });
    }

    await Contact.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Emergency contact deleted successfully.",
      id: req.params.id,
    });
  } catch (error) {
    console.error("Delete contact error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error deleting emergency contact.",
    });
  }
};

module.exports = {
  getContacts,
  addContact,
  deleteContact,
};
