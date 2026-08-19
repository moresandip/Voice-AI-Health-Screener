import React from 'react';

export function StatusBadge({ status }) {
  const getBadgeConfig = () => {
    switch (status) {
      case 'IDLE':
        return {
          label: 'Idle',
          className: 'badge-idle',
          dotClass: 'dot-gray'
        };
      case 'CONNECTING':
        return {
          label: 'Connecting...',
          className: 'badge-connecting',
          dotClass: 'dot-orange pulse'
        };
      case 'LISTENING':
        return {
          label: 'Microphone Active (Listening)',
          className: 'badge-listening',
          dotClass: 'dot-green pulse'
        };
      case 'THINKING':
        return {
          label: 'AI is thinking...',
          className: 'badge-thinking',
          dotClass: 'dot-blue pulse-fast'
        };
      case 'SPEAKING':
        return {
          label: 'AI is speaking',
          className: 'badge-speaking',
          dotClass: 'dot-purple pulse'
        };
      case 'DISCONNECTED':
        return {
          label: 'Call Disconnected',
          className: 'badge-disconnected',
          dotClass: 'dot-red'
        };
      default:
        return {
          label: 'Unknown',
          className: 'badge-idle',
          dotClass: 'dot-gray'
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <div className={`status-badge ${config.className}`}>
      <span className={`status-dot ${config.dotClass}`}></span>
      <span className="status-label">{config.label}</span>
    </div>
  );
}
