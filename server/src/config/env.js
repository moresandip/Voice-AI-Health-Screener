import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Support ES modules __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables from server root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  port: process.env.PORT || 5000,
  openaiApiKey: process.env.OPENAI_API_KEY,
  deepgramApiKey: process.env.DEEPGRAM_API_KEY, // Optional: for lower latency STT/TTS if available
  elevenlabsApiKey: process.env.ELEVENLABS_API_KEY, // Optional: for ElevenLabs TTS if available
};

// Simple human-readable validation
if (!config.openaiApiKey) {
  console.warn('WARNING: OPENAI_API_KEY is not defined in the environment. The voice screener needs an OpenAI key to run Whisper, GPT-4, and TTS.');
}

export default config;
