const Location = require("../models/Location");

const getLocations = async (req, res) => {
  try {
    const locations = await Location.find();
    res.json(locations);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch locations", error: err.message });
  }
};

const createLocation = async (req, res) => {
  try {
    const { name, latitude, longitude, radius } = req.body;
    if (!name || latitude == null || longitude == null || radius == null) {
      return res.status(400).json({ message: "name, latitude, longitude and radius are required" });
    }

    const location = await Location.create({ name, latitude, longitude, radius });
    res.status(201).json({ message: "Location created successfully", location });
  } catch (err) {
    res.status(500).json({ message: "Failed to create location", error: err.message });
  }
};

module.exports = { getLocations, createLocation };
