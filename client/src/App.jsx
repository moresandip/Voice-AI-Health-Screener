import React, { useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { StatusBadge } from './components/StatusBadge';
import { CallControls } from './components/CallControls';
import { Transcript } from './components/Transcript';
import { HealthReport } from './components/HealthReport';

function App() {
  const {
    status,
    transcript,
    report,
    error,
    startCall,
    endCall,
    sendAudio,
    sendText
  } = useWebSocket();

  const [inputText, setInputText] = useState('');

  // Triggered when recorded user audio buffer is packaged as base64
  const handleAudioReady = (base64Audio, mimeType) => {
    sendAudio(base64Audio, mimeType);
  };

  const {
    isRecording,
    volume,
    startRecording,
    stopRecording
  } = useAudioRecorder(handleAudioReady);

  const handleSendText = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendText(inputText);
    setInputText('');
  };

  const handleReset = () => {
    // Simply reload the page or redirect to clean states
    window.location.reload();
  };

  return (
    <div className="app-container">
      {/* Header Bar */}
      <header className="app-header">
        <div className="header-brand">
          <div className="logo-pulse"></div>
          <h1>Voice AI Health Screener</h1>
        </div>
        <StatusBadge status={status} />
      </header>

      {/* Main Layout Grid */}
      <main className="app-main">
        {error && (
          <div className="error-banner">
            <svg className="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {!report ? (
          <div className="dashboard-grid">
            {/* Left Panel: Call Controller & Instructions */}
            <div className="panel-left">
              <div className="screener-welcome glass-panel">
                <h2 className="welcome-title">Patient Intake Screener</h2>
                <p className="welcome-description">
                  Welcome to the digital health screening assistant. This system uses real-time speech processing to document your health symptoms before seeing a provider.
                </p>
                <div className="features-list">
                  <div className="feature-item">
                    <svg className="feature-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>Bi-directional voice conversation pipeline</span>
                  </div>
                  <div className="feature-item">
                    <svg className="feature-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                    </svg>
                    <span>Bilingual (English / Hindi) support</span>
                  </div>
                  <div className="feature-item">
                    <svg className="feature-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Automated structured clinical report generation</span>
                  </div>
                </div>
              </div>

              {/* Call Controls panel */}
              <div className="call-panel glass-panel">
                <CallControls
                  status={status}
                  isRecording={isRecording}
                  volume={volume}
                  startCall={startCall}
                  endCall={endCall}
                  startRecording={startRecording}
                  stopRecording={stopRecording}
                />
              </div>
            </div>

            {/* Right Panel: Live Transcript */}
            <div className="panel-right">
              <div className="transcript-box-wrapper">
                <Transcript transcript={transcript} status={status} />
              </div>
              
              {status === 'LISTENING' && (
                <form onSubmit={handleSendText} className="chat-input-form glass-panel fade-in">
                  <input
                    type="text"
                    placeholder="Type here (e.g. My name is Sandip)..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="chat-input"
                  />
                  <button type="submit" className="btn btn-primary btn-send">
                    <svg className="send-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : (
          /* Show Health Summary Report once generated */
          <div className="report-wrapper">
            <HealthReport report={report} onReset={handleReset} />
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="app-footer">
        <p>© 2026 Voice AI Health Screener. Created for medical intake demonstration purposes.</p>
      </footer>
    </div>
  );
}

export default App;
