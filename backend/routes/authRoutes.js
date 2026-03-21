import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import passport from "passport";
import User from "../models/User.js";
import Otp from "../models/Otp.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

/* SEND OTP */
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });
    if (!email.toLowerCase().endsWith("@nsrit.edu.in")) {
      return res.status(400).json({ message: "Only @nsrit.edu.in domain is allowed" });
    }

    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.deleteMany({ email });
    await Otp.create({ email, otp });

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Event Automation Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Registration OTP Verification",
      html: `
        <p>Your OTP for registration is: <b>${otp}</b></p>
        <p>This OTP will expire in 10 minutes.</p>
      `,
    });

    res.json({ message: "OTP sent successfully. Please check your email." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

/* VERIFY OTP */
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

    const otpRecord = await Otp.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    otpRecord.isVerified = true;
    await otpRecord.save();

    res.json({ message: "Email verified successfully" });
  } catch (err) {
    res.status(500).json({ message: "Verification failed" });
  }
});

/* REGISTER */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, facultyId } = req.body;

    if (!name || !email || !password || !facultyId) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!email.toLowerCase().endsWith("@nsrit.edu.in")) {
      return res.status(400).json({ message: "Only @nsrit.edu.in domain is allowed" });
    }

    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const facultyIdExists = await User.findOne({ facultyId });
    if (facultyIdExists) {
      return res.status(400).json({ message: "Faculty ID already exists" });
    }

    const verifiedOtp = await Otp.findOne({ email, isVerified: true });
    if (!verifiedOtp) {
      return res.status(400).json({ message: "Email is not verified. Please verify your email first." });
    }

    const hashed = await bcrypt.hash(password, 10);
    const newUser = await User.create({ name, email, password: hashed, facultyId, status: "PENDING" });

    await Otp.deleteMany({ email });

    // Send Approval Email to Coordinator
    const adminUser = await User.findOne({ role: "ADMIN" });
    const coordinatorEmail = adminUser?.email || process.env.COORDINATOR_EMAIL || "madhu2000madhuk@gmail.com";
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const approveLink = `${process.env.PUBLIC_URL || 'http://localhost:5001'}/api/auth/approve-user/${newUser._id}`;
    const rejectLink = `${process.env.PUBLIC_URL || 'http://localhost:5001'}/api/auth/reject-user/${newUser._id}`;

    await transporter.sendMail({
      from: `"Event Automation System" <${process.env.EMAIL_USER}>`,
      to: coordinatorEmail,
      subject: `Action Required: New User Registration - ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">New User Registration Approval</h2>
          <p style="font-size: 16px; color: #333;">A new user has registered and is waiting for your approval to access the system.</p>
          
          <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
            <tr style="background-color: #f8f9fa;">
              <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold; width: 30%;">Name</td>
              <td style="padding: 12px; border: 1px solid #dee2e6;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Email</td>
              <td style="padding: 12px; border: 1px solid #dee2e6;">${email}</td>
            </tr>
            <tr style="background-color: #f8f9fa;">
              <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Faculty ID</td>
              <td style="padding: 12px; border: 1px solid #dee2e6;">${facultyId}</td>
            </tr>
          </table>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="${approveLink}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-right: 15px; display: inline-block;">Approve User</a>
            <a href="${rejectLink}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reject User</a>
          </div>
        </div>
      `,
    });

    res.json({ message: "Registration successful. Please wait for Coordinator approval." });
  } catch (err) {
    res.status(500).json({ message: "Registration failed" });
  }
});

/* LOGIN */
router.post("/login", async (req, res) => {
  try {
    const { email, password, isCoordinator } = req.body;

    // Special bypass for Coordinator via UI checkbox
    if (isCoordinator) {
      const envCoordinatorEmail = process.env.COORDINATOR_EMAIL || "madhu2000madhuk@gmail.com";
      let user = await User.findOne({ role: "ADMIN" });
      
      const validEmails = [envCoordinatorEmail.toLowerCase(), "coordinator"];
      if (user) validEmails.push(user.email.toLowerCase());

      if (validEmails.includes(email.toLowerCase())) {
        // If coordinator exists, check their actual password (allows changed passwords to work!)
        if (user) {
          const match = await bcrypt.compare(password, user.password);
          if (!match) {
            return res.status(400).json({ message: "Invalid coordinator credentials." });
          }
        }
        // If coordinator doesn't exist yet, bootstrap them with the default "madhuk" password
        else {
          if (password === "madhuk") {
            const hashedPw = await bcrypt.hash("madhuk", 10);
            user = await User.create({
              name: "Coordinator",
              email: envCoordinatorEmail,
              password: hashedPw,
              role: "ADMIN",
              status: "ACTIVE"
            });
          } else {
            return res.status(400).json({ message: "Invalid coordinator credentials." });
          }
        }

        const token = jwt.sign(
          { id: user._id, role: "ADMIN" },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );

        return res.json({
          token,
          user: {
            _id: user._id,
            email: user.email,
            role: "ADMIN",
            status: "ACTIVE"
          }
        });
      } else {
        return res.status(400).json({ message: "Invalid coordinator credentials." });
      }
    }

    const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(`^${escapeRegex(email)}$`, 'i');

    const user = await User.findOne({
      $or: [{ email: searchRegex }, { facultyId: searchRegex }]
    });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (user.role === "ADMIN" && !isCoordinator) {
      return res.status(403).json({ message: "Check Login as Coordinator to sign in as a Coordinator" });
    }

    if (user.status === "PENDING") {
      return res.status(403).json({ message: "Your registration is pending approval by the Coordinator." });
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
      { expiresIn: "7d" } // Reduced from 365d for better security
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
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Login failed" });
  }
});

/* ================= APPROVE/REJECT USER BY COORDINATOR ================= */

router.get("/approve-user/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Already Processed</title>
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Outfit', sans-serif; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; overflow: hidden; }
                .blob { position: absolute; width: 400px; height: 400px; background: linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%); border-radius: 50%; filter: blur(60px); opacity: 0.5; z-index: -1; animation: float 10s ease-in-out infinite; }
                .blob:nth-child(2) { right: -100px; top: -100px; background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%); animation-delay: -5s; }
                .card { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.4); padding: 50px 40px; border-radius: 24px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.05), inset 0 0 0 1px rgba(255, 255, 255, 0.5); text-align: center; max-width: 420px; animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1); position: relative; }
                .icon-ring { width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); box-shadow: 0 10px 20px rgba(100, 116, 139, 0.15), inset 0 -2px 5px rgba(0,0,0,0.05); display: flex; justify-content: center; align-items: center; margin: 0 auto 24px; position: relative; }
                .icon-ring::before { content: ''; position: absolute; inset: -5px; border-radius: 50%; background: linear-gradient(135deg, #94a3b8, #cbd5e1); z-index: -1; opacity: 0.3; animation: pulse 2s infinite; }
                .icon { color: #64748b; font-size: 36px; font-weight: 700; }
                h1 { color: #1e293b; margin: 0 0 12px; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
                p { color: #64748b; margin: 0 0 24px; line-height: 1.6; font-size: 16px; }
                .timer { color: #94a3b8; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: rgba(241, 245, 249, 0.8); border-radius: 20px; }
                .timer svg { width: 14px; height: 14px; animation: spin 2s linear infinite; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(40px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
                @keyframes float { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-20px) scale(1.05); } }
                @keyframes pulse { 0% { transform: scale(1); opacity: 0.4; } 50% { transform: scale(1.15); opacity: 0; } 100% { transform: scale(1); opacity: 0; } }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            </style>
        </head>
        <body>
            <div class="blob"></div>
            <div class="blob"></div>
            <div class="card">
                <div class="icon-ring"><div class="icon">ℹ️</div></div>
                <h1>Already Processed</h1>
                <p>This request has already been handled. You can safely close this window.</p>
                <div class="timer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    Closing automatically...
                </div>
            </div>
            <script>setTimeout(() => { window.close(); }, 3500);</script>
        </body>
        </html>
      `);
    }

    if (user.status === "ACTIVE") {
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Already Approved</title>
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Outfit', sans-serif; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; overflow: hidden; }
                .blob { position: absolute; width: 400px; height: 400px; background: linear-gradient(135deg, #93c5fd 0%, #60a5fa 100%); border-radius: 50%; filter: blur(60px); opacity: 0.4; z-index: -1; animation: float 10s ease-in-out infinite; }
                .blob:nth-child(2) { right: -100px; top: -100px; background: linear-gradient(135deg, #bfdbfe 0%, #93c5fd 100%); animation-delay: -5s; }
                .card { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.4); padding: 50px 40px; border-radius: 24px; box-shadow: 0 20px 40px rgba(59, 130, 246, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.5); text-align: center; max-width: 420px; animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1); position: relative; }
                .icon-ring { width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); box-shadow: 0 10px 20px rgba(59, 130, 246, 0.15), inset 0 -2px 5px rgba(0,0,0,0.05); display: flex; justify-content: center; align-items: center; margin: 0 auto 24px; position: relative; }
                .icon-ring::before { content: ''; position: absolute; inset: -5px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #60a5fa); z-index: -1; opacity: 0.3; animation: pulse 2s infinite; }
                .icon { color: #2563eb; font-size: 36px; font-weight: 700; }
                h1 { color: #1e3a8a; margin: 0 0 12px; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
                p { color: #475569; margin: 0 0 24px; line-height: 1.6; font-size: 16px; }
                .timer { color: #64748b; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: rgba(219, 234, 254, 0.8); border-radius: 20px; }
                .timer svg { width: 14px; height: 14px; animation: spin 2s linear infinite; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(40px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
                @keyframes float { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-20px) scale(1.05); } }
                @keyframes pulse { 0% { transform: scale(1); opacity: 0.4; } 50% { transform: scale(1.15); opacity: 0; } 100% { transform: scale(1); opacity: 0; } }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            </style>
        </head>
        <body>
            <div class="blob"></div>
            <div class="blob"></div>
            <div class="card">
                <div class="icon-ring"><div class="icon">✓</div></div>
                <h1>Already Approved</h1>
                <p>This user has already been successfully approved. You can safely close this window.</p>
                <div class="timer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    Closing automatically...
                </div>
            </div>
            <script>setTimeout(() => { window.close(); }, 3500);</script>
        </body>
        </html>
      `);
    }

    user.status = "ACTIVE";
    await user.save();

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Event Automation System" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Registration Approved! 🎉",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #16a34a;">Account Approved</h2>
          <p style="font-size: 16px;">Hello ${user.name},</p>
          <p style="font-size: 16px;">Great news! Your registration has been approved by the Social Media Coordinator.</p>
          <p style="font-size: 16px;">You can now log in to your account and start using the Event Automation System.</p>
          <div style="margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login Now</a>
          </div>
        </div>
      `,
    });

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>User Approved!</title>
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
              body { font-family: 'Outfit', sans-serif; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; overflow: hidden; }
              .blob { position: absolute; width: 400px; height: 400px; background: linear-gradient(135deg, #10b981 0%, #34d399 100%); border-radius: 50%; filter: blur(60px); opacity: 0.3; z-index: -1; animation: float 10s ease-in-out infinite; }
              .blob:nth-child(2) { right: -100px; top: -100px; background: linear-gradient(135deg, #34d399 0%, #a7f3d0 100%); animation-delay: -5s; }
              .card { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.5); padding: 50px 40px; border-radius: 24px; box-shadow: 0 20px 40px rgba(16, 185, 129, 0.15), inset 0 0 0 1px rgba(255, 255, 255, 0.5); text-align: center; max-width: 420px; animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1); position: relative; }
              .icon-ring { width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%); box-shadow: 0 10px 20px rgba(16, 185, 129, 0.15), inset 0 -2px 5px rgba(0,0,0,0.05); display: flex; justify-content: center; align-items: center; margin: 0 auto 24px; position: relative; }
              .icon-ring::before { content: ''; position: absolute; inset: -5px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #34d399); z-index: -1; opacity: 0.4; animation: pulse 2s infinite; }
              .icon { color: #059669; font-size: 40px; font-weight: 700; line-height: 1; text-shadow: 0 2px 4px rgba(16, 185, 129, 0.2); }
              h1 { color: #065f46; margin: 0 0 12px; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
              p { color: #475569; margin: 0 0 24px; line-height: 1.6; font-size: 16px; }
              .timer { color: #475569; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: rgba(209, 250, 229, 0.8); border-radius: 20px; }
              .timer svg { width: 14px; height: 14px; animation: spin 2s linear infinite; }
              @keyframes slideUp { from { opacity: 0; transform: translateY(40px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
              @keyframes float { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-20px) scale(1.05); } }
              @keyframes pulse { 0% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.15); opacity: 0; } 100% { transform: scale(1); opacity: 0; } }
              @keyframes spin { 100% { transform: rotate(360deg); } }
          </style>
      </head>
      <body>
          <div class="blob"></div>
          <div class="blob"></div>
          <div class="card">
              <div class="icon-ring"><div class="icon">✓</div></div>
              <h1>Approved!</h1>
              <p>The user has been successfully approved and notified via email. You can safely close this window.</p>
              <div class="timer">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  Closing automatically...
              </div>
          </div>
          <script>setTimeout(() => { window.close(); }, 3500);</script>
      </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("<h2>Internal Server Error processing approval.</h2>");
  }
});

router.get("/reject-user/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).send(`
        < !DOCTYPE html >
      <html lang="en">
        <head>
          <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Already Processed</title>
              <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
                <style>
                  body {font - family: 'Outfit', sans-serif; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; overflow: hidden; }
                  .blob {position: absolute; width: 400px; height: 400px; background: linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%); border-radius: 50%; filter: blur(60px); opacity: 0.5; z-index: -1; animation: float 10s ease-in-out infinite; }
                  .blob:nth-child(2) {right: -100px; top: -100px; background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%); animation-delay: -5s; }
                  .card {background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.4); padding: 50px 40px; border-radius: 24px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.05), inset 0 0 0 1px rgba(255, 255, 255, 0.5); text-align: center; max-width: 420px; animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1); position: relative; }
                  .icon-ring {width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); box-shadow: 0 10px 20px rgba(100, 116, 139, 0.15), inset 0 -2px 5px rgba(0,0,0,0.05); display: flex; justify-content: center; align-items: center; margin: 0 auto 24px; position: relative; }
                  .icon-ring::before {content: ''; position: absolute; inset: -5px; border-radius: 50%; background: linear-gradient(135deg, #94a3b8, #cbd5e1); z-index: -1; opacity: 0.3; animation: pulse 2s infinite; }
                  .icon {color: #64748b; font-size: 36px; font-weight: 700; }
                  h1 {color: #1e293b; margin: 0 0 12px; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
                  p {color: #64748b; margin: 0 0 24px; line-height: 1.6; font-size: 16px; }
                  .timer {color: #94a3b8; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: rgba(241, 245, 249, 0.8); border-radius: 20px; }
                  .timer svg {width: 14px; height: 14px; animation: spin 2s linear infinite; }
                  @keyframes slideUp {from {opacity: 0; transform: translateY(40px) scale(0.95); } to {opacity: 1; transform: translateY(0) scale(1); } }
                  @keyframes float {0 %, 100 % { transform: translateY(0) scale(1); } 50% {transform: translateY(-20px) scale(1.05); } }
                  @keyframes pulse {0 % { transform: scale(1); opacity: 0.4; } 50% {transform: scale(1.15); opacity: 0; } 100% {transform: scale(1); opacity: 0; } }
                  @keyframes spin {100 % { transform: rotate(360deg); }}
                </style>
              </head>
              <body>
                <div class="blob"></div>
                <div class="blob"></div>
                <div class="card">
                  <div class="icon-ring"><div class="icon">ℹ️</div></div>
                  <h1>Already Processed</h1>
                  <p>This request has already been handled. You can safely close this window.</p>
                  <div class="timer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                    Closing automatically...
                  </div>
                </div>
                <script>setTimeout(() => {window.close(); }, 3500);</script>
              </body>
            </html>
            `);
    }

    if (user.status === "ACTIVE") {
      return res.send(`
            <!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Cannot Reject</title>
                    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
                      <style>
                        body {font - family: 'Outfit', sans-serif; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; overflow: hidden; }
                        .blob {position: absolute; width: 400px; height: 400px; background: linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%); border-radius: 50%; filter: blur(60px); opacity: 0.5; z-index: -1; animation: float 10s ease-in-out infinite; }
                        .blob:nth-child(2) {right: -100px; top: -100px; background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%); animation-delay: -5s; }
                        .card {background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.4); padding: 50px 40px; border-radius: 24px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.05), inset 0 0 0 1px rgba(255, 255, 255, 0.5); text-align: center; max-width: 420px; animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1); position: relative; }
                        .icon-ring {width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); box-shadow: 0 10px 20px rgba(100, 116, 139, 0.15), inset 0 -2px 5px rgba(0,0,0,0.05); display: flex; justify-content: center; align-items: center; margin: 0 auto 24px; position: relative; }
                        .icon-ring::before {content: ''; position: absolute; inset: -5px; border-radius: 50%; background: linear-gradient(135deg, #94a3b8, #cbd5e1); z-index: -1; opacity: 0.3; animation: pulse 2s infinite; }
                        .icon {color: #64748b; font-size: 32px; font-weight: 700; }
                        h1 {color: #1e293b; margin: 0 0 12px; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
                        p {color: #64748b; margin: 0 0 24px; line-height: 1.6; font-size: 16px; }
                        .timer {color: #94a3b8; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: rgba(241, 245, 249, 0.8); border-radius: 20px; }
                        .timer svg {width: 14px; height: 14px; animation: spin 2s linear infinite; }
                        @keyframes slideUp {from {opacity: 0; transform: translateY(40px) scale(0.95); } to {opacity: 1; transform: translateY(0) scale(1); } }
                        @keyframes float {0 %, 100 % { transform: translateY(0) scale(1); } 50% {transform: translateY(-20px) scale(1.05); } }
                        @keyframes pulse {0 % { transform: scale(1); opacity: 0.4; } 50% {transform: scale(1.15); opacity: 0; } 100% {transform: scale(1); opacity: 0; } }
                        @keyframes spin {100 % { transform: rotate(360deg); }}
                      </style>
                    </head>
                    <body>
                      <div class="blob"></div>
                      <div class="blob"></div>
                      <div class="card">
                        <div class="icon-ring"><div class="icon">🔒</div></div>
                        <h1>Cannot Reject</h1>
                        <p>This user is already active. You can safely close this window.</p>
                        <div class="timer">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                          Closing automatically...
                        </div>
                      </div>
                      <script>setTimeout(() => {window.close(); }, 3500);</script>
                    </body>
                  </html>
                  `);
    }

    // Delete the pending user so they can try registering again if it was a mistake
    await User.findByIdAndDelete(req.params.id);

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Event Automation System" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Registration Update",
      html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                      <h2 style="color: #dc2626;">Registration Declined</h2>
                      <p style="font-size: 16px;">Hello ${user.name},</p>
                      <p style="font-size: 16px;">We're sorry to inform you that your registration for the Event Automation System could not be approved at this time.</p>
                      <p style="font-size: 16px;">If you believe this is a mistake, you may try registering again with correct details or contact the administration.</p>
                    </div>
                    `,
    });

    res.send(`
                    <!DOCTYPE html>
                    <html lang="en">
                      <head>
                        <meta charset="UTF-8">
                          <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>User Rejected</title>
                            <style>
                              body {font - family: 'Segoe UI', system-ui, sans-serif; background: #fef2f2; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                              .card {background: white; padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px rgba(220, 38, 38, 0.1); text-align: center; max-width: 400px; animation: slideUp 0.5s ease-out; }
                              .icon {width: 64px; height: 64px; background: #fee2e2; border-radius: 50%; display: flex; justify-content: center; align-items: center; margin: 0 auto 20px; color: #dc2626; font-size: 32px; }
                              h1 {color: #b91c1c; margin: 0 0 10px; font-size: 24px; }
                              p {color: #475569; margin: 0 0 20px; line-height: 1.5; }
                              .timer {color: #94a3b8; font-size: 14px; }
                              @keyframes slideUp {from {opacity: 0; transform: translateY(20px); } to {opacity: 1; transform: translateY(0); } }
                            </style>
                          </head>
                          <body>
                            <div class="card">
                              <div class="icon">✕</div>
                              <h1>Rejected Successfully</h1>
                              <p>The registration request has been rejected and the user has been notified.</p>
                              <div class="timer">Closing automatically...</div>
                            </div>
                            <script>
              setTimeout(() => {
                                window.close(); // Attempts to close if script allowed
              }, 3000);
                            </script>
                          </body>
                        </html>
                        `);
  } catch (err) {
    console.error(err);
    res.status(500).send("<h2>Internal Server Error processing rejection.</h2>");
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
        { expiresIn: "7d" } // Reduced from 365d for better security
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


/* ================= COORDINATOR USER MANAGEMENT ================= */

/* CHANGE COORDINATOR EMAIL */
router.put("/admin/email", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    const adminUser = await User.findById(req.user.id);
    if (!adminUser || adminUser.role !== "ADMIN") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const match = await bcrypt.compare(password, adminUser.password);
    if (!match) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    const emailExists = await User.findOne({ email, _id: { $ne: req.user.id } });
    if (emailExists) {
      return res.status(400).json({ message: "Email already in use by another user" });
    }

    adminUser.email = email;
    await adminUser.save();

    res.json({ message: "Coordinator email updated successfully", email: email });
  } catch (error) {
    console.error("UPDATE ADMIN EMAIL ERROR:", error);
    res.status(500).json({ message: "Failed to update email" });
  }
});

/* GET ALL USERS (COORDINATOR ONLY) */
router.get("/users", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: "ADMIN" } }).select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error("FETCH USERS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

/* DELETE USER (COORDINATOR ONLY) */
router.delete("/users/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "ADMIN") {
      return res.status(403).json({ message: "Cannot delete another admin" });
    }

    await User.findByIdAndDelete(id);

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("DELETE USER ERROR:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

/* TOGGLE USER STATUS (COORDINATOR ONLY) */
router.put("/users/:id/status", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["ACTIVE", "BLOCKED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "ADMIN") {
      return res.status(403).json({ message: "Cannot modify coordinator status" });
    }

    user.status = status;
    await user.save();

    res.json(user);
  } catch (error) {
    console.error("UPDATE USER STATUS ERROR:", error);
    res.status(500).json({ message: "Failed to update user status" });
  }
});
