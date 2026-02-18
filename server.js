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
/* ================= USER SCHEMA ================= */

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const User = mongoose.model("User", userSchema);
/* ================= JWT VERIFY ================= */

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access denied" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token" });

    req.user = user;
    next();
  });
}

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

app.post("/chat", authenticateToken, async (req, res) => {

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
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/* ================= REGISTER ================= */

app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      email,
      password: hashedPassword
    });

    await newUser.save();

    res.json({ message: "User registered successfully" });

  } catch (error) {
    res.status(500).json({ message: "Registration error" });
  }
});

/* ================= LOGIN ================= */

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });

  } catch (error) {
    res.status(500).json({ message: "Login error" });
  }
});

/* ================= START ================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
