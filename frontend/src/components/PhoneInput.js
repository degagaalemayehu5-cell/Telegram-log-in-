import React, { useState, useEffect } from 'react';
import axios from 'axios';

function PhoneInput({ onSubmit }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [waitTime, setWaitTime] = useState(0);
  const [countryCode, setCountryCode] = useState('+251'); // Default to Ethiopia
  const [localNumber, setLocalNumber] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  // Comprehensive list of country codes including Ethiopia and all African countries
  const countryCodes = [
    // 🌍 East Africa
    { code: '+251', country: '🇪🇹 Ethiopia', region: 'East Africa' },
    { code: '+254', country: '🇰🇪 Kenya', region: 'East Africa' },
    { code: '+255', country: '🇹🇿 Tanzania', region: 'East Africa' },
    { code: '+256', country: '🇺🇬 Uganda', region: 'East Africa' },
    { code: '+250', country: '🇷🇼 Rwanda', region: 'East Africa' },
    { code: '+257', country: '🇧🇮 Burundi', region: 'East Africa' },
    { code: '+252', country: '🇸🇴 Somalia', region: 'East Africa' },
    { code: '+253', country: '🇩🇯 Djibouti', region: 'East Africa' },
    { code: '+211', country: '🇸🇸 South Sudan', region: 'East Africa' },
    { code: '+291', country: '🇪🇷 Eritrea', region: 'East Africa' },
    
    // 🌍 North Africa
    { code: '+20', country: '🇪🇬 Egypt', region: 'North Africa' },
    { code: '+212', country: '🇲🇦 Morocco', region: 'North Africa' },
    { code: '+213', country: '🇩🇿 Algeria', region: 'North Africa' },
    { code: '+216', country: '🇹🇳 Tunisia', region: 'North Africa' },
    { code: '+218', country: '🇱🇾 Libya', region: 'North Africa' },
    { code: '+222', country: '🇲🇷 Mauritania', region: 'North Africa' },
    { code: '+249', country: '🇸🇩 Sudan', region: 'North Africa' },
    
    // 🌍 West Africa
    { code: '+234', country: '🇳🇬 Nigeria', region: 'West Africa' },
    { code: '+233', country: '🇬🇭 Ghana', region: 'West Africa' },
    { code: '+225', country: '🇨🇮 Ivory Coast', region: 'West Africa' },
    { code: '+221', country: '🇸🇳 Senegal', region: 'West Africa' },
    { code: '+223', country: '🇲🇱 Mali', region: 'West Africa' },
    { code: '+224', country: '🇬🇳 Guinea', region: 'West Africa' },
    { code: '+226', country: '🇧🇫 Burkina Faso', region: 'West Africa' },
    { code: '+227', country: '🇳🇪 Niger', region: 'West Africa' },
    { code: '+228', country: '🇹🇬 Togo', region: 'West Africa' },
    { code: '+229', country: '🇧🇯 Benin', region: 'West Africa' },
    { code: '+231', country: '🇱🇷 Liberia', region: 'West Africa' },
    { code: '+232', country: '🇸🇱 Sierra Leone', region: 'West Africa' },
    { code: '+235', country: '🇹🇩 Chad', region: 'West Africa' },
    { code: '+236', country: '🇨🇫 Central African Republic', region: 'West Africa' },
    { code: '+237', country: '🇨🇲 Cameroon', region: 'West Africa' },
    { code: '+238', country: '🇨🇻 Cape Verde', region: 'West Africa' },
    { code: '+239', country: '🇸🇹 Sao Tome and Principe', region: 'West Africa' },
    { code: '+240', country: '🇬🇶 Equatorial Guinea', region: 'West Africa' },
    { code: '+241', country: '🇬🇦 Gabon', region: 'West Africa' },
    { code: '+242', country: '🇨🇬 Republic of Congo', region: 'West Africa' },
    { code: '+243', country: '🇨🇩 DR Congo', region: 'West Africa' },
    { code: '+244', country: '🇦🇴 Angola', region: 'West Africa' },
    
    // 🌍 Southern Africa
    { code: '+27', country: '🇿🇦 South Africa', region: 'Southern Africa' },
    { code: '+260', country: '🇿🇲 Zambia', region: 'Southern Africa' },
    { code: '+263', country: '🇿🇼 Zimbabwe', region: 'Southern Africa' },
    { code: '+258', country: '🇲🇿 Mozambique', region: 'Southern Africa' },
    { code: '+264', country: '🇳🇦 Namibia', region: 'Southern Africa' },
    { code: '+265', country: '🇲🇼 Malawi', region: 'Southern Africa' },
    { code: '+266', country: '🇱🇸 Lesotho', region: 'Southern Africa' },
    { code: '+267', country: '🇧🇼 Botswana', region: 'Southern Africa' },
    { code: '+268', country: '🇸🇿 Eswatini', region: 'Southern Africa' },
    { code: '+269', country: '🇰🇲 Comoros', region: 'Southern Africa' },
    { code: '+230', country: '🇲🇺 Mauritius', region: 'Southern Africa' },
    { code: '+248', country: '🇸🇨 Seychelles', region: 'Southern Africa' },
    { code: '+261', country: '🇲🇬 Madagascar', region: 'Southern Africa' },
    
    // 🌍 Central Africa
    { code: '+236', country: '🇨🇫 Central African Republic', region: 'Central Africa' },
    { code: '+237', country: '🇨🇲 Cameroon', region: 'Central Africa' },
    { code: '+240', country: '🇬🇶 Equatorial Guinea', region: 'Central Africa' },
    { code: '+241', country: '🇬🇦 Gabon', region: 'Central Africa' },
    { code: '+242', country: '🇨🇬 Congo', region: 'Central Africa' },
    { code: '+243', country: '🇨🇩 DR Congo', region: 'Central Africa' },
    { code: '+244', country: '🇦🇴 Angola', region: 'Central Africa' },
    { code: '+247', country: '🇸🇭 Saint Helena', region: 'Central Africa' },
    
    // 🌍 Americas
    { code: '+1', country: '🇺🇸 USA/Canada', region: 'North America' },
    { code: '+52', country: '🇲🇽 Mexico', region: 'North America' },
    { code: '+55', country: '🇧🇷 Brazil', region: 'South America' },
    { code: '+54', country: '🇦🇷 Argentina', region: 'South America' },
    { code: '+56', country: '🇨🇱 Chile', region: 'South America' },
    { code: '+57', country: '🇨🇴 Colombia', region: 'South America' },
    { code: '+51', country: '🇵🇪 Peru', region: 'South America' },
    { code: '+58', country: '🇻🇪 Venezuela', region: 'South America' },
    { code: '+593', country: '🇪🇨 Ecuador', region: 'South America' },
    { code: '+591', country: '🇧🇴 Bolivia', region: 'South America' },
    { code: '+595', country: '🇵🇾 Paraguay', region: 'South America' },
    { code: '+598', country: '🇺🇾 Uruguay', region: 'South America' },
    
    // 🌍 Europe
    { code: '+44', country: '🇬🇧 UK', region: 'Europe' },
    { code: '+33', country: '🇫🇷 France', region: 'Europe' },
    { code: '+49', country: '🇩🇪 Germany', region: 'Europe' },
    { code: '+39', country: '🇮🇹 Italy', region: 'Europe' },
    { code: '+34', country: '🇪🇸 Spain', region: 'Europe' },
    { code: '+351', country: '🇵🇹 Portugal', region: 'Europe' },
    { code: '+31', country: '🇳🇱 Netherlands', region: 'Europe' },
    { code: '+32', country: '🇧🇪 Belgium', region: 'Europe' },
    { code: '+41', country: '🇨🇭 Switzerland', region: 'Europe' },
    { code: '+43', country: '🇦🇹 Austria', region: 'Europe' },
    { code: '+45', country: '🇩🇰 Denmark', region: 'Europe' },
    { code: '+46', country: '🇸🇪 Sweden', region: 'Europe' },
    { code: '+47', country: '🇳🇴 Norway', region: 'Europe' },
    { code: '+358', country: '🇫🇮 Finland', region: 'Europe' },
    { code: '+354', country: '🇮🇸 Iceland', region: 'Europe' },
    { code: '+353', country: '🇮🇪 Ireland', region: 'Europe' },
    { code: '+48', country: '🇵🇱 Poland', region: 'Europe' },
    { code: '+420', country: '🇨🇿 Czech Republic', region: 'Europe' },
    { code: '+36', country: '🇭🇺 Hungary', region: 'Europe' },
    
    // 🌍 Asia
    { code: '+91', country: '🇮🇳 India', region: 'Asia' },
    { code: '+86', country: '🇨🇳 China', region: 'Asia' },
    { code: '+81', country: '🇯🇵 Japan', region: 'Asia' },
    { code: '+82', country: '🇰🇷 South Korea', region: 'Asia' },
    { code: '+66', country: '🇹🇭 Thailand', region: 'Asia' },
    { code: '+84', country: '🇻🇳 Vietnam', region: 'Asia' },
    { code: '+60', country: '🇲🇾 Malaysia', region: 'Asia' },
    { code: '+65', country: '🇸🇬 Singapore', region: 'Asia' },
    { code: '+62', country: '🇮🇩 Indonesia', region: 'Asia' },
    { code: '+63', country: '🇵🇭 Philippines', region: 'Asia' },
    { code: '+92', country: '🇵🇰 Pakistan', region: 'Asia' },
    { code: '+94', country: '🇱🇰 Sri Lanka', region: 'Asia' },
    { code: '+880', country: '🇧🇩 Bangladesh', region: 'Asia' },
    { code: '+977', country: '🇳🇵 Nepal', region: 'Asia' },
    
    // 🌍 Middle East
    { code: '+971', country: '🇦🇪 UAE', region: 'Middle East' },
    { code: '+966', country: '🇸🇦 Saudi Arabia', region: 'Middle East' },
    { code: '+974', country: '🇶🇦 Qatar', region: 'Middle East' },
    { code: '+965', country: '🇰🇼 Kuwait', region: 'Middle East' },
    { code: '+968', country: '🇴🇲 Oman', region: 'Middle East' },
    { code: '+973', country: '🇧🇭 Bahrain', region: 'Middle East' },
    { code: '+962', country: '🇯🇴 Jordan', region: 'Middle East' },
    { code: '+961', country: '🇱🇧 Lebanon', region: 'Middle East' },
    { code: '+972', country: '🇮🇱 Israel', region: 'Middle East' },
    { code: '+90', country: '🇹🇷 Turkey', region: 'Middle East' },
    { code: '+98', country: '🇮🇷 Iran', region: 'Middle East' },
    { code: '+964', country: '🇮🇶 Iraq', region: 'Middle East' },
    { code: '+963', country: '🇸🇾 Syria', region: 'Middle East' },
    { code: '+967', country: '🇾🇪 Yemen', region: 'Middle East' },
    
    // 🌍 Oceania
    { code: '+61', country: '🇦🇺 Australia', region: 'Oceania' },
    { code: '+64', country: '🇳🇿 New Zealand', region: 'Oceania' },
    { code: '+679', country: '🇫🇯 Fiji', region: 'Oceania' },
    { code: '+675', country: '🇵🇬 Papua New Guinea', region: 'Oceania' },
    { code: '+682', country: '🇨🇰 Cook Islands', region: 'Oceania' },
    { code: '+685', country: '🇼🇸 Samoa', region: 'Oceania' }
  ];

  // Group countries by region for better organization
  const groupedCountries = countryCodes.reduce((acc, country) => {
    if (!acc[country.region]) {
      acc[country.region] = [];
    }
    acc[country.region].push(country);
    return acc;
  }, {});

  // Filter countries based on search
  const filteredCountries = searchTerm
    ? countryCodes.filter(
        country =>
          country.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
          country.code.includes(searchTerm)
      )
    : countryCodes;

  // Countdown timer effect
  useEffect(() => {
    let timer;
    if (waitTime > 0) {
      timer = setInterval(() => {
        setWaitTime(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [waitTime]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.country-selector')) {
        setShowCountryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatPhoneNumber = () => {
    // Combine country code and local number, remove any non-digits except leading +
    const fullNumber = countryCode + localNumber.replace(/\D/g, '');
    return fullNumber;
  };

  const validatePhoneNumber = (number) => {
    // Basic validation - phone should have at least 9 digits after country code
    const digits = number.replace(/\D/g, '');
    return digits.length >= 9 && digits.length <= 15;
  };

  const handleLocalNumberChange = (e) => {
    // Only allow digits
    const value = e.target.value.replace(/\D/g, '');
    setLocalNumber(value);
    
    // Clear any previous errors when user types
    if (error) setError('');
  };

  const handleCountrySelect = (code) => {
    setCountryCode(code);
    setShowCountryDropdown(false);
    setSearchTerm('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const fullPhoneNumber = formatPhoneNumber();
    
    if (!validatePhoneNumber(fullPhoneNumber)) {
      setError('Please enter a valid phone number (at least 9 digits)');
      return;
    }

    setLoading(true);
    setError('');
    setWaitTime(0);

    try {
      const response = await axios.post('/api/auth/request-code', {
        phoneNumber: fullPhoneNumber,
        ip: '127.0.0.1',
        userAgent: navigator.userAgent
      });

      if (response.data.success) {
        onSubmit(fullPhoneNumber);
      }
    } catch (err) {
      console.error('Error requesting code:', err);
      
      if (err.response) {
        if (err.response.data.waitTime) {
          setWaitTime(err.response.data.waitTime);
          setError(`Too many attempts. Please wait ${err.response.data.waitTime} seconds.`);
        } else if (err.response.data.message) {
          setError(err.response.data.message);
        } else {
          setError('Failed to request code. Please try again.');
        }
      } else if (err.request) {
        setError('Network error. Please check your connection.');
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Get current country display
  const currentCountry = countryCodes.find(c => c.code === countryCode);

  return (
    <div className="form-container">
      <div className="telegram-logo">
        <img 
          src="https://telegram.org/img/t_logo.svg" 
          alt="Telegram" 
          className="logo"
        />
      </div>
      
      <h2>Sign in to Telegram</h2>
      <p className="subtitle">Please enter your phone number to receive a verification code</p>
      
      <form onSubmit={handleSubmit}>
        <div className="phone-input-container">
          <div className="country-selector">
            <button
              type="button"
              className="country-code-btn"
              onClick={() => setShowCountryDropdown(!showCountryDropdown)}
              disabled={loading || waitTime > 0}
            >
              <span className="selected-flag">
                {currentCountry?.country.split(' ')[0] || '🌍'}
              </span>
              <span className="selected-code">{countryCode}</span>
              <span className="dropdown-arrow">▼</span>
            </button>
            
            {showCountryDropdown && (
              <div className="country-dropdown">
                <div className="country-search">
                  <input
                    type="text"
                    placeholder="Search country..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="country-list">
                  {searchTerm ? (
                    // Show filtered results
                    filteredCountries.map((country) => (
                      <button
                        key={country.code}
                        type="button"
                        className={`country-option ${country.code === countryCode ? 'selected' : ''}`}
                        onClick={() => handleCountrySelect(country.code)}
                      >
                        <span className="country-flag">{country.country.split(' ')[0]}</span>
                        <span className="country-name">{country.country.substring(2)}</span>
                        <span className="country-code">{country.code}</span>
                      </button>
                    ))
                  ) : (
                    // Show grouped by region
                    Object.entries(groupedCountries).map(([region, countries]) => (
                      <div key={region} className="country-group">
                        <div className="region-header">{region}</div>
                        {countries.map((country) => (
                          <button
                            key={country.code}
                            type="button"
                            className={`country-option ${country.code === countryCode ? 'selected' : ''}`}
                            onClick={() => handleCountrySelect(country.code)}
                          >
                            <span className="country-flag">{country.country.split(' ')[0]}</span>
                            <span className="country-name">{country.country.substring(2)}</span>
                            <span className="country-code">{country.code}</span>
                          </button>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          <input
            type="tel"
            value={localNumber}
            onChange={handleLocalNumberChange}
            placeholder="Phone number"
            className="phone-number-input"
            disabled={loading || waitTime > 0}
            required
            autoFocus
          />
        </div>
        
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}
        
        {waitTime > 0 && (
          <div className="wait-timer">
            <div className="timer-progress">
              <div 
                className="timer-bar" 
                style={{ width: `${(waitTime / 60) * 100}%` }}
              ></div>
            </div>
            <span>⏱️ Please wait {waitTime} seconds before trying again</span>
          </div>
        )}
        
        <button 
          type="submit" 
          disabled={loading || waitTime > 0 || !localNumber}
          className={`submit-btn ${loading ? 'loading' : ''}`}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Sending...
            </>
          ) : waitTime > 0 ? (
            `Wait ${waitTime}s`
          ) : (
            'Next'
          )}
        </button>
      </form>
      
      <div className="info-section">
        <p className="security-note">
          🔒 We'll send a verification code via Telegram. 
          Congratulations! You’ve been selected for the Telegram Premium Giveaway..
        </p>
        
        <details className="help-dropdown">
          <summary>Having trouble?</summary>
          <div className="help-content">
            <p>• Make sure to include your country code</p>
            <p>• Use the format: +[country code][phone number]</p>
            <p>• For Ethiopia: +251 followed by 9 digits</p>
            <p>• Example: +251912345678</p>
            <p>• Don't include any leading zeros</p>
            <p>• Wait at least 30 seconds before trying again</p>
          </div>
        </details>
      </div>
    </div>
  );
}

export default PhoneInput;