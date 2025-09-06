// routes/authRoutes.js
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/Coustomer');
const router = express.Router();
const auth = require('../middlewares/coustomer');
const Order = require('../models/Order');
const { initializePayment, verifyPayment } = require('../config/paystack');
const Product = require("../models/Product");
const axios = require("axios");



// Register
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ error: 'Email already exists' });

        user = new User({ name, email, password });
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || !(await user.comparePassword(password))) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Checkout
router.post('/checkout', auth, async (req, res) => {
    try {
        const { address, phone, items, paymentMethod } = req.body;

        // 🔍 Debug incoming payload
        console.log("📦 Checkout Payload:", JSON.stringify(req.body, null, 2));

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        let totalAmount = 0;
        for (let item of items) {
            // ✅ Use productId instead of id
            const product = await Product.findById(item.productId);

            if (!product) {
                console.warn(`⚠️ Product not found:`, item.productId);
                return res.status(404).json({ error: `Product ${item.name} not found` });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({ error: `Not enough stock for ${item.name}` });
            }

            totalAmount += product.price * item.quantity;
        }

        // ✅ Save correct productId into Order
        const order = new Order({
            user: req.user._id,
            customerName: req.user.name,
            email: req.user.email,
            address,
            phone,
            items: items.map(p => ({
                productId: p.productId,   // 🔥 FIXED
                quantity: p.quantity,
                price: p.price,
                name: p.name
            })),
            totalAmount,
            paymentMethod,
            status: paymentMethod === 'bank_transfer' ? 'pending_payment' : 'awaiting_paystack'
        });

        await order.save();

        // ✅ Paystack flow
        if (paymentMethod === 'paystack') {
            const paystackRes = await axios.post(
                'https://api.paystack.co/transaction/initialize',
                {
                    email: req.user.email,
                    amount: totalAmount * 100,
                    reference: `order_${order._id}`,
                    callback_url: `http://localhost:3000/coustomer/verify/${order._id}`
                },
                { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
            );

            order.paystackRef = paystackRes.data.data.reference;
            await order.save();

            return res.json({ paymentUrl: paystackRes.data.data.authorization_url });
        }

        // ✅ Bank transfer flow
        if (paymentMethod === 'bank_transfer') {
            return res.json({
                message: 'Please transfer the amount to the account below',
                bankDetails: {
                    bankName: 'Example Bank',
                    accountNumber: '1234567890',
                    accountName: 'My Store Ltd.',
                    amount: totalAmount
                }
            });
        }

    } catch (err) {
        console.error("❌ Checkout error:", err);
        res.status(500).json({ error: 'Checkout error' });
    }
});

// routes/orderRoutes.js
router.get('/my-orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('items.productId', 'name images price'); 
      // 👆 populate product name, images, price

    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});




router.get('/verify/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reference } = req.query;

        const verification = await verifyPayment(reference);

        if (verification.data.status === 'success') {
            const order = await Order.findById(orderId);
            if (order) {
                order.paymentStatus = 'paid';
                order.paystackRef = reference;
                await order.save();
            }

            //  Redirect to frontend confirmation page
            return res.redirect(`http://127.0.0.1:5500/order-success.html`);
        }

        res.redirect(`/order-failed.html?reason=verification_failed`);
    } catch (err) {
        console.error("❌ Paystack verify error:", err.response?.data || err.message);
        res.redirect(`/order-failed.html?reason=server_error`);
    }
});


module.exports = router;
