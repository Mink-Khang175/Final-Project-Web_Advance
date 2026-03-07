const mongoose = require('mongoose');

const profileUpdateHistorySchema = new mongoose.Schema({
  field: { type: String, required: true },
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  phone: String,
  address: String,
  city: String,
  postalCode: String,
  country: String,
  dateOfBirth: String,
  gender: String,
  role: { type: String, default: 'customer' },
  avatar: String,
  membershipLevel: { type: String, default: 'Silver' },
  totalSpent: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  profileUpdateHistory: [profileUpdateHistorySchema]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema, 'Users');
