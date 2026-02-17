import express from "express";
import mongoose from "mongoose";
import fs from "fs";

import Event from "../models/Event.js";
import authMiddleware from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";
import cloudinary from "../config/cloudinary.js";


const router = express.Router();

/* ======================================================
   CREATE EVENT (ADMIN)
   ====================================================== */
router.post(
  "/",
  authMiddleware,
  upload.array("images", 50),
  async (req, res) => {
    try {
      /* ================= VALIDATION ================= */
      const { title, date, type, details, department } = req.body;
      if (!title || !date || !type || !details || !department) {
        return res.status(400).json({
          message: "Please fill all required details",
        });
      }
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          message: "At least one image is required",
        });
      }

      if (req.files.length > 50) {
        return res.status(400).json({
          message: "Maximum 50 images allowed",
        });
      }

      /* ================= UPLOAD IMAGES TO CLOUDINARY ================= */
      const imagePaths = [];

      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "event_automation",
          resource_type: "image",
        });

        imagePaths.push(result.secure_url);

        // remove local file after upload
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }

      /* ================= DUPLICATE CHECK ================= */
      const existingEvent = await Event.findOne({
        title: req.body.title,
        date: req.body.date,
      });

      if (existingEvent) {
        return res.status(409).json({
          message: "Event with the same name and date already exists",
        });
      }

      /* ================= CREATE EVENT (FAST) ================= */
      const event = await Event.create({
        ...req.body,
        images: imagePaths,
      });

      // ⚡ RESPOND IMMEDIATELY (DO NOT WAIT FOR AI)
      res.status(201).json(event);



    } catch (error) {
      console.error("CREATE EVENT ERROR:", error);
      res.status(500).json({
        message: "Failed to create event",
      });
    }
  }
);

/* ======================================================
   GET ALL EVENTS (ADMIN)
   ====================================================== */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });
    res.json(events);
  } catch (error) {
    console.error("FETCH EVENTS ERROR:", error);
    res.status(500).json({
      message: "Failed to fetch events",
    });
  }
});

/* ======================================================
   GET SINGLE EVENT (ADMIN)
   ====================================================== */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid event ID",
      });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    res.json(event);
  } catch (error) {
    console.error("FETCH EVENT ERROR:", error);
    res.status(500).json({
      message: "Failed to fetch event",
    });
  }
});

/* ======================================================
   GET SINGLE EVENT (PUBLIC – EMAIL FLOW)
   ====================================================== */
router.get("/public/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid event ID",
      });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    res.json(event);
  } catch (error) {
    console.error("PUBLIC FETCH ERROR:", error);
    res.status(500).json({
      message: "Failed to fetch event",
    });
  }
});

/* ======================================================
   UPDATE EVENT (ADMIN)
   ====================================================== */
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Update fields
    const updates = req.body;
    Object.keys(updates).forEach((key) => {
      // Prevent updating immutable fields if necessary (like _id)
      if (key !== "_id" && key !== "__v") {
        event[key] = updates[key];
      }
    });

    await event.save();
    res.json(event);
  } catch (error) {
    console.error("UPDATE EVENT ERROR:", error);
    res.status(500).json({ message: "Failed to update event" });
  }
});

/* ======================================================
   DELETE EVENT (ADMIN)
   ====================================================== */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid event ID",
      });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    // 🧹 Cloudinary deletion can be added later using public_id
    await event.deleteOne();

    res.json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("DELETE EVENT ERROR:", error);
    res.status(500).json({
      message: "Failed to delete event",
    });
  }
});

export default router;
