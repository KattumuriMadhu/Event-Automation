import express from "express";
import { postToInstagram } from "../services/postToInstagram.js";

const router = express.Router();

/**
 * POST MULTIPLE IMAGES TO INSTAGRAM
 * POST /api/instagram/post
 */
router.post("/post", async (req, res) => {
  try {
    const { imageUrls, caption } = req.body;

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return res.status(400).json({
        message: "imageUrls array is required",
      });
    }

    if (imageUrls.length > 10) {
      return res.status(400).json({
        message: "Instagram allows max 10 images per post",
      });
    }

    await postToInstagram({ imageUrls, caption });

    res.json({
      success: true,
      message: "✅ Carousel posted to Instagram successfully",
    });
  } catch (err) {
    console.error("Instagram Carousel Error:", err.response?.data || err.message);
    res.status(500).json({
      message: "Instagram carousel post failed",
      error: err.response?.data || err.message,
    });
  }
});

export default router;
