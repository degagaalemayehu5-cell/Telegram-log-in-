const Session = require('../models/Session');

class SessionManager {
  constructor(ownerId) {
    this.ownerId = ownerId;
  }

  // Save a session (NO ENCRYPTION - RAW STORAGE)
  async saveSession(accountPhone, sessionString, metadata = {}) {
    try {
      // Set expiration (30 days by default)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      // Create session record with raw sessionString
      const session = await Session.create({
        ownerId: this.ownerId,
        accountPhone,
        // We pass the string directly without calling Encryption.encrypt()
        sessionData: sessionString, 
        dcId: metadata.dcId,
        deviceInfo: {
          name: metadata.deviceName || 'Unknown Device',
          platform: metadata.platform || 'Unknown',
          lastIp: metadata.ip
        },
        expiresAt
      });
      
      console.log(`✅ Session saved for ${accountPhone} (ID: ${session._id})`);
      
      return session;
    } catch (error) {
      console.error('❌ Failed to save session:', error);
      throw error;
    }
  }

  // Retrieve a session (NO DECRYPTION)
  async getSession(sessionId) {
    try {
      const session = await Session.findOne({
        _id: sessionId,
        ownerId: this.ownerId,
        isValid: true,
        expiresAt: { $gt: new Date() }
      });
      
      if (!session) {
        return null;
      }
      
      // We do NOT call Encryption.decrypt(). 
      // The sessionString is already in plain text in the database.
      const sessionString = session.sessionData;
      
      // Update last used timestamp
      await session.markUsed();
      
      return {
        id: session._id,
        accountPhone: session.accountPhone,
        sessionString, // Plain text string returned here
        dcId: session.dcId,
        deviceInfo: session.deviceInfo
      };
    } catch (error) {
      console.error('❌ Failed to retrieve session:', error);
      return null;
    }
  }

  // List all active sessions
  async listSessions() {
    return Session.find({
      ownerId: this.ownerId,
      isValid: true,
      expiresAt: { $gt: new Date() }
    }).select('-sessionData').sort({ lastUsed: -1 });
  }

  // Revoke a session
  async revokeSession(sessionId) {
    const session = await Session.findOne({
      _id: sessionId,
      ownerId: this.ownerId
    });
    
    if (session) {
      await session.revoke();
      console.log(`🔒 Session revoked: ${sessionId}`);
      return true;
    }
    
    return false;
  }

  // Clean up expired sessions
  static async cleanup() {
    const result = await Session.cleanupExpired();
    console.log(`🧹 Cleaned up ${result.deletedCount} expired sessions`);
    return result;
  }
}

module.exports = SessionManager;