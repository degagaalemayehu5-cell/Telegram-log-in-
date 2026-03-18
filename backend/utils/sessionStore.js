// Simple in-memory session store (no Redis needed)
class SessionStore {
  constructor() {
    this.store = new Map();
    console.log('📦 Session store initialized (in-memory)');
    
    // Clean up expired sessions every hour
    setInterval(() => this.cleanup(), 3600000);
  }

  async set(key, value, expiry = 3600) {
    this.store.set(key, {
      value,
      expiry: Date.now() + (expiry * 1000)
    });
    // console.log(`✅ Session set: ${key} (expires in ${expiry}s)`);
    return true;
  }

  async get(key) {
    const data = this.store.get(key);
    if (!data) return null;
    
    if (Date.now() > data.expiry) {
      this.store.delete(key);
      return null;
    }
    
    return data.value;
  }

  async delete(key) {
    const deleted = this.store.delete(key);
    // console.log(`🗑️ Session deleted: ${key}`);
    return deleted;
  }

  cleanup() {
    const now = Date.now();
    let deletedCount = 0;
    
    for (const [key, data] of this.store.entries()) {
      if (now > data.expiry) {
        this.store.delete(key);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} expired sessions`);
    }
  }

  // For debugging
  getSize() {
    return this.store.size;
  }

  // List all active sessions (for debugging)
  listSessions() {
    const sessions = [];
    const now = Date.now();
    
    for (const [key, data] of this.store.entries()) {
      sessions.push({
        key,
        expiresIn: Math.round((data.expiry - now) / 1000),
        valid: now < data.expiry
      });
    }
    
    return sessions;
  }
}

module.exports = SessionStore;