import React, { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export function HealthReport({ report, onReset }) {
  if (!report) return null;

  const reportRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);

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

  const handleDownloadPDF = async () => {
    const element = reportRef.current;
    if (!element) return;

    setIsDownloading(true);
    try {
      // Capture the report div as a canvas image
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0d1127',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add header branding
      pdf.setFillColor(7, 9, 19);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // If content fits in one page
      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      } else {
        // Multi-page support
        let yOffset = 0;
        while (yOffset < imgHeight) {
          if (yOffset > 0) pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, -yOffset, imgWidth, imgHeight);
          yOffset += pageHeight;
        }
      }

      // Footer watermark
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);
        pdf.text(
          `Voice AI Health Screener  •  Generated ${new Date().toLocaleString('en-IN')}  •  Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 6,
          { align: 'center' }
        );
      }

      const safeName = patientName.replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`Health_Report_${safeName}_${Date.now()}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('PDF download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="report-container glass-panel fade-in">
      {/* The captured region starts here */}
      <div ref={reportRef} className="report-capture-zone">
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
              <label className="grid-label">Onset &amp; Duration</label>
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
              <span className="follow-up-title">Intake Flags &amp; Recommendation</span>
            </div>
            <p className="follow-up-text">{flaggedFollowUp}</p>
          </div>

          {/* PDF Timestamp watermark (visible in PDF) */}
          <div className="report-timestamp">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Report generated on {new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}
          </div>
        </div>
      </div>
      {/* Captured region ends */}

      <div className="report-footer">
        <button className="btn btn-secondary btn-reset" onClick={onReset}>
          <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Conduct New Assessment
        </button>

        <button
          className="btn btn-pdf-download"
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          id="download-pdf-btn"
        >
          {isDownloading ? (
            <>
              <span className="pdf-spinner" />
              Generating PDF...
            </>
          ) : (
            <>
              <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF Report
            </>
          )}
        </button>
      </div>
    </div>
  );
}
