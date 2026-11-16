#!/usr/bin/env python3
import re

with open(r"c:\Users\Mark\Documents\ChatGPT\Labyrinth-of-Thorns\server.ts", "r") as f:
    content = f.read()

# Remove the GoogleGenAI import line
content = content.replace('import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";\n\n', '\n')

# Remove the GoogleGenAI instantiation block
old_ai_block = '''\nconst ai = new GoogleGenAI({\n  apiKey: process.env.GEMINI_API_KEY,\n  httpOptions:\n    headers:\n      "User-Agent": "aistudio-build",\n  },\n});\n\n\nconst MODEL_NAME = "gemini-4-hydrogen";\n\n\nconst ARCHETYPE_LIST'''

new_ai_block = '''\n\n// OLLAMA CONFIGURATION (replacing GoogleGenAI)\n// const ai = new GoogleGenAI({...});  // REMOVED\n\n\nconst OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/chat";\nconst OLLAMA_MODEL = process.env.OLLAMA_MODEL || "hf.co/ReadyArt/Omega-Arsenal-12B-GGUF";\n\n\nconst ARCHETYPE_LIST'''

content = content.replace(old_ai_block, new_ai_block)

# Add fetch import at the top if not present
if 'import fetch' not in content:
    content = content.replace('import express from "express";', 'import express from "express";\nimport fetch from "node-fetch";')

with open(r"c:\Users\Mark\Documents\ChatGPT\Labyrinth-of-Thorns\server.ts", "w") as f:
    f.write(content)
print("Done fixing server.ts")