import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { chatWithAssistant } from "../services/openaiService.js";

const router = express.Router();

router.post("/", authMiddleware, async (req, res) => {
    try {
        const { messages, context } = req.body;
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ message: "Messages array is required" });
        }

        // Pass both the messages array and the context (including the authenticated user)
        const chatContext = {
            user: req.user,
            pathname: context?.pathname || "Unknown Page"
        };

        const reply = await chatWithAssistant(messages, chatContext);
        res.json({ reply });
    } catch (error) {
        console.error("CHAT ERROR:", error);
        res.status(500).json({ message: "Failed to process chat message" });
    }
});

export default router;
