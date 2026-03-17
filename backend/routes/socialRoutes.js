import express from "express";
import Event from "../models/Event.js";
import { postToInstagram } from "../services/postToInstagram.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

/* ================= SCHEDULE INSTAGRAM ================= */
router.post(
  "/instagram/schedule/:eventId",
  authMiddleware,
  async (req, res) => {
    try {
      const { scheduledAt } = req.body;

      if (!scheduledAt) {
        return res.status(400).json({
          message: "Schedule date & time required",
        });
      }

      const event = await Event.findById(req.params.eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      if (event.socialMedia.instagram.posted) {
        return res.status(409).json({
          message: "Event already posted",
        });
      }

      await Event.updateOne(
        { _id: event._id },
        {
          $set: {
            "socialMedia.instagram.status": "SCHEDULED",
            "socialMedia.instagram.scheduledAt": new Date(scheduledAt)
          },
          $push: {
            approvalTimeline: { action: "SCHEDULED", by: "ADMIN", at: new Date() }
          }
        }
      );

      res.json({
        success: true,
        message: "Instagram post scheduled successfully",
      });
    } catch (error) {
      console.error("SCHEDULE ERROR:", error);
      res.status(500).json({
        message: "Failed to schedule Instagram post",
      });
    }
  }
);

/* ================= PUBLISH TO INSTAGRAM ================= */
router.post("/instagram/:eventId", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.approvalStatus !== "APPROVED") {
      return res.status(403).json({
        message: "Event must be approved before publishing",
      });
    }

    if (event.socialMedia.instagram.posted) {
      return res.status(409).json({
        message: "Event already published",
      });
    }

    if (!event.images || event.images.length === 0) {
      return res.status(400).json({
        message: "At least one image required",
      });
    }

    const imageUrls = event.images.slice(0, 10).map((img) => {
      if (img.startsWith("http")) {
        return img;
      }

      if (!process.env.PUBLIC_URL) {
        throw new Error("PUBLIC_URL is missing in environment variables");
      }

      return `${process.env.PUBLIC_URL}${img}`;
    });

    if (imageUrls.some((url) => url.includes("undefined"))) {
      console.error("INVALID IMAGE URLS:", imageUrls);
      return res.status(500).json({
        message: "Invalid image URL generated. Check PUBLIC_URL.",
      });
    }

    let caption = req.body.caption;

    // If no manual caption provided, use stored content or event details
    if (!caption) {
      caption = event.socialMedia.instagram.content || event.details;
    }

    if (!caption) {
      return res.status(400).json({
        message: "Instagram content missing",
      });
    }

    // ================= FIRE AND FORGET ================= 
    res.json({
      success: true,
      message: "Publishing to Instagram started in the background",
    });

    // Run actual publishing asynchronously
    (async () => {
      try {
        const { postUrl } = await postToInstagram({
          imageUrls,
          caption,
        });

        await Event.updateOne(
          { _id: eventId },
          {
            $set: {
              "socialMedia.instagram.postUrl": postUrl || `https://www.instagram.com/${process.env.INSTAGRAM_USERNAME}/`,
              "socialMedia.instagram.posted": true,
              "socialMedia.instagram.postedAt": new Date(),
              "socialMedia.instagram.status": "POSTED"
            },
            $push: {
              approvalTimeline: { action: "POSTED", by: "ADMIN", at: new Date() }
            }
          }
        );
        console.log("Instagram background publish success:", eventId);
      } catch (bgError) {
        console.error("Instagram background publish failed:", bgError.message);
        await Event.updateOne(
          { _id: eventId },
          { $set: { "socialMedia.instagram.status": "FAILED" } }
        ).catch(e => console.error(e));
      }
    })();

  } catch (error) {
    console.error(
      "INSTAGRAM ROUTE ERROR:",
      error.message
    );

    res.status(500).json({
      message: "Failed to initiate Instagram publishing",
      error: error.message,
    });
  }
});


/* ================= SCHEDULE FACEBOOK ================= */
router.post(
  "/facebook/schedule/:eventId",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { scheduledAt } = req.body;

      if (!scheduledAt) {
        return res.status(400).json({
          message: "Schedule date & time required",
        });
      }

      const event = await Event.findById(req.params.eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      if (event.socialMedia.facebook.posted) {
        return res.status(409).json({
          message: "Event already posted to Facebook",
        });
      }

      await Event.updateOne(
        { _id: event._id },
        {
          $set: {
            "socialMedia.facebook.status": "SCHEDULED",
            "socialMedia.facebook.scheduledAt": new Date(scheduledAt)
          },
          $push: {
            approvalTimeline: { action: "SCHEDULED_FB", by: "ADMIN", at: new Date() }
          }
        }
      );

      res.json({
        success: true,
        message: "Facebook post scheduled successfully",
      });
    } catch (error) {
      console.error("FACEBOOK SCHEDULE ERROR:", error);
      res.status(500).json({
        message: "Failed to schedule Facebook post",
      });
    }
  }
);

/* ================= PUBLISH TO FACEBOOK ================= */
import { postToFacebook } from "../services/postToFacebook.js";

router.post("/facebook/:eventId", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.approvalStatus !== "APPROVED") {
      return res.status(403).json({
        message: "Event must be approved before publishing",
      });
    }

    if (event.socialMedia.facebook.posted) {
      return res.status(409).json({
        message: "Event already published to Facebook",
      });
    }

    if (!event.images || event.images.length === 0) {
      return res.status(400).json({
        message: "At least one image required",
      });
    }

    const imageUrls = event.images.slice(0, 10).map((img) => {
      if (img.startsWith("http")) {
        return img;
      }

      if (!process.env.PUBLIC_URL) {
        throw new Error("PUBLIC_URL is missing in environment variables");
      }

      return `${process.env.PUBLIC_URL}${img}`;
    });

    let caption = req.body.caption;

    // If no manual caption provided, use stored content or event details
    if (!caption) {
      caption = event.socialMedia.facebook.content || event.details;
    }

    if (!caption) {
      return res.status(400).json({
        message: "Facebook content missing",
      });
    }

    // ================= FIRE AND FORGET ================= 
    res.json({
      success: true,
      message: "Publishing to Facebook started in the background",
    });

    // Run actual publishing asynchronously
    (async () => {
      try {
        const { postUrl } = await postToFacebook({
          imageUrls,
          caption,
        });

        await Event.updateOne(
          { _id: eventId },
          {
            $set: {
              "socialMedia.facebook.postUrl": postUrl || "",
              "socialMedia.facebook.posted": true,
              "socialMedia.facebook.postedAt": new Date(),
              "socialMedia.facebook.status": "POSTED"
            },
            $push: {
              approvalTimeline: { action: "POSTED_FB", by: "ADMIN", at: new Date() }
            }
          }
        );
        console.log("Facebook background publish success:", eventId);
      } catch (bgError) {
        console.error("Facebook background publish failed:", bgError.message);
        await Event.updateOne(
          { _id: eventId },
          { $set: { "socialMedia.facebook.status": "FAILED" } }
        ).catch(e => console.error(e));
      }
    })();

  } catch (error) {
    console.error(
      "FACEBOOK ROUTE ERROR:",
      error.message
    );

    res.status(500).json({
      message: "Failed to initiate Facebook publishing",
      error: error.message,
    });
  }
});

export default router;
