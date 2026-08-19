import { OpenAI } from 'openai';
import env from '../config/env.js';

let openaiClient = null;

function getOpenAIClient() {
  if (!openaiClient && env.openaiApiKey) {
    openaiClient = new OpenAI({ apiKey: env.openaiApiKey });
  }
  return openaiClient;
}

// Empathy-driven, sequential screening prompt as per assignment specification
export const INTAKE_SYSTEM_PROMPT = `
You are an empathetic medical intake voice assistant conducting a preliminary health screening.
Your goal is to collect the following information efficiently and gently:
1. Patient's Name
2. Primary Symptom / Chief Complaint
3. Onset and Duration (When did it start?)
4. Severity rating (1 to 10 or qualitative description)
5. Any secondary or associated symptoms

RULES:
- Ask only ONE question at a time.
- Keep responses concise (maximum 1-2 short sentences) since your output will be converted to speech.
- Be supportive, empathetic, and professional.
- If the user's response is vague, ask a brief clarifying follow-up.
- Speak in simple language, avoiding overly complex clinical terminology.
- You can communicate in English, Hindi, or a mix of both (Hinglish) depending on the language used by the user. If they speak in Hindi, respond in Hindi. If they speak in English, respond in English.
- Do not make medical diagnoses. Make it clear this is a preliminary intake screening.
`;

/**
 * Sends conversation history to OpenAI GPT-4o-mini and returns the response text.
 * @param {Array} transcriptHistory - The conversational messages history (array of { role, content })
 * @returns {Promise<string>} - The assistant's reply text
 */
export async function getAIResponse(transcriptHistory) {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error('OpenAI client not initialized. Check your API key.');
  }

  try {
    // Prepends the system prompt to guide the model's behavior
    const messages = [
      { role: 'system', content: INTAKE_SYSTEM_PROMPT },
      ...transcriptHistory
    ];

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.7,
      max_tokens: 150,
    });

    return response.choices[0].message.content || 'I apologize, but I did not understand that. Could you repeat it?';
  } catch (error) {
    console.error('LLM Orchestrator error:', error);
    throw error;
  }
}
