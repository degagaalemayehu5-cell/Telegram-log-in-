const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

class TelegramClientManager {
  constructor(apiId, apiHash) {
    this.apiId = parseInt(apiId);
    this.apiHash = apiHash;
    this.clients = new Map(); // In production, use Redis
    console.log('🤖 Telegram Client Manager initialized');
  }

  // Create new client for phone number
  async createClient(phoneNumber) {
    try {
      const session = new StringSession('');
      const client = new TelegramClient(session, this.apiId, this.apiHash, {
        connectionRetries: 5,
        timeout: 10000,
        useWSS: true, // Use WebSocket for better compatibility
      });

      await client.connect();
      
      // Store client with timestamp
      this.clients.set(phoneNumber, {
        client,
        session: session.save(),
        createdAt: Date.now()
      });

      console.log(`✅ Client created for ${phoneNumber}`);
      return client;
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  }

  // Get existing client
  getClient(phoneNumber) {
    const data = this.clients.get(phoneNumber);
    if (data && data.client && data.client.connected) {
      return data.client;
    }
    return null;
  }

  // Remove client (call after login completion)
  async removeClient(phoneNumber) {
    const data = this.clients.get(phoneNumber);
    if (data && data.client) {
      try {
        await data.client.disconnect();
        console.log(`🔌 Client disconnected for ${phoneNumber}`);
      } catch (error) {
        console.error('Error disconnecting client:', error);
      }
      this.clients.delete(phoneNumber);
    }
  }

  // Clean up old clients (call periodically)
  cleanupOldClients(maxAge = 3600000) { // 1 hour default
    const now = Date.now();
    let removedCount = 0;
    
    for (const [phone, data] of this.clients.entries()) {
      if (now - data.createdAt > maxAge) {
        data.client.disconnect().catch(console.error);
        this.clients.delete(phone);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} old clients`);
    }
  }

  // Get active clients count
  getActiveCount() {
    return this.clients.size;
  }
}

module.exports = TelegramClientManager;