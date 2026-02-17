// controllers/socialController.js

import Event from "../models/Event.js";

export const scheduleInstagramPost = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { scheduledAt } = req.body;

    // ✅ VALIDATION
    if (!scheduledAt) {
      return res.status(400).json({ message: "scheduledAt required" });
    }

    // ✅ UPDATE EVENT
    const event = await Event.findByIdAndUpdate(
      eventId,
      {
        "socialMedia.instagram.status": "SCHEDULED",
        "socialMedia.instagram.scheduledAt": new Date(scheduledAt),
      },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    return res.json({
      message: "Instagram post scheduled successfully",
      scheduledAt: event.socialMedia.instagram.scheduledAt,
    });
  } catch (error) {
    console.error("Schedule error:", error);
    return res.status(500).json({ message: "Scheduling failed" });
  }
};
