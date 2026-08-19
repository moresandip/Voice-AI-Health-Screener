import React from 'react';

export function CallControls({
  status,
  isRecording,
  volume,
  startCall,
  endCall,
  startRecording,
  stopRecording
}) {
  const isCallActive = status !== 'IDLE' && status !== 'DISCONNECTED';

  // Helper to determine the behavior of the center circular button
  const getMicrophoneButtonState = () => {
    if (!isCallActive) return { disabled: true, text: 'Inactive', className: 'mic-inactive' };
    
    switch (status) {
      case 'CONNECTING':
        return { disabled: true, text: 'Connecting...', className: 'mic-connecting' };
      case 'THINKING':
        return { disabled: true, text: 'AI Processing...', className: 'mic-thinking' };
      case 'SPEAKING':
        return { disabled: true, text: 'AI is Speaking...', className: 'mic-speaking' };
      case 'LISTENING':
        if (isRecording) {
          return {
            disabled: false,
            text: 'Click when Done Speaking',
            onClick: stopRecording,
            className: 'mic-recording'
          };
        } else {
          return {
            disabled: false,
            text: 'Click to Speak',
            onClick: startRecording,
            className: 'mic-ready'
          };
        }
      default:
        return { disabled: true, text: 'Idle', className: 'mic-inactive' };
    }
  };

  const micState = getMicrophoneButtonState();

  // Create array of bars for visualizer representation
  const renderVisualizerBars = () => {
    const totalBars = 9;
    return (
      <div className="audio-visualizer">
        {[...Array(totalBars)].map((_, index) => {
          // Add some dynamic variance to the bars
          const multiplier = 1 - Math.abs(4 - index) * 0.15;
          const heightPercent = isRecording ? Math.max(8, volume * multiplier) : 8;
          return (
            <div
              key={index}
              className={`visualizer-bar ${isRecording ? 'active' : ''}`}
              style={{ height: `${heightPercent}%` }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="call-controls-container">
      {!isCallActive ? (
        <button className="btn btn-primary btn-start-call" onClick={startCall}>
          <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
          </svg>
          Start Screener Call
        </button>
      ) : (
        <div className="active-call-layout">
          {/* Audio Visualizer Equalizer */}
          {renderVisualizerBars()}

          {/* Interactive Mic Toggler */}
          <div className="mic-wrapper">
            <div
              className={`mic-glow-ring ${isRecording ? 'pulse-glow' : ''}`}
              style={{ transform: `scale(${1 + (volume / 200)})` }}
            />
            <button
              disabled={micState.disabled}
              className={`btn-mic ${micState.className}`}
              onClick={micState.onClick}
              aria-label={micState.text}
            >
              <svg className="mic-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                {isRecording ? (
                  // Stop/Check Icon when recording
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                ) : (
                  // Microphone Icon
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                )}
              </svg>
            </button>
          </div>

          <div className="mic-instructions">
            {micState.text}
          </div>

          {/* End Call Trigger */}
          <button className="btn btn-danger btn-end-call" onClick={endCall}>
            <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8l2 2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v2a2 2 0 00.586 1.414l2 2a2 2 0 002.828 0L10 8.828M8 12a5 5 0 005 5h3.172l-1.414 1.414a2 2 0 000 2.828l2 2a2 2 0 001.414.586h2a2 2 0 002-2v-2a2 2 0 00-.586-1.414l-2-2a2 2 0 00-2.828 0L20 15H13" />
            </svg>
            End Call & Generate Report
          </button>
        </div>
      )}
    </div>
  );
}
