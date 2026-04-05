const { Schema, model, Types } = require("mongoose");

const assignmentSchema = new Schema(
  {
    userId:     { type: Types.ObjectId, ref: "User",     required: true },
    locationId: { type: Types.ObjectId, ref: "Location", required: true },
    date:       { type: Date, required: true },
    startTime:  { type: String, required: true }, // "HH:MM" format
    endTime:    { type: String, required: true }, // "HH:MM" format
    status:     { type: String, enum: ["scheduled", "completed", "missed"], default: "scheduled" },
    note:       { type: String },
  },
  { timestamps: true }
);

// One assignment per worker per day per location
assignmentSchema.index({ userId: 1, locationId: 1, date: 1 }, { unique: true });

module.exports = model("Assignment", assignmentSchema);
