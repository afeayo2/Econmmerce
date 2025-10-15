// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function protect(req, res, next) {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token, access denied" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });

    // ✅ Debugging
    console.log("🔐 Authenticated User:", {
      id: user._id.toString(),
      name: user.name,
      email: user.email
    });

    req.user = user; // full user document
    next();
  } catch (err) {
    console.error("❌ Auth middleware error:", err.message);
    res.status(401).json({ error: "Invalid token" });
  }
}

// ProtectAdmin: only for admin users
async function protectAdmin(req, res, next) {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token, access denied" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized, admin only" });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(400).json({ error: "Invalid token" });
  }
}

module.exports = { protect, protectAdmin };
