require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const taskRoutes = require("./routes/taskRoutes");
const locationRoutes    = require("./routes/locationRoutes");
const assignmentRoutes  = require("./routes/assignmentRoutes");
const userRoutes        = require("./routes/userRoutes");
const insightsRoutes    = require("./routes/insightsRoutes");

const app = express();

connectDB();

app.use(cors({ origin: "*" }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/locations",   locationRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/users",       userRoutes);
app.use("/api/insights",    insightsRoutes);

app.get("/", (req, res) => res.send("Geo Attendance API Running"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running successfully on port ${PORT}`));
