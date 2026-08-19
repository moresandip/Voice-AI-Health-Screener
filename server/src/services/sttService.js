import { OpenAI, toFile } from 'openai';
import env from '../config/env.js';

let openaiClient = null;

function getOpenAIClient() {
  if (!openaiClient && env.openaiApiKey) {
    openaiClient = new OpenAI({ apiKey: env.openaiApiKey });
  }
  return openaiClient;
}

/**
 * Transcribes an audio buffer to text using OpenAI Whisper API.
 * Supports English, Hindi, and multi-lingual conversations.
 * @param {Buffer} audioBuffer - The audio buffer from the client
 * @param {string} mimeType - The mime type of the audio (e.g. audio/webm or audio/wav)
 * @returns {Promise<string>} - Transcribed text
 */
export async function transcribeAudio(audioBuffer, mimeType = 'audio/webm') {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error('OpenAI client not initialized. Check your API key.');
  }

  try {
    // Determine extension from mimeType
    const extension = mimeType.includes('wav') ? 'wav' : 'webm';
    const filename = `speech.${extension}`;

    // Convert Buffer to File object using OpenAI utility helper
    const file = await toFile(audioBuffer, filename, { type: mimeType });

    // Call Whisper API
    const response = await client.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      // Optionally provide Hindi/English hint prompt to guide spelling & names
      prompt: 'Please transcribe the patient speaking. They may speak in English or Hindi (hinglish).',
    });

    return response.text || '';
  } catch (error) {
    console.error('STT Transcription error:', error);
    throw error;
  }
}
