require("dotenv").config();

console.log("OPENROUTER KEY:", process.env.OPENROUTER_API_KEY);

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");

const app = express();

/* ================= MIDDLEWARE ================= */

app.use(cors());
app.use(express.json());

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

/* ================= MONGODB ================= */

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB Error:", err));

/* ================= SCHEMA ================= */

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

/* ================= CHAT ROUTE ================= */

app.post("/chat", async (req, res) => {
  try {
    const { message, userId } = req.body;

    if (!message || !userId) {
      return res.status(400).json({ reply: "Message and userId required." });
    }

    let conversation = await Conversation.findOne({ userId });

    if (!conversation) {
      conversation = new Conversation({
        userId,
        messages: []
      });
    }

    conversation.messages.push({
      role: "user",
      content: message
    });

    const recentMessages = conversation.messages.slice(-10);

    /* ================= REAL-TIME SEARCH ================= */

    let searchResults = "";

    if (process.env.SERPER_API_KEY) {
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

        const results = searchResponse.data?.organic?.slice(0, 3);

        if (results?.length) {
          searchResults = results.map(r =>
            `Title: ${r.title}\nSnippet: ${r.snippet}\nSource: ${r.link}`
          ).join("\n\n");
        }

      } catch (err) {
        console.log("Search skipped:", err.message);
      }
    }

    /* ================= AI CALL ================= */

    const aiResponse = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-4o-mini",  // 🔥 better model
        messages: [
          {
            role: "system",
            content: `
You are AegisAI.
Use real-time search data if provided.
Be accurate, clear, and structured.
Never mention knowledge cutoff.
`
          },
          ...(searchResults
            ? [{ role: "system", content: `REAL-TIME DATA:\n${searchResults}` }]
            : []),
          ...recentMessages
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://aegisai-topaz.vercel.app",
          "X-Title": "AegisAI"
        }
      }
    );

const reply =
      aiResponse.data?.choices?.[0]?.message?.content ||
      "No response from AI.";

    conversation.messages.push({
      role: "assistant",
      content: reply
    });

    await conversation.save();

    res.json({ reply });

  } catch (error) {
    console.error("FULL ERROR:", error.response?.data || error.message);
    res.status(500).json({
      error: error.response?.data || error.message
    });
  }
});

/* ================= HEALTH ================= */

app.get("/", (req, res) => {
  res.send("AegisAI Backend Running");
});

/* ================= START ================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
