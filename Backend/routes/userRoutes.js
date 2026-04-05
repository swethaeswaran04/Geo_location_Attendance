const router = require("express").Router();
const { getUsers, getUserById, updateUser, deleteUser } = require("../controllers/userController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/",      protect, adminOnly, getUsers);
router.get("/:id",   protect, adminOnly, getUserById);
router.patch("/:id", protect, adminOnly, updateUser);
router.delete("/:id",protect, adminOnly, deleteUser);

module.exports = router;
