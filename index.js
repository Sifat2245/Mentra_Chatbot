import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());

app.get("/", (req, res) => res.send("OK"));

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  socket.on("userMessage", async (msg) => {
    console.log("👤 User:", msg);
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a friendly AI Fitness Coach. Give short, clear, motivational answers." },
            { role: "user", content: msg },
          ],
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("❌ OpenRouter non-OK:", response.status, text);
        socket.emit("aiMessage", "⚠️ AI request failed.");
        return;
      }

      const data = await response.json();
      console.log("🔍 OpenRouter response:", JSON.stringify(data, null, 2));
      const aiReply = data?.choices?.[0]?.message?.content || "⚠️ Sorry, I couldn’t generate a reply.";
      socket.emit("aiMessage", aiReply);
    } catch (err) {
      console.error("AI error:", err);
      socket.emit("aiMessage", "⚠️ Something went wrong. Try again.");
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// Use Render's PORT env var
const PORT = process.env.PORT || process.env.SOCKET_PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Socket.io server running on port ${PORT}`));
