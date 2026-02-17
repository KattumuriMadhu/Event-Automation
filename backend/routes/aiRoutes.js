import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { generateSocialContent, suggestPostingTime } from "../services/openaiService.js";

const router = express.Router();

router.post("/generate", authMiddleware, async (req, res) => {
  try {
    const text = await generateSocialContent(req.body);

    res.json({
      instagram: text,   // ✅ frontend expects this
      hashtags: [],      // ✅ keep safe even if empty
    });
  } catch (err) {
    console.error("AI ERROR:", err);
    res.status(500).json({ message: "AI generation failed" });
  }
});

router.post("/suggest-time", authMiddleware, async (req, res) => {
  try {
    const suggestion = await suggestPostingTime(req.body);
    res.json(suggestion);
  } catch (err) {
    console.error("AI TIME ERROR:", err);
    res.status(500).json({ message: "Failed to suggest time" });
  }
});

export default router;
