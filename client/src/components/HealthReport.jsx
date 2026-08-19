import React from 'react';

export function HealthReport({ report, onReset }) {
  if (!report) return null;

  const {
    status = 'INCOMPLETE',
    patientName = 'Not Provided',
    chiefComplaint = 'Not Provided',
    duration = 'Not Provided',
    severity = 'Not Provided',
    associatedSymptoms = [],
    summary = '',
    flaggedFollowUp = 'N/A'
  } = report;

  const isComplete = status === 'COMPLETE';

  return (
    <div className="report-container glass-panel fade-in">
      <div className="report-header">
        <div className="header-meta">
          <svg className="report-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div>
            <h2 className="report-title">Health Intake Report</h2>
            <p className="report-subtitle">Generated automatically by AI screening pipeline</p>
          </div>
        </div>
        <span className={`status-pill ${isComplete ? 'pill-complete' : 'pill-incomplete'}`}>
          {status} ASSESSMENT
        </span>
      </div>

      <div className="report-body">
        {/* Core Metadata Grid */}
        <div className="report-grid">
          <div className="grid-card">
            <label className="grid-label">Patient Name</label>
            <div className="grid-value">{patientName}</div>
          </div>
          <div className="grid-card">
            <label className="grid-label">Chief Complaint</label>
            <div className="grid-value text-highlight">{chiefComplaint}</div>
          </div>
          <div className="grid-card">
            <label className="grid-label">Onset & Duration</label>
            <div className="grid-value">{duration}</div>
          </div>
          <div className="grid-card">
            <label className="grid-label">Severity Level</label>
            <div className="grid-value">
              <span className="severity-badge">{severity}</span>
            </div>
          </div>
        </div>

        {/* Associated Symptoms */}
        <div className="report-section">
          <h3 className="section-heading">Associated Symptoms</h3>
          {associatedSymptoms.length > 0 ? (
            <div className="symptom-tags">
              {associatedSymptoms.map((symptom, i) => (
                <span key={i} className="symptom-tag">
                  {symptom}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-muted">No associated symptoms reported.</span>
          )}
        </div>

        {/* Summary Narrative */}
        <div className="report-section">
          <h3 className="section-heading">Clinical Summary</h3>
          <blockquote className="clinical-summary">
            {summary || 'No summary available.'}
          </blockquote>
        </div>

        {/* Urgent Follow-Up & Red Flags */}
        <div className={`follow-up-card ${flaggedFollowUp !== 'N/A' && flaggedFollowUp !== 'None' ? 'warning-glow' : ''}`}>
          <div className="follow-up-header">
            <svg className="warning-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="follow-up-title">Intake Flags & Recommendation</span>
          </div>
          <p className="follow-up-text">{flaggedFollowUp}</p>
        </div>
      </div>

      <div className="report-footer">
        <button className="btn btn-secondary btn-reset" onClick={onReset}>
          Conduct New Assessment
        </button>
      </div>
    </div>
  );
}
