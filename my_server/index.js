require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');

const app = express();
const CHAT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_API_VERSION = process.env.GEMINI_API_VERSION || 'v1beta';
const CHAT_REQUEST_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 20000);

async function callGenerateContent(apiKey, target, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHAT_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/${target.version}/models/${target.model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const json = await response.json();
    const reply = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return { ok: response.ok && Boolean(reply), reply, errorMessage: json?.error?.message || '', target };
  } catch (error) {
    return { ok: false, reply: '', errorMessage: error?.name === 'AbortError' ? 'Assistant request timeout.' : error.message || 'Network error.', target };
  } finally {
    clearTimeout(timeout);
  }
}

// Import Models
const User = require('./models/User');
const Product = require('./models/Product');
const Cart = require('./models/Cart');
const Order = require('./models/Order');
const Wishlist = require('./models/Wishlist');
const Returns = require('./models/Returns');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));

// MongoDB Connection - Kết nối đến MongoDB Atlas (clothing_shop)
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env file');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas successfully!');
    console.log('📊 Database: clothing_shop');
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// ==================== AI CHAT ROUTES ====================
app.post('/api/chat/assistant', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'GEMINI_API_KEY is not configured.' });
    }

    const { message, history = [], userName = 'customer', model: modelFromClient, apiVersion: apiVersionFromClient } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    const systemPrompt = [
      'You are Ava, a premium customer support assistant for AVANT ATELIER.',
      'Primary goals: be professional, warm, clear, and solution-focused.',
      'Always mirror the customer language (Vietnamese/English).',
      'Use this response style: (1) brief empathy line, (2) direct answer, (3) practical next step.',
      'For product consultation, include fit advice, styling tip, and one alternative recommendation.',
      'For shipping/returns/payment/policy questions: give accurate guidance only from known context.',
      'If policy details are missing, explicitly say you need to confirm and offer to connect to human support.',
      'Never fabricate order status, stock numbers, delivery dates, or discounts.',
      'Do not be robotic; keep replies concise (normally 3-6 sentences) and easy to scan.',
      `Customer name: ${userName}. Address naturally and respectfully.`
    ].join(' ');

    const normalizedHistory = Array.isArray(history)
      ? history.slice(-4).map((m) => ({
          role: m?.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(m?.text || '') }]
        })).filter((m) => m.parts[0].text.trim())
      : [];

    const payload = {
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        ...normalizedHistory,
        { role: 'user', parts: [{ text: String(message).trim() }] }
      ],
      generationConfig: {
        temperature: 0.6,
        topP: 0.9,
        maxOutputTokens: 220
      }
    };

    const primaryTarget = {
      version: apiVersionFromClient || GEMINI_API_VERSION,
      model: modelFromClient || CHAT_MODEL
    };

    const primaryAttempt = await callGenerateContent(apiKey, primaryTarget, payload);
    if (primaryAttempt.ok) {
      return res.json({
        success: true,
        data: {
          reply: primaryAttempt.reply,
          model: `${primaryAttempt.target.model}@${primaryAttempt.target.version}`
        }
      });
    }

    // One lightweight retry for timeout cases to improve stability without adding full fallback overhead.
    if ((primaryAttempt.errorMessage || '').toLowerCase().includes('timeout')) {
      const retryPayload = {
        contents: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'user', parts: [{ text: String(message).trim() }] }
        ],
        generationConfig: {
          temperature: 0.5,
          topP: 0.8,
          maxOutputTokens: 140
        }
      };

      const retryAttempt = await callGenerateContent(apiKey, primaryTarget, retryPayload);
      if (retryAttempt.ok) {
        return res.json({
          success: true,
          data: {
            reply: retryAttempt.reply,
            model: `${retryAttempt.target.model}@${retryAttempt.target.version}`
          }
        });
      }

      return res.status(500).json({
        success: false,
        message: retryAttempt.errorMessage || primaryAttempt.errorMessage || 'Assistant is temporarily unavailable.'
      });
    }

    return res.status(500).json({
      success: false,
      message: primaryAttempt.errorMessage || 'Assistant is temporarily unavailable.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Unexpected server error.' });
  }
});

// ==================== USER ROUTES ====================
// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Register new user
app.post('/api/users/register', async (req, res) => {
  try {
    const { email, password, name, phone, address } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    const user = new User({ email, password, name, phone, address });
    await user.save();
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Login user
app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new user
app.post('/api/users', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update user
app.put('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Track changed profile fields
    const trackedFields = ['name', 'email', 'password', 'phone', 'address', 'city', 'postalCode', 'country', 'dateOfBirth', 'gender'];
    const changes = [];
    for (const field of trackedFields) {
      if (req.body[field] !== undefined && req.body[field] !== (user[field] || '')) {
        changes.push({
          field,
          oldValue: user[field] || '',
          newValue: req.body[field],
          updatedAt: new Date()
        });
      }
    }

    // Apply updates
    Object.assign(user, req.body);
    if (changes.length > 0) {
      user.profileUpdateHistory.push(...changes);
    }
    await user.save();

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== PRODUCT ROUTES ====================
// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json({ success: true, count: products.length, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get products by category
app.get('/api/products/category/:category', async (req, res) => {
  try {
    const products = await Product.find({ category: req.params.category });
    res.json({ success: true, count: products.length, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search products
app.get('/api/products/search/:keyword', async (req, res) => {
  try {
    const keyword = req.params.keyword;
    const products = await Product.find({
      $or: [
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { tags: { $in: [new RegExp(keyword, 'i')] } }
      ]
    });
    res.json({ success: true, count: products.length, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new product
app.post('/api/products', async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== CART ROUTES ====================
// Get cart by user ID
app.get('/api/cart/:userId', async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.params.userId }).populate('items.productId');
    res.json({ success: true, data: cart });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add item to cart
app.post('/api/cart', async (req, res) => {
  try {
    const { userId, item } = req.body;
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [item], totalAmount: item.price * item.quantity });
    } else {
      const existingIndex = cart.items.findIndex(
        i => i.productId?.toString() === item.productId && i.size === item.size && i.color === item.color
      );
      if (existingIndex > -1) {
        cart.items[existingIndex].quantity += item.quantity;
      } else {
        cart.items.push(item);
      }
      cart.totalAmount = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    }
    await cart.save();
    res.json({ success: true, data: cart });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update cart item quantity
app.put('/api/cart/:userId/item/:itemId', async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.params.userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }
    const item = cart.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }
    item.quantity = req.body.quantity;
    cart.totalAmount = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    await cart.save();
    res.json({ success: true, data: cart });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove item from cart
app.delete('/api/cart/:userId/item/:itemId', async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.params.userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }
    cart.items.pull({ _id: req.params.itemId });
    cart.totalAmount = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    await cart.save();
    res.json({ success: true, data: cart });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Clear entire cart
app.delete('/api/cart/:userId', async (req, res) => {
  try {
    const cart = await Cart.findOneAndDelete({ userId: req.params.userId });
    res.json({ success: true, message: 'Cart cleared successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ORDER ROUTES ====================
const generateOrderNumber = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const time = String(now.getTime()).slice(-6);
  const random = Math.floor(100 + Math.random() * 900);
  return `ORD-${y}${m}${d}-${time}${random}`;
};

// Get all orders
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().populate('userId');
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get orders by user ID
app.get('/api/orders/user/:userId', async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId });
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new order
app.post('/api/orders', async (req, res) => {
  try {
    const payload = {
      ...req.body,
      orderNumber: req.body.orderNumber || generateOrderNumber()
    };
    const order = new Order(payload);
    await order.save();
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update order status
app.put('/api/orders/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete order
app.delete('/api/orders/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== WISHLIST ROUTES ====================
app.get('/api/wishlist/:userId', async (req, res) => {
  try {
    const items = await Wishlist.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json({ success: true, count: items.length, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/wishlist', async (req, res) => {
  try {
    const { userId, productId, productName, image, price, category } = req.body;
    const item = await Wishlist.findOneAndUpdate(
      { userId, productId: String(productId) },
      {
        $setOnInsert: {
          userId,
          productId: String(productId),
          productName,
          image,
          price,
          category
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/wishlist/:userId/:productId', async (req, res) => {
  try {
    await Wishlist.findOneAndDelete({ userId: req.params.userId, productId: String(req.params.productId) });
    res.json({ success: true, message: 'Removed from wishlist' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== RETURNS ROUTES ====================
app.get('/api/returns/user/:userId', async (req, res) => {
  try {
    const items = await Returns.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json({ success: true, count: items.length, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/returns', async (req, res) => {
  try {
    const { userId, orderId, orderNumber, reason, items, totalAmount } = req.body;
    const existing = await Returns.findOne({ userId, orderId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Return request already exists for this order' });
    }

    const doc = new Returns({
      userId,
      orderId,
      orderNumber,
      reason,
      items,
      totalAmount,
      status: 'requested'
    });
    await doc.save();

    await Order.findByIdAndUpdate(orderId, { status: 'return_requested' });

    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`API endpoints:`);
  console.log(`   - GET  http://localhost:${PORT}/api/users`);
  console.log(`   - GET  http://localhost:${PORT}/api/products`);
  console.log(`   - GET  http://localhost:${PORT}/api/orders`);
  console.log(`   - GET  http://localhost:${PORT}/api/wishlist/:userId`);
  console.log(`   - GET  http://localhost:${PORT}/api/returns/user/:userId`);
});
