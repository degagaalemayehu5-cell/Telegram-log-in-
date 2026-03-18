const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  // Who owns this session in your application
  ownerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
    index: true
  },
  
  // Account this session belongs to (the phone number)
  accountPhone: { 
    type: String, 
    required: true,
    index: true
  },
  
  // RAW SESSION DATA (ENCRYPTION REMOVED)
  // We no longer store iv, encryptedData, or authTag.
  // We store the session string as plain text.
  sessionData: {
    type: String,
    required: true
  },
  
  // Metadata for tracking the connection
  dcId: { type: Number }, // Telegram data center
  deviceInfo: {
    name: String,
    platform: String,
    lastIp: String
  },
  
  // Security and activity tracking
  createdAt: { type: Date, default: Date.now, index: true },
  lastUsed: { type: Date, index: true },
  expiresAt: { type: Date, index: true },
  
  // Status flags
  isValid: { type: Boolean, default: true },
  compromised: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Automatically remove expired sessions from the database
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// --- Methods ---

// Update the last used timestamp when the session is accessed
sessionSchema.methods.markUsed = async function() {
  this.lastUsed = new Date();
  return this.save();
};

// Manually invalidate a session
sessionSchema.methods.revoke = async function() {
  this.isValid = false;
  return this.save();
};

// --- Static Methods ---

// Find all active, non-expired sessions for a specific phone number
sessionSchema.statics.findValidByAccount = function(accountPhone) {
  return this.find({
    accountPhone,
    isValid: true,
    expiresAt: { $gt: new Date() }
  }).sort({ lastUsed: -1 });
};

// Remove any sessions that are no longer valid or have expired
sessionSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isValid: false }
    ]
  });
};

module.exports = mongoose.model('Session', sessionSchema);