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

    } catch (_) {}

    const aiMessages = [
      {
        role: "system",
        content: `
You are AegisAI.
Use real-time data if provided.
Be clear, structured, and professional.
Never mention knowledge cutoff.
`
      },
      ...recentMessages
    ];

    if (searchResults) {
      aiMessages.push({
        role: "system",
        content: `REAL-TIME SEARCH DATA:\n${searchResults}`
      });
    }

    const aiResponse = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-3.5-turbo",   // ✅ safer & cheaper model
        messages: aiMessages
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://aegisai-backend-ifvc.onrender.com",
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
    console.error("AI ERROR:", error.response?.data || error.message);
    res.status(500).json({ reply: "AI service error." });
  }
});
