const Assignment = require("../models/Assignment");
const User = require("../models/User");
const Location = require("../models/Location");

// Admin: create a new assignment
const createAssignment = async (req, res) => {
  try {
    const { userId, locationId, date, startTime, endTime, note } = req.body;

    if (!userId || !locationId || !date || !startTime || !endTime) {
      return res.status(400).json({ message: "userId, locationId, date, startTime and endTime are required" });
    }

    const worker = await User.findById(userId).select("name email role");
    if (!worker) return res.status(404).json({ message: "Worker not found" });
    if (worker.role !== "worker") return res.status(400).json({ message: "Assignments can only be created for workers" });

    const location = await Location.findById(locationId).select("name");
    if (!location) return res.status(404).json({ message: "Location not found" });

    const assignment = await Assignment.create({
      userId, locationId, date: new Date(date), startTime, endTime, note,
    });

    await assignment.populate([
      { path: "userId",     select: "name email" },
      { path: "locationId", select: "name latitude longitude" },
    ]);

    res.status(201).json({ message: "Assignment created successfully", assignment });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Assignment already exists for this worker at this location on this date" });
    }
    res.status(500).json({ message: "Failed to create assignment", error: err.message });
  }
};

// Admin: get all assignments with optional filters
const getAllAssignments = async (req, res) => {
  try {
    const { date, userId, status } = req.query;
    const filter = {};
    if (userId) filter.userId = userId;
    if (status) filter.status = status;
    if (date) {
      const start = new Date(date); start.setHours(0, 0, 0, 0);
      const end   = new Date(date); end.setHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }

    const assignments = await Assignment.find(filter)
      .populate("userId",     "name email phone")
      .populate("locationId", "name latitude longitude radius")
      .sort({ date: 1, startTime: 1 });

    res.json(assignments);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch assignments", error: err.message });
  }
};

// Worker: get own assignments
const getUserAssignments = async (req, res) => {
  try {
    const { status, upcoming } = req.query;
    const filter = { userId: req.user._id };
    if (status) filter.status = status;
    if (upcoming === "true") filter.date = { $gte: new Date() };

    const assignments = await Assignment.find(filter)
      .populate("locationId", "name latitude longitude radius")
      .sort({ date: 1, startTime: 1 });

    res.json(assignments);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch assignments", error: err.message });
  }
};

// Admin: update assignment status
const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const assignment = await Assignment.findByIdAndUpdate(
      id,
      { ...(status && { status }), ...(note && { note }) },
      { new: true }
    ).populate("userId", "name email").populate("locationId", "name");

    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    res.json({ message: "Assignment updated", assignment });
  } catch (err) {
    res.status(500).json({ message: "Failed to update assignment", error: err.message });
  }
};

module.exports = { createAssignment, getAllAssignments, getUserAssignments, updateAssignment };
