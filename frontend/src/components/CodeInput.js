import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function CodeInput({ phoneNumber, onVerified, onBack }) {
  // 5-digit code (Telegram sends 5-digit codes)
  const [code, setCode] = useState(['', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef([]);

  // Initialize refs array for 5 inputs
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, 5);
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    let timer;
    if (resendTimer > 0 && !canResend) {
      timer = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendTimer, canResend]);

  const handleCodeChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d+$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Take only last character if multiple
    setCode(newCode);

    // Auto-focus next input (indices 0-3, since last input is index 4)
    if (value && index < 4) {
      inputRefs.current[index + 1].focus();
    }

    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
    // Handle arrow keys
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1].focus();
    }
    if (e.key === 'ArrowRight' && index < 4) {
      inputRefs.current[index + 1].focus();
    }
    // Handle paste (Ctrl+V or Cmd+V)
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      handlePaste(e);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    // Extract only digits and take first 5
    const pastedCode = pastedData.replace(/\D/g, '').slice(0, 5);
    
    const newCode = [...code];
    for (let i = 0; i < pastedCode.length; i++) {
      if (i < 5) newCode[i] = pastedCode[i];
    }
    setCode(newCode);
    
    // Focus appropriate input
    if (pastedCode.length < 5) {
      // Focus the next empty input
      inputRefs.current[pastedCode.length].focus();
    } else {
      // Focus the last input if all 5 digits are pasted
      inputRefs.current[4].focus();
    }
  };

  const getFullCode = () => {
    return code.join('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const fullCode = getFullCode();
    if (fullCode.length !== 5) {
      setError('Please enter all 5 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/verify-code', {
        phoneNumber,
        code: fullCode
      });

      if (response.data.success) {
        onVerified(response.data.requiresTwoFactor);
      }
    } catch (err) {
      console.error('Error verifying code:', err);
      
      // Clear code inputs on error
      setCode(['', '', '', '', '']);
      // Focus first input
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
      
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Invalid code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || loading) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('/api/auth/request-code', {
        phoneNumber,
        ip: '127.0.0.1',
        userAgent: navigator.userAgent
      });
      
      if (response.data.success) {
        setResendTimer(30);
        setCanResend(false);
        setCode(['', '', '', '', '']);
        // Focus first input
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
        
        // Show success message briefly
        setError('✓ Code resent successfully!');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      if (err.response?.data?.waitTime) {
        setResendTimer(err.response.data.waitTime);
        setError(`Please wait ${err.response.data.waitTime} seconds`);
      } else {
        setError('Failed to resend code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <button onClick={onBack} className="back-button" type="button">
        ← Back
      </button>
      
      <h2>Enter Verification Code</h2>
      <p className="subtitle">
        We've sent a 5-digit code to
      </p>
      <p className="phone-number-display">
        <span className="phone-number">{phoneNumber}</span>
        <button className="edit-phone" onClick={onBack} title="Edit number" type="button">
          ✎
        </button>
      </p>
      
      <form onSubmit={handleSubmit}>
        <div className="code-input-container">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={el => inputRefs.current[index] = el}
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength="1"
              value={digit}
              onChange={(e) => handleCodeChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              disabled={loading}
              className={`code-digit ${error && !error.includes('success') && !error.includes('✓') ? 'error' : ''}`}
              autoComplete="off"
              aria-label={`Digit ${index + 1} of 5`}
            />
          ))}
        </div>
        
        {error && (
          <div className={`message ${error.includes('✓') || error.includes('success') ? 'success-message' : 'error-message'}`}>
            <span className={error.includes('✓') || error.includes('success') ? 'success-icon' : 'error-icon'}>
              {error.includes('✓') ? '✓' : '⚠️'}
            </span>
            {error.replace('✓ ', '')}
          </div>
        )}
        
        <button 
          type="submit" 
          disabled={loading || getFullCode().length !== 5}
          className={`submit-btn ${loading ? 'loading' : ''}`}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Verifying...
            </>
          ) : (
            'Verify'
          )}
        </button>
      </form>
      
      <div className="resend-section">
        {canResend ? (
          <button 
            className="resend-btn" 
            onClick={handleResend}
            disabled={loading}
            type="button"
          >
            Resend Code
          </button>
        ) : (
          <p className="timer">
            <span className="timer-icon">⏱️</span>
            Resend available in {resendTimer} seconds
          </p>
        )}
      </div>
      
      <div className="help-text">
        <p>Didn't receive the code? Check your Telegram app</p>
        <p className="small">The 5-digit code will appear in your Telegram messages</p>
        <details className="help-dropdown">
          <summary>Having trouble?</summary>
          <div className="help-content">
            <p>• Check your Telegram app for the code</p>
            <p>• Make sure you entered the correct phone number</p>
            <p>• The code expires after a few minutes</p>
            <p>• You can request a new code every 30 seconds</p>
          </div>
        </details>
      </div>
    </div>
  );
}

export default CodeInput;