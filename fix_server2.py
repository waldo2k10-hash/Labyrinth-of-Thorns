#!/usr/bin/env python3
with open(r"c:\Users\Mark\Documents\ChatGPT\Labyrinth-of-Thorns\server.ts", "r") as f:
    c = f.read()

old = """app.post("/api/game/init-session", async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({
          error: "GEMINI_API_KEY is not configured in environment secrets.",
        });
        return;
      }
      const {"""

new = """app.post("/api/game/init-session", async (req, res) => {
    try {
      // Using local Ollama instance - no API key required
      const {"""

c = c.replace(old, new)

with open(r"c:\Users\Mark\Documents\ChatGPT\Labyrinth-of-Thorns\server.ts", "w") as f:
    f.write(c)
print("Done replacing GEMINI_API_KEY check")