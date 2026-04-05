const Assignment = require("../models/Assignment");
const haversineDistance = require("./haversine");

const LATE_THRESHOLD_MINUTES = 30;

/**
 * Converts "HH:MM" string to total minutes since midnight.
 */
const toMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

/**
 * Validates whether a user can check in based on their assignment.
 *
 * Returns:
 *   { valid: true, assignment, minutesLate, isLate }  — all checks passed
 *   { valid: false, status, message }                 — a check failed
 */
const validateAssignment = async (userId, latitude, longitude) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // 1. Check assignment exists for today
  const assignment = await Assignment.findOne({
    userId,
    date: { $gte: todayStart, $lte: todayEnd },
    status: "scheduled",
  }).populate("locationId");

  if (!assignment) {
    return { valid: false, status: 403, message: "No assignment found for today." };
  }

  // 2. Validate current time is within check-in window
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes   = toMinutes(assignment.startTime);
  const endMinutes     = toMinutes(assignment.endTime);

  if (currentMinutes < startMinutes) {
    return {
      valid: false, status: 403,
      message: `Check-in window not open yet. Allowed from ${assignment.startTime}.`,
    };
  }

  if (currentMinutes > endMinutes) {
    return {
      valid: false, status: 403,
      message: `Check-in window has closed. It was allowed until ${assignment.endTime}.`,
    };
  }

  // 3. Validate user is within assigned location radius
  const location = assignment.locationId;
  const distance = haversineDistance(latitude, longitude, location.latitude, location.longitude);

  if (distance > location.radius) {
    return {
      valid: false, status: 403,
      message: `You are not within the assigned radius. You are ${Math.round(distance)}m away from "${location.name}". Please move within ${location.radius}m to check in.`,
    };
  }

  // 4. Calculate how late the check-in is
  const minutesLate = Math.max(0, currentMinutes - startMinutes);
  const isLate      = minutesLate > LATE_THRESHOLD_MINUTES;

  return { valid: true, assignment, minutesLate, isLate };
};

module.exports = validateAssignment;
