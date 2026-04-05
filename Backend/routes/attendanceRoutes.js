const router = require("express").Router();
const { checkIn, checkOut, sync, getAllAttendance, getTodayAttendance } = require("../controllers/attendanceController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.post("/checkin",  protect, checkIn);
router.post("/checkout", protect, checkOut);
router.post("/sync",     protect, sync);
router.get("/today",     protect, getTodayAttendance);         // Worker: own today record
router.get("/all",       protect, adminOnly, getAllAttendance); // Admin only

module.exports = router;
