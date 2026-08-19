import { OpenAI } from 'openai';
import env from '../config/env.js';

let openaiClient = null;

function getOpenAIClient() {
  if (!openaiClient && env.openaiApiKey) {
    openaiClient = new OpenAI({ apiKey: env.openaiApiKey });
  }
  return openaiClient;
}

/**
 * Converts text into base64 encoded speech audio.
 * @param {string} text - The input text to convert to speech.
 * @returns {Promise<string>} - Base64 encoded audio string
 */
export async function textToSpeech(text) {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error('OpenAI client not initialized. Check your API key.');
  }

  try {
    const response = await client.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy', // Alloy is warm and professional for medical settings
      input: text,
      response_format: 'mp3',
    });

    // Convert response buffer to base64
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString('base64');
  } catch (error) {
    console.error('TTS synthesis error:', error);
    throw error;
  }
}
