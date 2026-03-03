import mongoose from "mongoose";
import Event from "./models/Event.js";
import dotenv from "dotenv";
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const fbEvents = await Event.find({ "socialMedia.facebook.status": "SCHEDULED" });
  console.log("Scheduled FB Events:", fbEvents.length);
  for (let e of fbEvents) {
    console.log(`- ${e.title} | ${e.socialMedia.facebook.status} | ${e.socialMedia.facebook.scheduledAt}`);
  }
  mongoose.connection.close();
});
