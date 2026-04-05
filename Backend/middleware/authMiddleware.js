const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired. Please log in again." });
      }
      return res.status(401).json({ message: "Invalid token." });
    }

    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "User no longer exists." });
    if (user.status === "inactive") return res.status(403).json({ message: "Account is deactivated." });

    // Attach both DB user and token role to request
    req.user = user;
    req.role = decoded.role;
    next();
  } catch (err) {
    res.status(500).json({ message: "Authentication error", error: err.message });
  }
};

// Allow only admins
const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Access restricted to admins only." });
  }
  next();
};

// Allow only workers
const workerOnly = (req, res, next) => {
  if (req.user?.role !== "worker") {
    return res.status(403).json({ message: "Access restricted to workers only." });
  }
  next();
};

// Allow specific roles — usage: allowRoles("admin", "worker")
const allowRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ message: `Access restricted to: ${roles.join(", ")}.` });
  }
  next();
};

module.exports = { protect, adminOnly, workerOnly, allowRoles };
