import { useState, useRef, useEffect } from 'react';

export function useAudioRecorder(onAudioReady) {
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    chunksRef.current = [];
    setVolume(0);

    try {
      // 1. Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 2. Initialize MediaRecorder (use audio/webm for standard compressions)
      let options = { mimeType: 'audio/webm' };
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/ogg' }; // fallback
        if (!MediaRecorder.isTypeSupported('audio/ogg')) {
          options = { mimeType: '' }; // fallback to default
        }
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        try {
          const mimeType = recorder.mimeType || 'audio/webm';
          const blob = new Blob(chunksRef.current, { type: mimeType });
          
          if (blob.size === 0) return;

          // Convert Blob to Base64 to transfer via WebSockets JSON payload
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            const base64Data = reader.result.split(',')[1];
            if (onAudioReady) {
              onAudioReady(base64Data, mimeType);
            }
          };
        } catch (err) {
          console.error('Error packaging recorded audio:', err);
        }
      };

      // Start recording
      recorder.start();
      setIsRecording(true);

      // 3. Audio Context volume analyser for live visualization
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128; // Small fftSize for simple volume level check
        source.connect(analyser);
        analyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const drawVolume = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);

          // Get mean amplitude value
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;

          // Normalize and scale to 0-100 range
          const scaledVolume = Math.min(100, Math.round((average / 255) * 150));
          setVolume(scaledVolume);

          animationFrameRef.current = requestAnimationFrame(drawVolume);
        };

        animationFrameRef.current = requestAnimationFrame(drawVolume);
      }
    } catch (err) {
      console.error('Error requesting microphone permissions:', err);
      alert('Could not access microphone. Please check system permissions.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    // Stop recording engine
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);

    // Stop all media tracks (turns off microphone hardware light)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Stop audio node visualizers
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setVolume(0);
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    isRecording,
    volume,
    startRecording,
    stopRecording,
  };
}
