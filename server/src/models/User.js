const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
    },
    location: {
      lat: { type: Number },
      lng: { type: Number },
      address: { type: String, trim: true },
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  }
);

// ──────────────────────────────────────────────
// Pre-save hook: hash password before storing
// ──────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  // Only hash if the password field was modified
  if (!this.isModified('passwordHash')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────
// Instance method: compare password
// ──────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Strip passwordHash from JSON output
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
