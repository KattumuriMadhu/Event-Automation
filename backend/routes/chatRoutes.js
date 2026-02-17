import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { chatWithAssistant } from "../services/openaiService.js";

const router = express.Router();

router.post("/", authMiddleware, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ message: "Message is required" });
        }

        const reply = await chatWithAssistant(message);
        res.json({ reply });
    } catch (error) {
        console.error("CHAT ERROR:", error);
        res.status(500).json({ message: "Failed to process chat message" });
    }
});

export default router;
