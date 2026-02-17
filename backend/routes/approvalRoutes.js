import express from "express";
import nodemailer from "nodemailer";
import Event from "../models/Event.js";
import User from "../models/User.js";
import authMiddleware from "../middleware/authMiddleware.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const router = express.Router();

/* ================= SEND FOR APPROVAL (ADMIN → HOD) ================= */
router.post("/send/:eventId", authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { hodEmail } = req.body;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    if (!hodEmail) {
      return res.status(400).json({ message: "HOD email required" });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    event.approvalStatus = "SENT";
    event.approvalTimeline.push({ action: "SENT", by: "ADMIN" });
    await event.save();

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
      to: hodEmail,
      subject: `Approval Required: ${event.title}`,
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Event Approval Required</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
  
  <!-- Wrapper Table for Email Client Compatibility -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f6fb">
    <tr>
      <td align="center" style="padding:20px 10px">
        
        <!-- Main Container -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
          
          <!-- Header with Icon -->
          <tr>
            <td style="padding:30px 30px 20px;text-align:center;background:linear-gradient(135deg,#2563eb 0%,#1e40af 100%);border-radius:12px 12px 0 0">
              <div style="width:60px;height:60px;background:#ffffff;border-radius:50%;margin:0 auto 15px;text-align:center;line-height:60px;display:block">
                <span style="font-size:30px;line-height:60px;display:block">📋</span>
              </div>
              <h2 style="margin:0;color:#ffffff;font-size:24px;font-weight:600">Event Approval Required</h2>
            </td>
          </tr>

          <!-- Content Section -->
          <tr>
            <td style="padding:30px">
              
              <!-- Greeting -->
              <p style="margin:0 0 20px;color:#1e293b;font-size:16px;line-height:1.5">
                Hello,
              </p>
              <p style="margin:0 0 25px;color:#475569;font-size:15px;line-height:1.6">
                A new event has been submitted and requires your approval. Please review the details below:
              </p>

              <!-- Event Details Card -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;border-radius:8px;border-left:4px solid #2563eb">
                <tr>
                  <td style="padding:20px">
                    
                    <!-- Event Title -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:12px">
                      <tr>
                        <td style="color:#64748b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:5px">
                          Event Title
                        </td>
                      </tr>
                      <tr>
                        <td style="color:#1e293b;font-size:18px;font-weight:600;line-height:1.4">
                          ${event.title}
                        </td>
                      </tr>
                    </table>

                    <!-- Two Column Layout for Details -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <!-- Department -->
                        <td style="width:50%;padding-right:10px;vertical-align:top">
                          <div style="margin-bottom:15px">
                            <div style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;margin-bottom:4px">
                              Department
                            </div>
                            <div style="color:#1e293b;font-size:15px;font-weight:500">
                              ${event.department}
                            </div>
                          </div>
                        </td>
                        
                        <!-- Date -->
                        <td style="width:50%;padding-left:10px;vertical-align:top">
                          <div style="margin-bottom:15px">
                            <div style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;margin-bottom:4px">
                              Event Date
                            </div>
                            <div style="color:#1e293b;font-size:15px;font-weight:500">
                              ${new Date(event.date).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })}
                            </div>
                          </div>
                        </td>
                      </tr>

                      <!-- Optional: Add more dynamic fields -->
                      ${event.venue ? `
                      <tr>
                        <td colspan="2" style="padding-top:5px">
                          <div style="margin-bottom:15px">
                            <div style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;margin-bottom:4px">
                              Venue
                            </div>
                            <div style="color:#1e293b;font-size:15px;font-weight:500">
                              ${event.venue}
                            </div>
                          </div>
                        </td>
                      </tr>
                      ` : ''}

                      ${event.organizer ? `
                      <tr>
                        <td colspan="2" style="padding-top:5px">
                          <div style="margin-bottom:15px">
                            <div style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;margin-bottom:4px">
                              Organized By
                            </div>
                            <div style="color:#1e293b;font-size:15px;font-weight:500">
                              ${event.organizer}
                            </div>
                          </div>
                        </td>
                      </tr>
                      ` : ''}

                      ${event.description ? `
                      <tr>
                        <td colspan="2" style="padding-top:5px">
                          <div>
                            <div style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;margin-bottom:4px">
                              Description
                            </div>
                            <div style="color:#475569;font-size:14px;line-height:1.6">
                              ${event.description.substring(0, 150)}${event.description.length > 150 ? '...' : ''}
                            </div>
                          </div>
                        </td>
                      </tr>
                      ` : ''}
                    </table>

                  </td>
                </tr>
              </table>

              <!-- CTA Buttons -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:30px">
                <tr>
                  <td align="center">
                    <!-- Review & Approve Button -->
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/hod/approve/${event._id}" 
                       style="display:inline-block;background:#2563eb;color:#ffffff;padding:16px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;margin:0 8px 10px;box-shadow:0 4px 6px rgba(37,99,235,0.3);transition:all 0.3s">
                      🔍 Review & Approve Details
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Urgency Notice (Optional) -->
              ${event.isUrgent ? `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:20px">
                <tr>
                  <td style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:6px">
                    <p style="margin:0;color:#92400e;font-size:13px;font-weight:500">
                      ⚠️ <strong>Urgent:</strong> This event requires immediate attention.
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Divider -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:25px 0">
                <tr>
                  <td style="border-top:1px solid #e2e8f0"></td>
                </tr>
              </table>

              <!-- Additional Info -->
              <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6">
                If you have any questions or need more information, please contact the event organizer or visit your dashboard.
              </p>

            </td>
          </tr>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 30px;background:#f8fafc;border-radius:0 0 12px 12px;text-align:center">
              <p style="margin:0 0 10px;color:#94a3b8;font-size:12px">
                This is an automated notification from your Event Management System
              </p>
              <p style="margin:0;color:#cbd5e1;font-size:11px">
                © ${new Date().getFullYear()} NSRIT. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>
`,
    });

    res.json({ message: "Approval email sent successfully" });
  } catch (error) {
    console.error("SEND ERROR:", error);
    res.status(500).json({ message: "Failed to send approval email" });
  }
});

/* ================= GET EVENT FOR HOD ================= */
router.get("/event/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    // Check for expiration (5 hours)
    let isExpired = false;
    if (event.approvalStatus === "SENT") {
      const lastSentAction = event.approvalTimeline
        .slice()
        .reverse()
        .find((item) => item.action === "SENT");

      if (lastSentAction) {
        const sentTime = new Date(lastSentAction.at).getTime();
        const currentTime = new Date().getTime();
        const diffHours = (currentTime - sentTime) / (1000 * 60 * 60);

        if (diffHours > 5) {
          isExpired = true;
        }
      }
    }

    // Convert mongoose document to object to append custom flag
    const eventObj = event.toObject();
    eventObj.isExpired = isExpired;

    res.json(eventObj);
  } catch {
    res.status(500).json({ message: "Failed to fetch event" });
  }
});

/* ================= APPROVE EVENT (HOD → ADMIN) ================= */
router.post("/approve/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    event.approvalStatus = "APPROVED";
    event.approvedAt = new Date();
    event.approvalTimeline.push({ action: "APPROVED", by: "HOD" });
    await event.save();

    /* ================= RANDOM PRO TIP ================= */
    const proTips = [
      "Schedule your social media posts at least 48 hours before the event for maximum reach.",
      "Use high-quality images (1080x1080) for better engagement on Instagram.",
      "Include a clear Call to Action (CTA) in your caption to drive registrations.",
      "Tag relevant speakers and partners in your post to expand your reach.",
      "Use 3-5 relevant hashtags to make your post discoverable.",
      "Post during peak hours (10 AM - 1 PM) for higher visibility.",
      "Engage with comments within the first hour of posting to boost the algorithm.",
      "Cross-promote your event on LinkedIn and Twitter for a professional audience.",
      "Create a sense of urgency by mentioning 'Limited Seats' or registration deadlines.",
      "Share behind-the-scenes content in Stories to build anticipation."
    ];
    const randomTip = proTips[Math.floor(Math.random() * proTips.length)];

    /* ================= GENERATE MAGIC LINK TOKEN ================= */
    // 1. Find Admin User
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    let adminUser = await User.findOne({ email: adminEmail });

    // Fallback: If no exact match, try to find *any* admin
    if (!adminUser) {
      adminUser = await User.findOne({ role: 'ADMIN' });
    }

    let magicLinkToken = "";
    if (adminUser) {
      magicLinkToken = jwt.sign(
        { id: adminUser._id, role: adminUser.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" } // Token valid for 7 days for email links
      );
    }

    /* ================= EMAIL TO ADMIN ================= */
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
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject: `✅ Event Approved: ${event.title}`,
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Event Approved</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
  
  <!-- Wrapper Table -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f6fb">
    <tr>
      <td align="center" style="padding:20px 10px">
        
        <!-- Main Container -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
          
          <!-- Success Header with Animation -->
          <tr>
            <td style="padding:30px 30px 20px;text-align:center;background:linear-gradient(135deg,#16a34a 0%,#15803d 100%);border-radius:12px 12px 0 0">
              <div style="width:70px;height:70px;background:#ffffff;border-radius:50%;margin:0 auto 15px;text-align:center;line-height:70px;display:block;box-shadow:0 4px 12px rgba(0,0,0,0.15)">
                <span style="font-size:36px;line-height:70px;display:block">✓</span>
              </div>
              <h2 style="margin:0;color:#ffffff;font-size:26px;font-weight:600">Event Approved!</h2>
              <p style="margin:10px 0 0;color:#dcfce7;font-size:14px">Your event has been successfully approved</p>
            </td>
          </tr>

          <!-- Content Section -->
          <tr>
            <td style="padding:30px">
              
              <!-- Success Message -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f0fdf4;border-radius:8px;border-left:4px solid #16a34a;margin-bottom:25px">
                <tr>
                  <td style="padding:16px 20px">
                    <p style="margin:0;color:#15803d;font-size:15px;line-height:1.6">
                      <strong>Great news!</strong> Your event has been reviewed and approved by the HOD. You can now proceed to publish it on social media platforms.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Event Details Card -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:25px">
                <tr>
                  <td style="padding:24px">
                    
                    <!-- Event Title -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:16px">
                      <tr>
                        <td style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:6px">
                          Event Name
                        </td>
                      </tr>
                      <tr>
                        <td style="color:#1e293b;font-size:20px;font-weight:700;line-height:1.3">
                          ${event.title}
                        </td>
                      </tr>
                    </table>

                    <!-- Event Info Grid -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <!-- Department -->
                        <td style="width:50%;padding:12px 12px 12px 0;vertical-align:top;border-top:1px solid #e2e8f0">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding-right:10px;vertical-align:top">
                                <span style="font-size:18px">🏢</span>
                              </td>
                              <td>
                                <div style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;margin-bottom:4px">
                                  Department
                                </div>
                                <div style="color:#1e293b;font-size:15px;font-weight:600">
                                  ${event.department}
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                        
                        <!-- Date -->
                        <td style="width:50%;padding:12px 0 12px 12px;vertical-align:top;border-top:1px solid #e2e8f0">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding-right:10px;vertical-align:top">
                                <span style="font-size:18px">📅</span>
                              </td>
                              <td>
                                <div style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;margin-bottom:4px">
                                  Event Date
                                </div>
                                <div style="color:#1e293b;font-size:15px;font-weight:600">
                                  ${new Date(event.date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })}
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Optional Fields Row 2 -->
                      ${event.venue || event.time ? `
                      <tr>
                        ${event.venue ? `
                        <td style="width:50%;padding:12px 12px 12px 0;vertical-align:top;border-top:1px solid #e2e8f0">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding-right:10px;vertical-align:top">
                                <span style="font-size:18px">📍</span>
                              </td>
                              <td>
                                <div style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;margin-bottom:4px">
                                  Venue
                                </div>
                                <div style="color:#1e293b;font-size:15px;font-weight:600">
                                  ${event.venue}
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                        ` : '<td style="width:50%"></td>'}
                        
                        ${event.time ? `
                        <td style="width:50%;padding:12px 0 12px 12px;vertical-align:top;border-top:1px solid #e2e8f0">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding-right:10px;vertical-align:top">
                                <span style="font-size:18px">⏰</span>
                              </td>
                              <td>
                                <div style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;margin-bottom:4px">
                                  Time
                                </div>
                                <div style="color:#1e293b;font-size:15px;font-weight:600">
                                  ${event.time}
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                        ` : '<td style="width:50%"></td>'}
                      </tr>
                      ` : ''}

                      <!-- Approved By -->
                      ${event.approvedBy ? `
                      <tr>
                        <td colspan="2" style="padding:12px 0;border-top:1px solid #e2e8f0">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding-right:10px;vertical-align:top">
                                <span style="font-size:18px">👤</span>
                              </td>
                              <td>
                                <div style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;margin-bottom:4px">
                                  Approved By
                                </div>
                                <div style="color:#1e293b;font-size:15px;font-weight:600">
                                  ${event.approvedBy} - Head of Department
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ` : ''}

                      ${event.approvalDate ? `
                      <tr>
                        <td colspan="2" style="padding:12px 0;border-top:1px solid #e2e8f0">
                          <div style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;margin-bottom:4px">
                            Approval Date & Time
                          </div>
                          <div style="color:#475569;font-size:13px">
                            ${new Date(event.approvalDate).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}
                          </div>
                        </td>
                      </tr>
                      ` : ''}
                    </table>

                  </td>
                </tr>
              </table>



              <!-- Primary CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:30px 0">
                <tr>
                  <td align="center">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/social-post/${event._id}${magicLinkToken ? `?token=${magicLinkToken}` : ''}" 
                       style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:16px;box-shadow:0 4px 12px rgba(37,99,235,0.4);transition:all 0.3s">
                      📣 Publish to Social Media
                    </a>
                  </td>
                </tr>

              </table>

              <!-- Tips Section (Optional) -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#eff6ff;border-radius:8px;border-left:4px solid #2563eb">
                <tr>
                  <td style="padding:16px 20px">
                    <p style="margin:0 0 8px;color:#1e40af;font-size:13px;font-weight:600">
                      💡 Pro Tip
                    </p>
                    <p style="margin:0;color:#1e40af;font-size:13px;line-height:1.6">
                      ${randomTip}
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:25px 30px;background:#f8fafc;border-radius:0 0 12px 12px;text-align:center;border-top:1px solid #e2e8f0">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;font-weight:500">
                      Event Automation System
                    </p>
                    <p style="margin:0 0 12px;color:#cbd5e1;font-size:11px">
                      Streamlining event management and promotion
                    </p>
                    <p style="margin:0;color:#cbd5e1;font-size:11px">
                      © ${new Date().getFullYear()} Your Organization. All rights reserved.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:15px">
                    <a href="http://localhost:3000/dashboard" style="color:#64748b;text-decoration:none;font-size:11px;margin:0 8px">Dashboard</a>
                    <span style="color:#cbd5e1">|</span>
                    <a href="http://localhost:3000/help" style="color:#64748b;text-decoration:none;font-size:11px;margin:0 8px">Help Center</a>
                    <span style="color:#cbd5e1">|</span>
                    <a href="http://localhost:3000/settings" style="color:#64748b;text-decoration:none;font-size:11px;margin:0 8px">Settings</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        
      </td>
    </tr>
  </table>

  <!-- Mobile Responsive Styles -->
  <style>
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
      }
      .stack-column {
        display: block !important;
        width: 100% !important;
      }
      .mobile-padding {
        padding: 15px !important;
      }
      .mobile-button {
        width: 90% !important;
        padding: 14px 20px !important;
        font-size: 15px !important;
      }
      .mobile-hide {
        display: none !important;
      }
      /* Stack two-column layout on mobile */
      table[class="info-grid"] td {
        display: block !important;
        width: 100% !important;
        padding: 8px 0 !important;
      }
    }
    
    /* Hover effects for supporting clients */
    a[class="cta-button"]:hover {
      background: #1e40af !important;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(37,99,235,0.5) !important;
    }

    /* Dark Mode Support */
    @media (prefers-color-scheme: dark) {
      body {
        background: #0f172a !important;
      }
      .dark-bg {
        background: #1e293b !important;
      }
      .dark-text {
        color: #e2e8f0 !important;
      }
      .dark-border {
        border-color: #334155 !important;
      }
    }
  </style>

</body>
</html>
`,
    });

    res.json({ message: "Event approved successfully" });
  } catch (error) {
    console.error("APPROVE ERROR:", error);
    res.status(500).json({ message: "Approval failed" });
  }
});

/* ================= REJECT EVENT ================= */
router.post("/reject/:id", async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason?.trim()) {
      return res.status(400).json({ message: "Reject reason required" });
    }

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    event.approvalStatus = "REJECTED";
    event.rejectedReason = reason;
    event.rejectedAt = new Date();
    event.approvalTimeline.push({
      action: "REJECTED",
      by: "HOD",
      reason,
    });
    await event.save();

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
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject: `❌ Event Rejected: ${event.title}`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Event Rejected</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
  
  <!-- Wrapper Table -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f6fb">
    <tr>
      <td align="center" style="padding:20px 10px">
        
        <!-- Main Container -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
          
          <!-- Rejection Header with Animation -->
          <tr>
            <td style="padding:30px 30px 20px;text-align:center;background:linear-gradient(135deg,#dc2626 0%,#b91c1c 100%);border-radius:12px 12px 0 0">
              <div style="width:70px;height:70px;background:#ffffff;border-radius:50%;margin:0 auto 15px;text-align:center;line-height:70px;display:block;box-shadow:0 4px 12px rgba(0,0,0,0.15)">
                <span style="font-size:36px;line-height:70px;display:block">✖</span>
              </div>
              <h2 style="margin:0;color:#ffffff;font-size:26px;font-weight:600">Event Rejected</h2>
              <p style="margin:10px 0 0;color:#fecaca;font-size:14px">Your event submission has been declined</p>
            </td>
          </tr>

          <!-- Content Section -->
          <tr>
            <td style="padding:30px">
              
              <!-- Rejection Notice -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fef2f2;border-radius:8px;border-left:4px solid #dc2626;margin-bottom:25px">
                <tr>
                  <td style="padding:16px 20px">
                    <p style="margin:0 0 8px;color:#991b1b;font-size:13px;font-weight:600;text-transform:uppercase">
                      Reason for Rejection
                    </p>
                    <p style="margin:0;color:#7f1d1d;font-size:15px;line-height:1.6;font-weight:500">
                      "${reason}"
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Event Details Card -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:25px">
                <tr>
                  <td style="padding:24px">
                    
                    <!-- Event Title -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:16px">
                      <tr>
                        <td style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:6px">
                          Event Name
                        </td>
                      </tr>
                      <tr>
                        <td style="color:#1e293b;font-size:20px;font-weight:700;line-height:1.3">
                          ${event.title}
                        </td>
                      </tr>
                    </table>

                    <!-- Department -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding-top:10px;border-top:1px solid #e2e8f0">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding-right:10px;vertical-align:center">
                                <span style="font-size:18px">🏢</span>
                              </td>
                              <td>
                                <div style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;margin-bottom:2px">
                                  Department
                                </div>
                                <div style="color:#1e293b;font-size:14px;font-weight:600">
                                  ${event.department}
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>



            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:25px 30px;background:#f8fafc;border-radius:0 0 12px 12px;text-align:center;border-top:1px solid #e2e8f0">
              <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;font-weight:500">
                Event Automation System
              </p>
              <p style="margin:0;color:#cbd5e1;font-size:11px">
                © ${new Date().getFullYear()} Your Organization. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        
      </td>
    </tr>
  </table>

  <!-- Mobile Responsive -->
  <style>
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
    }
  </style>

</body>
</html>
      `,
    });

    res.json({ message: "Event rejected successfully" });
  } catch {
    res.status(500).json({ message: "Rejection failed" });
  }
});

export default router;
