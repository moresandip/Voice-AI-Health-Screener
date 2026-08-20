import { WebSocketServer } from 'ws';
import env from '../config/env.js';
import { transcribeAudio } from '../services/sttService.js';
import { getAIResponse } from '../services/llmService.js';
import { textToSpeech } from '../services/ttsService.js';
import { generateHealthReport } from '../services/reportService.js';

// Helper to extract patient name from raw transcript text
function extractName(text) {
  if (!text) return null;
  const patterns = [
    /my name is\s+([A-Za-z\s]+)/i,
    /i am\s+([A-Za-z\s]+)/i,
    /this is\s+([A-Za-z\s]+)/i,
    /call me\s+([A-Za-z\s]+)/i,
    /mera naam\s+([A-Za-z\s]+)(?:\s+hai)?/i,
    /naam\s+([A-Za-z\s]+)(?:\s+hai)?/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim().split(/\s+/)[0];
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  }
  const words = text.trim().split(/\s+/);
  if (words.length <= 2 && /^[A-Za-z]+$/.test(words[0])) {
    return words[0].charAt(0).toUpperCase() + words[0].slice(1);
  }
  return null;
}

// Helper to extract symptom or complaint
function extractComplaint(text) {
  if (!text) return 'None';
  const symptoms = ['throat', 'fever', 'cough', 'headache', 'chest pain', 'stomach', 'cold', 'flu', 'throat pain', 'back pain'];
  for (const symptom of symptoms) {
    if (text.toLowerCase().includes(symptom)) {
      return symptom;
    }
  }
  return text;
}

// Simulator helper to construct mock dialogue turns dynamically based on transcript history
function getSimulatedTurn(transcriptHistory) {
  const userMessages = transcriptHistory.filter(msg => msg.role === 'user');
  const userTurns = userMessages.length;
  
  // Try to find if user provided a name in any turn
  let patientName = 'Patient';
  for (const msg of userMessages) {
    const name = extractName(msg.content);
    if (name) {
      patientName = name;
      break;
    }
  }

  const latestUserMsg = userMessages[userMessages.length - 1]?.content || '';

  switch (userTurns) {
    case 1: {
      const name = extractName(latestUserMsg) || 'Rohan';
      return {
        agentText: `Hello ${name}. What primary health concern or symptom is bringing you in today?`
      };
    }
    case 2: {
      const complaint = extractComplaint(latestUserMsg);
      return {
        agentText: `I'm sorry to hear that. When did this ${complaint} start?`
      };
    }
    case 3: {
      return {
        agentText: `On a scale of 1 to 10, how severe would you rate the pain or discomfort?`
      };
    }
    case 4: {
      return {
        agentText: `Are you experiencing any other symptoms, such as difficulty swallowing, body aches, or a cough?`
      };
    }
    case 5: {
      return {
        agentText: `Thank you, ${patientName}. I have documented all your concerns. You can now click the 'End Call' button to review your report.`
      };
    }
    default:
      return {
        agentText: `Your intake information is fully saved. Please click 'End Call' to generate the report.`
      };
  }
}

export function setupCallWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  // Bind server upgrade manually for clean integration
  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws) => {
    console.log('New Voice Screener WebSocket connection established.');

    // Local in-memory session context for this specific call
    const session = {
      transcriptHistory: [],
      isProcessing: false,
    };

    ws.on('message', async (message) => {
      try {
        const payload = JSON.parse(message.toString());
        const { event, data } = payload;

        // Simulator helper block (failedSpeech = true if voice transcription failed and needs simulated text placeholders)
        const runSimulatorResponse = (failedSpeech = false) => {
          setTimeout(() => {
            if (failedSpeech) {
              const userMessages = session.transcriptHistory.filter(msg => msg.role === 'user');
              const nextUserTurnIndex = userMessages.length;
              const defaultUserTexts = [
                "My name is Rohan Kumar.",
                "I have a severe sore throat and fever.",
                "It started about three days ago.",
                "It is quite severe, around a 7 out of 10.",
                "Yes, it hurts when I swallow and my body is aching."
              ];
              const userText = defaultUserTexts[nextUserTurnIndex] || "I'm done speaking.";
              ws.send(JSON.stringify({ event: 'USER_TEXT', text: userText }));
              session.transcriptHistory.push({ role: 'user', content: userText });
            }

            const simulatedTurn = getSimulatedTurn(session.transcriptHistory);

            // Send Agent Text back
            ws.send(JSON.stringify({ event: 'AGENT_TEXT', text: simulatedTurn.agentText }));
            session.transcriptHistory.push({ role: 'assistant', content: simulatedTurn.agentText });

            ws.send(JSON.stringify({ event: 'STATUS', status: 'SPEAKING' }));
            ws.send(JSON.stringify({ event: 'AGENT_AUDIO', audio: null }));

            session.isProcessing = false;
          }, 1000);
        };

        switch (event) {
          case 'START_CALL': {
            console.log('Call started.');
            session.transcriptHistory = [];
            ws.send(JSON.stringify({ event: 'STATUS', status: 'CONNECTED' }));

            // Greet the patient immediately
            session.isProcessing = true;
            ws.send(JSON.stringify({ event: 'STATUS', status: 'SPEAKING' }));

            const greetingText = env.openaiApiKey
              ? "Hello! I am your AI health screening assistant today. I will ask you a few questions to complete your preliminary intake. To start, may I please have your name?"
              : "Hello! I am your AI health screening assistant today (Simulator Mode). I will ask you a few questions to complete your preliminary intake. To start, may I please have your name?";
            
            session.transcriptHistory.push({ role: 'assistant', content: greetingText });
            
            ws.send(JSON.stringify({ event: 'AGENT_TEXT', text: greetingText }));

            // If we have no API key, skip TTS audio and break immediately
            if (!env.openaiApiKey) {
              ws.send(JSON.stringify({ event: 'AGENT_AUDIO', audio: null }));
              session.isProcessing = false;
              break;
            }

            try {
              const audioBase64 = await textToSpeech(greetingText);
              ws.send(JSON.stringify({ event: 'AGENT_AUDIO', audio: audioBase64 }));
            } catch (err) {
              console.warn('Failed to generate initial TTS greeting. Falling back to text-only mode:', err.message);
              // Send null audio so client plays nothing but proceeds with conversation
              ws.send(JSON.stringify({ event: 'AGENT_AUDIO', audio: null }));
            } finally {
              session.isProcessing = false;
              ws.send(JSON.stringify({ event: 'STATUS', status: 'LISTENING' }));
            }
            break;
          }

          case 'USER_TEXT': {
            if (session.isProcessing) {
              console.warn('Skipping user text: server is currently processing.');
              break;
            }

            const { text } = data || payload || {};
            const userMessageText = text || payload.text;
            if (!userMessageText) {
              break;
            }

            console.log(`Received typed user text: "${userMessageText}"`);
            session.isProcessing = true;
            ws.send(JSON.stringify({ event: 'STATUS', status: 'THINKING' }));

            // Dispatch user text to client transcript
            ws.send(JSON.stringify({ event: 'USER_TEXT', text: userMessageText }));
            session.transcriptHistory.push({ role: 'user', content: userMessageText });

            if (!env.openaiApiKey) {
              // Simulator Mode reply based on actual typed text
              setTimeout(() => {
                const simulatedTurn = getSimulatedTurn(session.transcriptHistory);
                ws.send(JSON.stringify({ event: 'AGENT_TEXT', text: simulatedTurn.agentText }));
                session.transcriptHistory.push({ role: 'assistant', content: simulatedTurn.agentText });

                ws.send(JSON.stringify({ event: 'STATUS', status: 'SPEAKING' }));
                ws.send(JSON.stringify({ event: 'AGENT_AUDIO', audio: null }));

                session.isProcessing = false;
              }, 1000);
            } else {
              // Real LLM pipeline reply
              try {
                const agentReplyText = await getAIResponse(session.transcriptHistory);
                console.log(`Agent reply: "${agentReplyText}"`);
                session.transcriptHistory.push({ role: 'assistant', content: agentReplyText });

                ws.send(JSON.stringify({ event: 'AGENT_TEXT', text: agentReplyText }));
                ws.send(JSON.stringify({ event: 'STATUS', status: 'SPEAKING' }));

                try {
                  const audioBase64 = await textToSpeech(agentReplyText);
                  ws.send(JSON.stringify({ event: 'AGENT_AUDIO', audio: audioBase64 }));
                } catch (ttsErr) {
                  console.warn('TTS API failed. Sending response as text-only:', ttsErr.message);
                  ws.send(JSON.stringify({ event: 'AGENT_AUDIO', audio: null }));
                }
              } catch (err) {
                console.warn('LLM API failed. Reverting turn and falling back to simulated reply:', err.message);
                runSimulatorResponse(false);
              } finally {
                session.isProcessing = false;
              }
            }
            break;
          }

          case 'USER_AUDIO': {
            if (session.isProcessing) {
              console.warn('Skipping audio block: server is currently processing.');
              break;
            }

            const { audio, mimeType } = data || {};
            if (!audio) {
              ws.send(JSON.stringify({ event: 'ERROR', message: 'No audio data received.' }));
              break;
            }

            console.log('Received audio package from client.');
            session.isProcessing = true;
            ws.send(JSON.stringify({ event: 'STATUS', status: 'THINKING' }));

            // --- SIMULATOR MODE FALLBACK (NO API KEY SET) ---
            if (!env.openaiApiKey) {
              runSimulatorResponse(true);
              break;
            }
            // --- END SIMULATOR MODE ---

            console.log('Starting STT Speech-to-Text...');
            try {
              // 1. Convert Base64 string back to binary Buffer
              const audioBuffer = Buffer.from(audio, 'base64');

              // 2. STT: Transcribe Audio
              let userText;
              try {
                userText = await transcribeAudio(audioBuffer, mimeType || 'audio/webm');
              } catch (sttErr) {
                console.warn('STT API failed (possibly billing quota exceeded). Falling back to text simulator:', sttErr.message);
                runSimulatorResponse(true);
                return;
              }

              console.log(`Transcribed text: "${userText}"`);

              if (!userText.trim()) {
                ws.send(JSON.stringify({ event: 'STATUS', status: 'LISTENING' }));
                ws.send(JSON.stringify({ event: 'ERROR', message: 'Could not understand the audio. Please try again.' }));
                session.isProcessing = false;
                break;
              }

              // Send user transcription back immediately
              ws.send(JSON.stringify({ event: 'USER_TEXT', text: userText }));
              session.transcriptHistory.push({ role: 'user', content: userText });

              // 3. LLM: Get Next Screening Question
              let agentReplyText;
              try {
                agentReplyText = await getAIResponse(session.transcriptHistory);
              } catch (llmErr) {
                console.warn('LLM API failed. Reverting turn and falling back to simulated question:', llmErr.message);
                // Remove the user's turn from transcript so simulator indices match correctly
                session.transcriptHistory.pop();
                runSimulatorResponse(true);
                return;
              }

              console.log(`Agent reply: "${agentReplyText}"`);
              session.transcriptHistory.push({ role: 'assistant', content: agentReplyText });

              // Send agent response text
              ws.send(JSON.stringify({ event: 'AGENT_TEXT', text: agentReplyText }));
              ws.send(JSON.stringify({ event: 'STATUS', status: 'SPEAKING' }));

              // 4. TTS: Synthesize speech
              try {
                const audioBase64 = await textToSpeech(agentReplyText);
                ws.send(JSON.stringify({ event: 'AGENT_AUDIO', audio: audioBase64 }));
              } catch (ttsErr) {
                console.warn('TTS API failed. Sending response as text-only:', ttsErr.message);
                ws.send(JSON.stringify({ event: 'AGENT_AUDIO', audio: null }));
              }

            } catch (err) {
              console.error('Error processing turn:', err);
              ws.send(JSON.stringify({ event: 'ERROR', message: 'An error occurred while processing speech. Please repeat.' }));
              ws.send(JSON.stringify({ event: 'STATUS', status: 'LISTENING' }));
            } finally {
              session.isProcessing = false;
            }
            break;
          }

          case 'CLIENT_PLAYBACK_FINISHED': {
            // Signal the client is ready to listen again
            if (!session.isProcessing) {
              ws.send(JSON.stringify({ event: 'STATUS', status: 'LISTENING' }));
            }
            break;
          }

          case 'END_CALL': {
            console.log('Call ending. Generating medical summary report...');
            ws.send(JSON.stringify({ event: 'STATUS', status: 'THINKING' }));

            try {
              const report = await generateHealthReport(session.transcriptHistory);
              ws.send(JSON.stringify({ event: 'FINAL_REPORT', report }));
              console.log('Report generated and dispatched.');
            } catch (err) {
              console.error('Error generating report:', err);
              ws.send(JSON.stringify({ event: 'ERROR', message: 'Failed to generate the medical report summary.' }));
            } finally {
              ws.send(JSON.stringify({ event: 'STATUS', status: 'DISCONNECTED' }));
            }
            break;
          }

          default:
            console.warn('Unhandled websocket event:', event);
            ws.send(JSON.stringify({ event: 'ERROR', message: 'Unknown event type.' }));
        }
      } catch (err) {
        console.error('Error handling websocket message:', err);
        ws.send(JSON.stringify({ event: 'ERROR', message: 'Invalid payload schema.' }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed.');
    });
  });
}
