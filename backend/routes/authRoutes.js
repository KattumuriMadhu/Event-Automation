import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import passport from "passport";
import User from "../models/User.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

/* REGISTER */
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    await User.create({ email, password: hashed });

    res.json({ message: "Account created successfully" });
  } catch {
    res.status(500).json({ message: "Registration failed" });
  }
});

/* LOGIN */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (user.status === "BLOCKED") {
      return res.status(403).json({ message: "Account is blocked. Contact Admin." });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "365d" }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch {
    res.status(500).json({ message: "Login failed" });
  }
});

/* VERIFY TOKEN & STATUS */
router.get("/verify", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

/* ================= FACEBOOK LOGIN ================= */

/* STEP 1 */
router.get(
  "/facebook",
  passport.authenticate("facebook", {
    scope: ["public_profile", "email"],
  })
);

/* STEP 2 */
router.get(
  "/facebook/callback",
  passport.authenticate("facebook", {
    failureRedirect: "/api/auth/facebook/failure",
    session: false,
  }),
  async (req, res) => {
    try {
      const email =
        req.user.emails?.[0]?.value ||
        `fb_${req.user.id}@facebook.com`;

      let user = await User.findOne({ email });

      if (!user) {
        user = await User.create({
          email,
          password: "FACEBOOK_AUTH",
        });
      }

      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "365d" }
      );

      res.json({
        message: "Facebook login success",
        token,
        user,
      });
    } catch (err) {
      res.status(500).json({ message: "Facebook login failed" });
    }
  }
);

/* FAILURE ROUTE (REQUIRED) */
router.get("/facebook/failure", (req, res) => {
  res.status(401).json({ message: "Facebook authentication failed" });
});

/* ================= CHECK EMAIL (PUBLIC) ================= */
router.post("/check-email", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admins can use this feature" });
    }

    res.json({ message: "Valid" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= FORGOT PASSWORD (ADMIN ONLY) ================= */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admins can use this feature" });
    }

    // Generate Token
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 300000; // 5 minutes
    await user.save();

    // Send Email
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from: `"Event Automation Support" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Password Reset Request",
      html: `
        <p>You requested a password reset.</p>
        <p>Click details below to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });

    res.json({ message: "Password reset link sent to your email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send reset email" });
  }
});

/* ================= VALIDATE RESET TOKEN ================= */
router.get("/reset-password/validate/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ valid: false, message: "Invalid or expired token" });
    }

    res.json({ valid: true, expiresAt: user.resetPasswordExpires });
  } catch {
    res.status(500).json({ message: "Validation failed" });
  }
});

/* ================= RESET PASSWORD ================= */
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Hash new password
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to reset password" });
  }
});

export default router;

/* ================= ADMIN USER MANAGEMENT ================= */

/* GET ALL USERS (ADMIN ONLY) */
router.get("/users", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find({}, "-password").sort({ createdAt: -1 });
    res.json(users);
  } catch {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

/* UPDATE OWN EMAIL (ANY USER) */
router.put("/profile/email", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newEmail } = req.body;
    const user = await User.findById(req.user._id);

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(400).json({ message: "Incorrect current password" });
    }

    const exists = await User.findOne({ email: newEmail });
    if (exists) {
      return res.status(400).json({ message: "Email already in use" });
    }

    await User.findByIdAndUpdate(user._id, { email: newEmail });

    // Optionally update user in response if needed by frontend
    const updatedUser = await User.findById(user._id).select("-password");

    res.json({ message: "Email updated successfully", user: updatedUser });
  } catch {
    res.status(500).json({ message: "Failed to update email" });
  }
});

/* UPDATE OWN PASSWORD (ANY USER) */
router.put("/profile/password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(400).json({ message: "Incorrect current password" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(user._id, { password: hashed });

    res.json({ message: "Password updated successfully" });
  } catch {
    res.status(500).json({ message: "Failed to update password" });
  }
});

/* CREATE USER (ADMIN ONLY) */
router.post("/create-user", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    await User.create({ email, password: hashed, role: role || "PROVIDER" });

    res.json({ message: "User created successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to create user" });
  }
});

/* TOGGLE BLOCK STATUS (ADMIN ONLY) */
router.put("/users/:id/status", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // ACTIVE or BLOCKED

    await User.findByIdAndUpdate(id, { status });
    res.json({ message: "User status updated" });
  } catch {
    res.status(500).json({ message: "Failed to update status" });
  }
});

/* DELETE USER (ADMIN ONLY) */
router.delete("/users/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted successfully" });
  } catch {
    res.status(500).json({ message: "Failed to delete user" });
  }
});

/* UPDATE USER PASSWORD (ADMIN ONLY) */
router.put("/users/:id/password", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(req.params.id, { password: hashed });
    res.json({ message: "Password updated successfully" });
  } catch {
    res.status(500).json({ message: "Failed to update password" });
  }
});
