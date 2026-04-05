const router = require("express").Router();
const { getTasks, createTask } = require("../controllers/taskController");
const { protect, adminOnly } = require("../middleware/authMiddleware");


router.get("/", protect, getTasks);
router.post("/", protect, adminOnly, createTask);

module.exports = router;
