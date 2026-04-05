const router = require("express").Router();
const { getUserInsights, getAllInsights } = require("../controllers/insightsController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/user", protect,            getUserInsights);  // Worker: own insights
router.get("/all",  protect, adminOnly, getAllInsights);   // Admin: all users

module.exports = router;
