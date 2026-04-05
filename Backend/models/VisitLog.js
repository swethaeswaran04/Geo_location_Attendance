const { Schema, model, Types } = require("mongoose");

const visitLogSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true },
    locationId: { type: Types.ObjectId, ref: "Location", required: true },
    checkInTime: { type: Date, required: true },
    checkOutTime: { type: Date },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = model("VisitLog", visitLogSchema);
