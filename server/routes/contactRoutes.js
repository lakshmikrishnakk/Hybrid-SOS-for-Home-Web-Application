const express = require("express");
const router = express.Router();
const {
  getContacts,
  addContact,
  deleteContact,
} = require("../controllers/contactController");
const { protect } = require("../middleware/authMiddleware");

// All contact routes are protected by JWT
router.use(protect);

router.route("/").get(getContacts).post(addContact);
router.route("/:id").delete(deleteContact);

module.exports = router;
