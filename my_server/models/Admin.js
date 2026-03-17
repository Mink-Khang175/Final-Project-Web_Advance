const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  name: { type: String, default: 'Administrator' },
  isActive: { type: Boolean, default: true },
  permissions: [{ type: String }],
  lastLoginAt: { type: Date }
}, { timestamps: true });

function createAdminModel(connection) {
  if (connection.models.Admin) return connection.models.Admin;
  return connection.model('Admin', adminSchema, 'Admin');
}

const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema, 'Admin');

module.exports = {
  Admin,
  adminSchema,
  createAdminModel
};
