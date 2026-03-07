const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  originalPrice: Number,
  discount: Number,
  image: String,
  description: String,
  sizes: [String],
  colors: [String],
  stock: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  soldCount: { type: Number, default: 0 },
  isNewArrival: { type: Boolean, default: false },
  isBestSeller: { type: Boolean, default: false },
  tags: [String],
  material: String,
  careInstructions: String
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema, 'Products');
