const router = require("express").Router();
const {
  createAssignment,
  getAllAssignments,
  getUserAssignments,
  updateAssignment,
} = require("../controllers/assignmentController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.post("/",           protect, adminOnly, createAssignment);   // Admin: create
router.get("/",            protect, adminOnly, getAllAssignments);   // Admin: get all
router.get("/user",        protect,            getUserAssignments);  // Worker: get own
router.patch("/:id",       protect, adminOnly, updateAssignment);   // Admin: update status

module.exports = router;
