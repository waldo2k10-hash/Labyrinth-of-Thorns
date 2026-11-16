import requests
import threading
import json

class AI_Manager:
    def __init__(self):
        self.url = "http://localhost:11434/api/chat"
        self.model = "hf.co/ReadyArt/Omega-Arsenal-12B-GGUF"
        self.current_response = ""
        self.is_thinking = False
        self.system_prompt = (
            "You are the Narrator and NPC engine for 'Labyrinth of Thorns: The Euphoric Void'. "
            "Your tone is liminal, psychological, atmospheric, and uncensored. "
            "You describe the world through the lens of the player's mental state: "
            "Tether (Reality), Ego (Selfhood), and Intoxication. "
            "Low Tether = world fractures and glitches. High Intoxication = seductive, hazy, surreal. "
            "Keep responses evocative but concise enough for a game dialogue box."
        )

    def get_ai_response(self, player_input, player_stats):
        self.is_thinking = True
        self.current_response = "..."
        
        # Create a context string from the player's psychological state
        stats_context = (
            f"[Player State: Tether {player_stats['tether']}/100, "
            f"Ego {player_stats['ego']}/100, Intoxication {player_stats['intoxication']}/100]"
        )
        
        full_prompt = f"{stats_context}\nPlayer says: {player_input}"
        
        # Run the request in a separate thread to prevent Pygame from freezing
        thread = threading.Thread(target=self._fetch_from_ollama, args=(full_prompt,))
        thread.start()

    def _fetch_from_ollama(self, prompt):
        try:
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "stream": False
            }
            response = requests.post(self.url, json=payload, timeout=30)
            if response.status_code == 200:
                result = response.json()
                self.current_response = result['message']['content']
            else:
                self.current_response = "The void remains silent... (API Error)"
        except Exception as e:
            self.current_response = f"Connection lost to the void... ({str(e)})"
        finally:
            self.is_thinking = False