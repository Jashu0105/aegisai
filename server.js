require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");

const app = express();

/* =========================
   Middlewares
========================= */

app.use(cors({
  origin: true,   // allow all origins (safe for now)
  methods: ["GET", "POST"]
}));

app.use(express.json());

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

/* =========================
   MongoDB Connection
========================= */

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB Error:", err));


/* =========================
   Conversation Schema
========================= */

const conversationSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  messages: [
    {
      role: String,
      content: String,
      timestamp: { type: Date, default: Date.now }
    }
  ]
});

const Conversation = mongoose.model("Conversation", conversationSchema);

/* =========================
   Chat Route
========================= */

app.post("/chat", async (req, res) => {
  try {
    const { message, userId } = req.body;

    if (!message || !userId) {
      return res.status(400).json({ reply: "Message and userId required." });
    }

    // 🔹 Get or create conversation
    let conversation = await Conversation.findOne({ userId });

    if (!conversation) {
      conversation = new Conversation({
        userId,
        messages: []
      });
    }

    // 🔹 Store RAW user message (IMPORTANT FIX)
    conversation.messages.push({
      role: "user",
      content: message
    });

    // Keep only last 10 messages for context
    const recentMessages = conversation.messages.slice(-10);

    /* =========================
       Real-Time Search (Optional)
    ========================= */

    let searchResults = null;

    try {
      const searchResponse = await axios.post(
        "https://google.serper.dev/search",
        { q: message },
        {
          headers: {
            "X-API-KEY": process.env.SERPER_API_KEY,
            "Content-Type": "application/json"
          }
        }
      );

      const results = searchResponse.data.organic?.slice(0, 3);

      if (results?.length) {
        searchResults = results.map(r =>
          `Title: ${r.title}
Snippet: ${r.snippet}
Source: ${r.link}`
        ).join("\n\n");
      }

    } catch (_) {
      // Search optional — fail silently
    }

    /* =========================
       Prepare AI Messages
    ========================= */

    const aiMessages = [
      {
        role: "system",
        content: `
You are AegisAI.

Rules:
- If real-time search data is provided, use it.
- Never mention knowledge cutoff dates.
- Provide structured and clear answers.
- Remember user information from previous messages.
`
      },
      ...recentMessages
    ];

    // Inject search results as SYSTEM (not stored in DB)
    if (searchResults) {
      aiMessages.push({
        role: "system",
        content: `REAL-TIME SEARCH DATA:\n${searchResults}`
      });
    }

    /* =========================
       Call OpenRouter
    ========================= */

    const aiResponse = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "meta-llama/llama-3.1-70b-instruct",
        messages: aiMessages
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply =
      aiResponse.data.choices?.[0]?.message?.content ||
      "No response from AI.";

    // 🔹 Store assistant reply cleanly
    conversation.messages.push({
      role: "assistant",
      content: reply
    });

    await conversation.save();

    res.json({ reply });

  } catch (error) {
    res.status(500).json({ reply: "AI service error." });
  }
});

/* =========================
   Health Check
========================= */

app.get("/", (req, res) => {
  res.send("AegisAI Backend Running");
});

/* =========================
   Start Server
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT);
