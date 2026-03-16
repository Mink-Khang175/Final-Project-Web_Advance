const mongoose = require('mongoose');

const returnItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: String,
  price: Number,
  quantity: Number,
  size: String,
  color: String
}, { _id: false });

const returnsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  orderNumber: { type: String, required: true },
  reason: { type: String, default: 'Customer requested return' },
  status: { type: String, default: 'requested' },
  totalAmount: Number,
  items: [returnItemSchema],
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

returnsSchema.index({ userId: 1, orderId: 1 }, { unique: true });

module.exports = mongoose.model('Returns', returnsSchema, 'Returns');
