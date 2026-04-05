const { Schema, model, Types } = require("mongoose");

const attendanceSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true },
    checkInTime: { type: Date, required: true },
    checkOutTime: { type: Date },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    locationId: { type: Types.ObjectId, ref: "Location" },
    taskId: { type: Types.ObjectId, ref: "Task" },
    assignmentId: { type: Types.ObjectId, ref: "Assignment" },
    status: { type: String, enum: ["present", "absent", "late"], default: "present" },
    syncStatus: { type: Boolean, default: false },
  },
  { timestamps: true }
);

attendanceSchema.index({ userId: 1, checkInTime: 1 }, { unique: true });

module.exports = model("Attendance", attendanceSchema);
