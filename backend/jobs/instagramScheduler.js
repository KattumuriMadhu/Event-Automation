import cron from "node-cron";
import Event from "../models/Event.js";
import { postToInstagram } from "../services/postToInstagram.js";
import { postToFacebook } from "../services/postToFacebook.js";

cron.schedule("*/10 * * * * *", async () => {
  try {
    const now = new Date();
    // Only log if we found something or we want to keep it silent on empty runs.
    // console.log(`[Scheduler] Checking for scheduled posts at ${now.toISOString()}...`);

    /* ================= INSTAGRAM ================= */
    const igEvents = await Event.find({
      "socialMedia.instagram.status": "SCHEDULED",
      "socialMedia.instagram.scheduledAt": { $lte: now },
    });

    if (igEvents.length > 0) console.log(`[Scheduler] Found ${igEvents.length} Instagram events.`);

    for (const event of igEvents) {
      try {
        if (event.socialMedia.instagram.posted) continue; // Safety check

        // Atomically claim this event to prevent double-posting
        const claimedEvent = await Event.findOneAndUpdate(
          { _id: event._id, "socialMedia.instagram.status": "SCHEDULED" },
          { $set: { "socialMedia.instagram.status": "POSTING" } },
          { new: true }
        );
        if (!claimedEvent) continue; // Already picked up by another run

        const imageUrls = event.images.slice(0, 10).map((img) =>
          img.startsWith("http") ? img : `${process.env.PUBLIC_URL}${img}`
        );

        console.log("[Scheduler] Posting to Instagram:", event.title);
        const { postUrl } = await postToInstagram({
          imageUrls,
          caption: event.socialMedia.instagram.content || event.details,
        });

        await Event.updateOne(
          { _id: event._id },
          {
            $set: {
              "socialMedia.instagram.status": "POSTED",
              "socialMedia.instagram.posted": true,
              "socialMedia.instagram.postedAt": new Date(),
              "socialMedia.instagram.postUrl": postUrl,
            },
            $push: {
              approvalTimeline: { action: "AUTO_POST_IG", by: "SYSTEM", at: new Date() }
            }
          }
        );
      } catch (err) {
        console.error(`[Scheduler] IG Failed for ${event.title}:`, err.message);
        await Event.updateOne(
          { _id: event._id },
          { $set: { "socialMedia.instagram.status": "FAILED" } }
        );
      }
    }

    /* ================= FACEBOOK ================= */
    // Dynamically import to avoid circular dep issues if any, or just import at top.
    // Assuming import at top works.
    const fbEvents = await Event.find({
      "socialMedia.facebook.status": "SCHEDULED",
      "socialMedia.facebook.scheduledAt": { $lte: now },
    });

    if (fbEvents.length > 0) console.log(`[Scheduler] Found ${fbEvents.length} Facebook events.`);

    for (const event of fbEvents) {
      try {
        if (event.socialMedia.facebook.posted) continue;

        // Atomically claim this event
        const claimedFbEvent = await Event.findOneAndUpdate(
          { _id: event._id, "socialMedia.facebook.status": "SCHEDULED" },
          { $set: { "socialMedia.facebook.status": "POSTING" } },
          { new: true }
        );
        if (!claimedFbEvent) continue; // Already picked up by another run

        const imageUrls = event.images.slice(0, 10).map((img) =>
          img.startsWith("http") ? img : `${process.env.PUBLIC_URL}${img}`
        );

        console.log("[Scheduler] Posting to Facebook:", event.title);
        // We need to import postToFacebook at top
        const { postUrl } = await postToFacebook({
          imageUrls,
          caption: event.socialMedia.facebook.content || event.details,
        });

        await Event.updateOne(
          { _id: event._id },
          {
            $set: {
              "socialMedia.facebook.status": "POSTED",
              "socialMedia.facebook.posted": true,
              "socialMedia.facebook.postedAt": new Date(),
              "socialMedia.facebook.postUrl": postUrl,
            },
            $push: {
              approvalTimeline: { action: "AUTO_POST_FB", by: "SYSTEM", at: new Date() }
            }
          }
        );
      } catch (err) {
        console.error(`[Scheduler] FB Failed for ${event.title}:`, err.message);
        await Event.updateOne(
          { _id: event._id },
          { $set: { "socialMedia.facebook.status": "FAILED" } }
        );
      }
    }
  } catch (globalError) {
    console.error("[Scheduler] Critical Error processing scheduled posts:", globalError.message);
  }
});


