const User = require("../models/User");

// GET /api/users — list all users with optional filters
const getUsers = async (req, res) => {
  try {
    const { role, status, search } = req.query;
    const filter = {};

    if (role)   filter.role   = role;
    if (status) filter.status = status;
    if (search) filter.$or = [
      { name:  { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];

    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({ total: users.length, users });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users", error: err.message });
  }
};

// GET /api/users/:id — get single user
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user", error: err.message });
  }
};

// PATCH /api/users/:id — update name, email, phone, role, status
const updateUser = async (req, res) => {
  try {
    const { name, email, phone, role, status } = req.body;

    // Prevent admin from deactivating their own account
    if (req.params.id === req.user._id.toString() && status === "inactive") {
      return res.status(400).json({ message: "You cannot deactivate your own account" });
    }

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { ...(name   && { name }),
        ...(email  && { email }),
        ...(phone  && { phone }),
        ...(role   && { role }),
        ...(status && { status }),
      },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updated) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User updated successfully", user: updated });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Email already in use" });
    }
    res.status(500).json({ message: "Failed to update user", error: err.message });
  }
};

// DELETE /api/users/:id — hard delete
const deleteUser = async (req, res) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: `User "${user.name}" deleted successfully` });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete user", error: err.message });
  }
};

module.exports = { getUsers, getUserById, updateUser, deleteUser };
