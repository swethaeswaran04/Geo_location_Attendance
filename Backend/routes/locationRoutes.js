const router = require("express").Router();
const { getLocations, createLocation } = require("../controllers/locationController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/", protect, getLocations);
router.post("/", protect, adminOnly, createLocation);

module.exports = router;
