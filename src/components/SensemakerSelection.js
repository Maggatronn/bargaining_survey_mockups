import React, { useState } from 'react';

function SensemakerSelection({ sensemakers, onSensemakerSelected }) {
  const [selectedId, setSelectedId] = useState('');

  const handleContinue = () => {
    if (selectedId) {
      const sensemaker = sensemakers.find(s => s.id === selectedId);
      if (sensemaker) {
        // Store in session storage
        sessionStorage.setItem('currentSensemaker', sensemaker.id);
        sessionStorage.setItem('sensemakerSelected', 'true');
        onSensemakerSelected(sensemaker);
      }
    }
  };

  const handleSkip = () => {
    sessionStorage.setItem('sensemakerSelected', 'true');
    onSensemakerSelected(null);
  };

  return (
    <div className="sensemaker-selection-overlay">
      <div className="sensemaker-selection-container">
        <div className="sensemaker-selection-header">
          <h1>Welcome to the GSU Data Explorer</h1>
          <p>Please select your name to get started</p>
        </div>
        
        <div className="sensemaker-selection-content">
          <label className="sensemaker-selection-label">I am:</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="sensemaker-selection-dropdown"
          >
            <option value="">Select your name...</option>
            {sensemakers.map(sm => (
              <option key={sm.id} value={sm.id}>
                {sm.name}
              </option>
            ))}
          </select>
          
          <div className="sensemaker-selection-actions">
            <button 
              onClick={handleContinue}
              disabled={!selectedId}
              className="sensemaker-continue-button"
            >
              Continue
            </button>
            <button 
              onClick={handleSkip}
              className="sensemaker-skip-button"
            >
              Skip for now
            </button>
          </div>
          
          <p className="sensemaker-selection-note">
            You can change this later using the dropdown in the header.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SensemakerSelection;

