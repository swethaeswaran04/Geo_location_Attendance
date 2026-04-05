const { Schema, model, Types } = require("mongoose");

const taskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    assignedTo: { type: Types.ObjectId, ref: "User", required: true },
    locationId: { type: Types.ObjectId, ref: "Location", required: true },
    status: { type: String, enum: ["pending", "in-progress", "completed"], default: "pending" },
  },
  { timestamps: true }
);

module.exports = model("Task", taskSchema);
