import React, { useEffect, useRef } from 'react';

export function Transcript({ transcript, status }) {
  const bottomRef = useRef(null);

  // Auto scroll to the bottom on new transcript turns
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript]);

  const isEmpty = transcript.length === 0;

  return (
    <div className="transcript-card glass-panel">
      <div className="card-header">
        <h2 className="card-title">Live Transcript</h2>
        {status !== 'IDLE' && status !== 'DISCONNECTED' && (
          <span className="live-indicator">
            <span className="live-dot pulse-fast"></span>
            LIVE
          </span>
        )}
      </div>

      <div className="transcript-viewport">
        {isEmpty ? (
          <div className="transcript-placeholder">
            <svg className="placeholder-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="placeholder-text">Click "Start Screener Call" to begin the health intake session.</p>
            <div className="guidelines-box">
              <div className="guideline-item">
                <span className="guideline-num">1</span>
                <span>You can speak in <strong>English</strong> or <strong>Hindi (हिंदी)</strong>.</span>
              </div>
              <div className="guideline-item">
                <span className="guideline-num">2</span>
                <span>Wait for the agent to finish talking, then tap the mic to speak.</span>
              </div>
              <div className="guideline-item">
                <span className="guideline-num">3</span>
                <span>Click "End Call" at any time to compile your medical report.</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="transcript-list">
            {transcript.map((message, index) => {
              const isUser = message.role === 'user';
              return (
                <div key={index} className={`transcript-bubble-wrapper ${isUser ? 'user-wrapper' : 'agent-wrapper'}`}>
                  <div className="sender-label">
                    {isUser ? 'You' : 'AI Health Screener'}
                  </div>
                  <div className={`transcript-bubble ${isUser ? 'bubble-user' : 'bubble-agent'}`}>
                    {message.content}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
