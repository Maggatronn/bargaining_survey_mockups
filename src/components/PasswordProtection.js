import React, { useState } from 'react';
import '../PasswordProtection.css';

function PasswordProtection({ onAuthenticated }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Check password against environment variable
    const correctPassword = process.env.REACT_APP_ACCESS_PASSWORD || 'password';
    
    if (password === correctPassword) {
      // Store authentication in sessionStorage (cleared when browser closes)
      sessionStorage.setItem('authenticated', 'true');
      onAuthenticated();
    } else {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
  };

  return (
    <div className="password-protection-overlay">
      <div className="password-protection-container">
        <div className="password-protection-header">
          <h1>GSU Organizers Data Explorer</h1>
          <p>Please enter the password to access this application</p>
        </div>
        
        <form onSubmit={handleSubmit} className="password-form">
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            placeholder="Enter password"
            className="password-input"
            autoFocus
          />
          
          {error && <div className="password-error">{error}</div>}
          
          <button type="submit" className="password-submit">
            Access Application
          </button>
        </form>
      </div>
    </div>
  );
}

export default PasswordProtection;

