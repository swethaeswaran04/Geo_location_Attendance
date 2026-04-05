const Attendance = require("../models/Attendance");
const SyncLog = require("../models/SyncLog");
const Location = require("../models/Location");
const haversineDistance = require("../utils/haversine");
const validateAssignment = require("../utils/validateAssignment");

const checkIn = async (req, res) => {
  try {
    const { latitude, longitude, taskId } = req.body;

    if (latitude == null || longitude == null) {
      return res.status(400).json({ message: "latitude and longitude are required" });
    }

    // Validate assignment: existence, time window, and location radius
    const result = await validateAssignment(req.user._id, latitude, longitude);
    if (!result.valid) {
      return res.status(result.status).json({ message: result.message });
    }

    const { assignment, minutesLate, isLate } = result;

    // Guard against duplicate active check-in
    const existing = await Attendance.findOne({ userId: req.user._id, checkOutTime: null });
    if (existing) return res.status(400).json({ message: "Already checked in" });

    // Mark as late only if delay exceeds 30 minutes past startTime
    const attendanceStatus = isLate ? "late" : "present";

    const attendance = await Attendance.create({
      userId:       req.user._id,
      latitude,
      longitude,
      locationId:   assignment.locationId._id,
      assignmentId: assignment._id,
      taskId,
      checkInTime:  new Date(),
      status:       attendanceStatus,
      syncStatus:   true,
    });

    // Mark assignment as completed
    assignment.status = "completed";
    await assignment.save();

    const lateMessage = isLate
      ? ` You are ${minutesLate} minute${minutesLate > 1 ? "s" : ""} late (threshold: 30 min).`
      : minutesLate > 0
        ? ` You checked in ${minutesLate} minute${minutesLate > 1 ? "s" : ""} after start time (within grace period).`
        : "";

    res.status(201).json({
      message: `Check-in successful.${lateMessage}`,
      attendance,
      minutesLate,
      isLate,
    });
  } catch (err) {
    res.status(500).json({ message: "Check-in failed", error: err.message });
  }
};

const checkOut = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Find today's check-in record regardless of checkOutTime
    const attendance = await Attendance.findOne({
      userId: req.user._id,
      checkInTime: { $gte: todayStart },
    });

    if (!attendance) {
      return res.status(404).json({ message: "No check-in found for today" });
    }

    if (attendance.checkOutTime) {
      return res.status(400).json({ message: "Already checked out for today" });
    }

    attendance.checkOutTime = new Date();
    await attendance.save();

    res.json({ message: "Check-out successful", attendance });
  } catch (err) {
    res.status(500).json({ message: "Check-out failed", error: err.message });
  }
};

const sync = async (req, res) => {
  try {
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: "records must be a non-empty array" });
    }

    let syncedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (const record of records) {
      const { latitude, longitude, checkInTime, checkOutTime, locationId, taskId } = record;

      if (latitude == null || longitude == null || !checkInTime) {
        errors.push({ record, reason: "latitude, longitude and checkInTime are required" });
        continue;
      }

      const parsedCheckInTime = new Date(checkInTime);
      if (isNaN(parsedCheckInTime)) {
        errors.push({ record, reason: "invalid checkInTime format" });
        continue;
      }

      // Check for duplicate based on userId + checkInTime
      const duplicate = await Attendance.findOne({
        userId: req.user._id,
        checkInTime: parsedCheckInTime,
      });

      if (duplicate) {
        skippedCount++;
        continue;
      }

      await Attendance.create({
        userId: req.user._id,
        latitude,
        longitude,
        checkInTime: parsedCheckInTime,
        checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined,
        locationId,
        taskId,
        syncStatus: true,
      });

      syncedCount++;
    }

    await SyncLog.create({
      userId: req.user._id,
      syncTime: new Date(),
      status: syncedCount > 0 ? "success" : "failed",
    });

    res.json({
      message: "Sync complete",
      total: records.length,
      synced: syncedCount,
      skipped: skippedCount,
      failed: errors.length,
      errors,
    });
  } catch (err) {
    res.status(500).json({ message: "Sync failed", error: err.message });
  }
};

// Admin: get all attendance records across all users
const getAllAttendance = async (req, res) => {
  try {
    const { date, userId } = req.query;
    const filter = {};
    if (userId) filter.userId = userId;
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.checkInTime = { $gte: start, $lte: end };
    }
    const records = await Attendance.find(filter)
      .populate("userId", "name email role")
      .populate("locationId", "name")
      .sort({ checkInTime: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch attendance", error: err.message });
  }
};

// Worker: get own today's attendance record
const getTodayAttendance = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const record = await Attendance.findOne({
      userId: req.user._id,
      checkInTime: { $gte: todayStart },
    });
    res.json({ record: record ?? null });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch today's attendance", error: err.message });
  }
};

module.exports = { checkIn, checkOut, sync, getAllAttendance, getTodayAttendance };
