const { Schema, model, Types } = require("mongoose");

const syncLogSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true },
    attendanceId: { type: Types.ObjectId, ref: "Attendance" },
    syncTime: { type: Date, default: Date.now },
    status: { type: String, enum: ["success", "failed", "pending"], default: "pending" },
  },
  { timestamps: true }
);

module.exports = model("SyncLog", syncLogSchema);
