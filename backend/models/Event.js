import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: String,
    type: String,
    details: String,
    department: String,
    date: Date,
    audience: String,
    resourcePerson: String,
    images: [String],

    approvalStatus: {
      type: String,
      enum: ["DRAFT", "SENT", "APPROVED", "REJECTED"],
      default: "DRAFT",
    },

    approvalTimeline: [
      {
        action: String,
        by: String,
        at: { type: Date, default: Date.now },
        reason: String,
      },
    ],

    rejectedReason: { type: String, default: "" },
    approvedAt: Date,
    rejectedAt: Date,

    /* ✅ SINGLE SOURCE OF TRUTH */
    socialMedia: {
      instagram: {
        content: { type: String, default: "" },

        posted: { type: Boolean, default: false },
        postedAt: Date,

        scheduledAt: Date,

        status: {
          type: String,
          enum: ["DRAFT", "SCHEDULED", "POSTED", "FAILED"],
          default: "DRAFT",
        },

        postUrl: String,
      },

      facebook: {
        content: { type: String, default: "" },

        posted: { type: Boolean, default: false },
        postedAt: Date,

        scheduledAt: Date,

        status: {
          type: String,
          enum: ["DRAFT", "SCHEDULED", "POSTED", "FAILED"],
          default: "DRAFT",
        },

        postUrl: String,
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Event", eventSchema);
