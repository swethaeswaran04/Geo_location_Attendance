const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const Assignment = require("../models/Assignment");

/**
 * Computes workflow insights for a given userId (or all users if null).
 * Accepts optional date range: { from, to } as ISO strings.
 */
const computeInsights = async (userId = null, { from, to } = {}) => {
  const dateFilter = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to)   dateFilter.$lte = new Date(to);

  const attendanceMatch = { ...(userId && { userId: new mongoose.Types.ObjectId(userId) }), ...(Object.keys(dateFilter).length && { checkInTime: dateFilter }) };
  const assignmentMatch = { ...(userId && { userId: new mongoose.Types.ObjectId(userId) }), ...(Object.keys(dateFilter).length && { date: dateFilter }) };

  // ── Attendance aggregation ──────────────────────────────────────────────
  const attendanceStats = await Attendance.aggregate([
    { $match: attendanceMatch },
    {
      $group: {
        _id: "$userId",
        totalDays:        { $sum: 1 },
        lateDays:         { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
        presentDays:      { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
        totalWorkMinutes: {
          $sum: {
            $cond: [
              { $and: ["$checkOutTime", "$checkInTime"] },
              { $divide: [{ $subtract: ["$checkOutTime", "$checkInTime"] }, 60000] },
              0,
            ],
          },
        },
        // Average check-in time as minutes since midnight
        avgCheckInMinutes: {
          $avg: {
            $add: [
              { $multiply: [{ $hour: "$checkInTime" }, 60] },
              { $minute: "$checkInTime" },
            ],
          },
        },
      },
    },
    {
      $lookup: {
        from: "users", localField: "_id", foreignField: "_id",
        as: "user",
        pipeline: [{ $project: { name: 1, email: 1, role: 1 } }],
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
  ]);

  // ── Assignment aggregation (total scheduled vs missed) ──────────────────
  const assignmentStats = await Assignment.aggregate([
    { $match: assignmentMatch },
    {
      $group: {
        _id:            "$userId",
        totalAssigned:  { $sum: 1 },
        missedDays:     { $sum: { $cond: [{ $eq: ["$status", "missed"] }, 1, 0] } },
      },
    },
  ]);

  // Index assignment stats by userId string for O(1) lookup
  const assignmentMap = Object.fromEntries(
    assignmentStats.map((a) => [a._id.toString(), a])
  );

  // ── Merge and compute derived metrics ──────────────────────────────────
  const insights = attendanceStats.map((stat) => {
    const uid          = stat._id.toString();
    const assignment   = assignmentMap[uid] || { totalAssigned: 0, missedDays: 0 };
    const onTimeCount  = stat.presentDays;
    const totalDays    = stat.totalDays;
    const onTimePct    = totalDays > 0 ? Math.round((onTimeCount / totalDays) * 100) : 0;
    const avgMinutes   = Math.round(stat.avgCheckInMinutes ?? 0);
    const avgCheckInTime = `${String(Math.floor(avgMinutes / 60)).padStart(2, "0")}:${String(avgMinutes % 60).padStart(2, "0")}`;
    const avgWorkHours = totalDays > 0 ? +(stat.totalWorkMinutes / totalDays / 60).toFixed(2) : 0;

    // Performance score (0–100):
    //   50% weight → on-time percentage
    //   30% weight → attendance rate vs assigned days
    //   20% weight → avg work hours (capped at 8h = full score)
    const attendanceRate = assignment.totalAssigned > 0
      ? Math.round((totalDays / assignment.totalAssigned) * 100)
      : 100;
    const workHourScore  = Math.min(avgWorkHours / 8, 1) * 100;
    const performanceScore = Math.round(
      onTimePct * 0.5 + attendanceRate * 0.3 + workHourScore * 0.2
    );

    return {
      userId:           stat._id,
      user:             stat.user ?? null,
      totalDays,
      presentDays:      stat.presentDays,
      lateDays:         stat.lateDays,
      missedDays:       assignment.missedDays,
      totalAssigned:    assignment.totalAssigned,
      onTimePercentage: onTimePct,
      attendanceRate,
      avgCheckInTime,
      avgWorkHoursPerDay: avgWorkHours,
      performanceScore,
      grade: performanceScore >= 90 ? "A"
           : performanceScore >= 75 ? "B"
           : performanceScore >= 60 ? "C"
           : performanceScore >= 40 ? "D" : "F",
    };
  });

  return insights;
};

module.exports = computeInsights;
