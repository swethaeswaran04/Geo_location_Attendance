const { Schema, model } = require("mongoose");

const locationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    radius: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = model("Location", locationSchema);
