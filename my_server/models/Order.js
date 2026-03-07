const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: String,
  price: Number,
  quantity: Number,
  size: String,
  color: String
});

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  orderNumber: { type: String, required: true, unique: true },
  items: [orderItemSchema],
  totalAmount: { type: Number, required: true },
  shippingAddress: String,
  paymentMethod: String,
  status: { type: String, default: 'pending' }, // pending, processing, shipped, delivered, cancelled
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema, 'Orders');
