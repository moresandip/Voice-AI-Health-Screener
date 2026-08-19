import { useState, useEffect, useRef } from 'react';

const WEBSOCKET_URL = 'ws://localhost:5000';

export function useWebSocket() {
  const [status, setStatus] = useState('IDLE'); // IDLE, CONNECTING, LISTENING, THINKING, SPEAKING, DISCONNECTED
  const [transcript, setTranscript] = useState([]);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const socketRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const currentAudioRef = useRef(null);

  // Play next audio snippet in queue sequentially
  const playNextAudio = () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      currentAudioRef.current = null;
      
      // Notify server we finished playing so it turns on mic/updates status
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ event: 'CLIENT_PLAYBACK_FINISHED' }));
      }
      return;
    }

    isPlayingRef.current = true;
    const audioUrl = audioQueueRef.current.shift();
    const audio = new Audio(audioUrl);
    currentAudioRef.current = audio;

    // Transition status to speaking while talking
    setStatus('SPEAKING');

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      playNextAudio();
    };

    audio.onerror = (e) => {
      console.error('Audio element playback error:', e);
      URL.revokeObjectURL(audioUrl);
      playNextAudio();
    };

    audio.play().catch((err) => {
      console.warn('Audio play request blocked or interrupted:', err);
      // Auto-recover by playing next
      playNextAudio();
    });
  };

  // Convert Base64 encoded sound block into blob URL and queue it
  const enqueueAudio = (base64Audio) => {
    try {
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      
      audioQueueRef.current.push(url);

      if (!isPlayingRef.current) {
        playNextAudio();
      }
    } catch (err) {
      console.error('Failed to decode incoming audio package:', err);
    }
  };

  const startCall = () => {
    setError(null);
    setReport(null);
    setTranscript([]);
    setStatus('CONNECTING');

    // Establish WebSocket Connection
    const ws = new WebSocket(WEBSOCKET_URL);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('WS Connection established, starting session...');
      ws.send(JSON.stringify({ event: 'START_CALL' }));
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { event: serverEvent, status: serverStatus, text, audio, report: finalReport, message } = payload;

        switch (serverEvent) {
          case 'STATUS':
            // Only update status if it is not overridden by local playing state
            if (serverStatus === 'LISTENING' && isPlayingRef.current) {
              // Wait until playback is finished to set status to listening
              break;
            }
            setStatus(serverStatus);
            break;

          case 'USER_TEXT':
            setTranscript((prev) => [...prev, { role: 'user', content: text }]);
            break;

          case 'AGENT_TEXT':
            setTranscript((prev) => [...prev, { role: 'assistant', content: text }]);
            break;

          case 'AGENT_AUDIO':
            if (!audio) {
              // Immediately notify server that playback is finished when no audio is sent (Simulator Mode fallback)
              if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({ event: 'CLIENT_PLAYBACK_FINISHED' }));
              }
              break;
            }
            enqueueAudio(audio);
            break;

          case 'FINAL_REPORT':
            setReport(finalReport);
            break;

          case 'ERROR':
            console.error('Server error received:', message);
            setError(message);
            break;

          default:
            console.warn('Unknown event received from backend:', serverEvent);
        }
      } catch (err) {
        console.error('Error handling server WebSocket payload:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket connection error:', err);
      setError('Could not connect to the voice server.');
      setStatus('DISCONNECTED');
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed.');
      setStatus('DISCONNECTED');
    };
  };

  const endCall = () => {
    // Stop any active playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ event: 'END_CALL' }));
    } else {
      setStatus('DISCONNECTED');
    }
  };

  const sendAudio = (base64Audio, mimeType) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        event: 'USER_AUDIO',
        data: {
          audio: base64Audio,
          mimeType
        }
      }));
    } else {
      console.error('Cannot send audio: WebSocket is closed.');
    }
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
      audioQueueRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  return {
    status,
    transcript,
    report,
    error,
    startCall,
    endCall,
    sendAudio
  };
}
