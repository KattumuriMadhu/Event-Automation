import cron from "node-cron";
import Event from "../models/Event.js";
import { postToInstagram } from "../services/postToInstagram.js";
import { postToFacebook } from "../services/postToFacebook.js";

cron.schedule("* * * * *", async () => {
  const now = new Date();
  console.log(`[Scheduler] Checking for scheduled posts at ${now.toISOString()}...`);

  /* ================= INSTAGRAM ================= */
  const igEvents = await Event.find({
    "socialMedia.instagram.status": "SCHEDULED",
    "socialMedia.instagram.scheduledAt": { $lte: now },
  });

  if (igEvents.length > 0) console.log(`[Scheduler] Found ${igEvents.length} Instagram events.`);

  for (const event of igEvents) {
    try {
      if (event.socialMedia.instagram.posted) continue; // Safety check

      const imageUrls = event.images.slice(0, 10).map((img) =>
        img.startsWith("http") ? img : `${process.env.PUBLIC_URL}${img}`
      );

      console.log("[Scheduler] Posting to Instagram:", event.title);
      const { postUrl } = await postToInstagram({
        imageUrls,
        caption: event.socialMedia.instagram.content || event.details,
      });

      event.socialMedia.instagram.status = "POSTED";
      event.socialMedia.instagram.posted = true;
      event.socialMedia.instagram.postedAt = new Date();
      event.socialMedia.instagram.postUrl = postUrl;

      event.approvalTimeline.push({ action: "AUTO_POST_IG", by: "SYSTEM", at: new Date() });
      await event.save();
    } catch (err) {
      console.error(`[Scheduler] IG Failed for ${event.title}:`, err.message);
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

      const imageUrls = event.images.slice(0, 10).map((img) =>
        img.startsWith("http") ? img : `${process.env.PUBLIC_URL}${img}`
      );

      console.log("[Scheduler] Posting to Facebook:", event.title);
      // We need to import postToFacebook at top
      const { postUrl } = await postToFacebook({
        imageUrls,
        caption: event.socialMedia.facebook.content || event.details,
      });

      event.socialMedia.facebook.status = "POSTED";
      event.socialMedia.facebook.posted = true;
      event.socialMedia.facebook.postedAt = new Date();
      event.socialMedia.facebook.postUrl = postUrl;

      event.approvalTimeline.push({ action: "AUTO_POST_FB", by: "SYSTEM", at: new Date() });
      await event.save();
    } catch (err) {
      console.error(`[Scheduler] FB Failed for ${event.title}:`, err.message);
    }
  }
});
