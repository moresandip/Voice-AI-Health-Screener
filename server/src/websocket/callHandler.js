import { WebSocketServer } from 'ws';
import env from '../config/env.js';
import { transcribeAudio } from '../services/sttService.js';
import { getAIResponse } from '../services/llmService.js';
import { textToSpeech } from '../services/ttsService.js';
import { generateHealthReport } from '../services/reportService.js';

// Simulator helper to construct mock dialogue turns when no API key is present or quota is exceeded
function getSimulatedTurn(transcriptHistory) {
  const userTurns = transcriptHistory.filter(msg => msg.role === 'user').length;
  
  switch (userTurns) {
    case 0:
      return {
        userText: "My name is Rohan Kumar.",
        agentText: "Hello Rohan. What primary health concern or symptom is bringing you in today?"
      };
    case 1:
      return {
        userText: "I have had a severe sore throat and fever.",
        agentText: "I'm sorry to hear that Rohan. When did this sore throat and fever start?"
      };
    case 2:
      return {
        userText: "It started about three days ago.",
        agentText: "On a scale of 1 to 10, how severe would you rate the pain in your throat?"
      };
    case 3:
      return {
        userText: "It is quite severe, around a 7 out of 10.",
        agentText: "Are you experiencing any other symptoms, such as difficulty swallowing, body aches, or a cough?"
      };
    case 4:
      return {
        userText: "Yes, it hurts when I swallow and my body is aching.",
        agentText: "Thank you, Rohan. I have documented all your concerns. You can now click the 'End Call' button to review your report."
      };
    default:
      return {
        userText: "I'm done speaking.",
        agentText: "Your intake information is fully saved. Please click 'End Call' to generate the report."
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

            // Simulator helper block
            const runSimulatorResponse = () => {
              setTimeout(() => {
                const simulatedTurn = getSimulatedTurn(session.transcriptHistory);
                
                // Send User Text back
                ws.send(JSON.stringify({ event: 'USER_TEXT', text: simulatedTurn.userText }));
                session.transcriptHistory.push({ role: 'user', content: simulatedTurn.userText });

                // Send Agent Text back
                ws.send(JSON.stringify({ event: 'AGENT_TEXT', text: simulatedTurn.agentText }));
                session.transcriptHistory.push({ role: 'assistant', content: simulatedTurn.agentText });

                ws.send(JSON.stringify({ event: 'STATUS', status: 'SPEAKING' }));
                ws.send(JSON.stringify({ event: 'AGENT_AUDIO', audio: null }));

                session.isProcessing = false;
              }, 1000);
            };

            // --- SIMULATOR MODE FALLBACK (NO API KEY SET) ---
            if (!env.openaiApiKey) {
              runSimulatorResponse();
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
                runSimulatorResponse();
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
                runSimulatorResponse();
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
