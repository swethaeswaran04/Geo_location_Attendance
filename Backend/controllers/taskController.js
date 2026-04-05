const Task = require("../models/Task");

const getTasks = async (req, res) => {
  const filter = req.user.role === "admin" ? {} : { assignedTo: req.user.id };
  const tasks = await Task.find(filter).populate("assignedTo", "name email").populate("locationId", "name");
  res.json(tasks);
};

const createTask = async (req, res) => {
  const { title, description, assignedTo, locationId } = req.body;
  const task = await Task.create({ title, description, assignedTo, locationId });
  res.status(201).json(task);
};

module.exports = { getTasks, createTask };
