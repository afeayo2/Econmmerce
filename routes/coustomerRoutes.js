// routes/authRoutes.js
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();
const { protect, protectAdmin } = require("../middlewares/authMiddleware");
const Order = require('../models/Order');
const { initializePayment, verifyPayment } = require('../config/paystack');
const Product = require("../models/Product");
const axios = require("axios");
//const sendMail = require("../config/mailer");
const { sendMail } = require("../config/mailer"); 



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


// routes/authRoutes.js (inside checkout route)
router.post('/checkout', protect, async (req, res) => {
  try {
    const { address, phone, items, paymentMethod } = req.body;

    console.log("📦 Checkout Payload:", JSON.stringify(req.body, null, 2));

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const dbUser = req.user;
    let totalAmount = 0;

    // Map items with per-item customization
    const orderItems = [];
for (let item of items) {
  const product = await Product.findById(item.productId);
  if (!product) {
    return res.status(404).json({ error: `Product ${item.name} not found` });
  }

  if (product.stock < item.quantity) {
    return res.status(400).json({ error: `Not enough stock for ${item.name}` });
  }

  let customization = undefined;
  // ✅ allow any category containing "customized" to require customization
  if (/customized/i.test(product.category)) {
    if (!item.customization?.customName || !item.customization?.font || !item.customization?.color) {
      return res.status(400).json({ error: `Customization details required for ${item.name}` });
    }
    customization = {
      customName: item.customization.customName,
      font: item.customization.font,
      color: item.customization.color
    
    };
  }

  totalAmount += product.price * item.quantity;

  orderItems.push({
    productId: product._id,
    name: product.name,
    price: product.price,
    quantity: item.quantity,
    customization // ✅ now saved into DB
  });
}


    // ✅ Create order
    const order = new Order({
      user: dbUser._id,
      customerName: dbUser.name,
      email: dbUser.email,
      address,
      phone,
      items: orderItems,
      totalAmount,
      paymentMethod,
      paymentStatus: "pending",
      status: "Pending"
    });

    await order.save();

    // ✅ Paystack flow
    if (paymentMethod === 'paystack') {
      const paystackRes = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email: dbUser.email,
          amount: totalAmount * 100,
          reference: `order_${order._id}`,
          callback_url: `https://econmmerce-f364.vercel.app/coustomer/verify/${order._id}`
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
          bankName: 'Opay',
          accountNumber: '6104896244',
          accountName: 'TWINKLEWEETPHYN',
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
router.get('/my-orders', protect, async (req, res) => {
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
      const order = await Order.findById(orderId)
        .populate("user")
        .populate("items.productId", "name images");

      if (order) {
        order.paymentStatus = 'paid';
        order.paystackRef = reference;
        await order.save();

        // ✅ Build product rows
        const itemsHtml = order.items.map(item => `
          <tr style="border-bottom:1px solid #eee;">
            <td style="padding:10px; text-align:center;">
              <img src="${item.productId?.images || 'https://via.placeholder.com/80'}" 
                   alt="${item.name}" width="80" 
                   style="border-radius:6px;"/>
            </td>
            <td style="padding:10px; text-align:left;">
              <strong>${item.name}</strong><br>
              Qty: ${item.quantity}<br>
              ₦${item.price.toLocaleString()}
              ${item.customization ? `
                <br><small style="color:#555;">
                  <b>Customization:</b> ${item.customization.customName} | 
                  Font: ${item.customization.font} | 
                  Color: ${item.customization.color}
                </small>
              ` : ""}
            </td>
          </tr>
        `).join("");

        // ✅ Send beautiful email with logo
        await sendMail({
          to: order.email,
          subject: "✅ Order Placed Successfully",
          html: `
            <div style="font-family:Arial,sans-serif; max-width:600px; margin:auto; border:1px solid #eee; border-radius:10px; overflow:hidden;">
              
              <!-- Logo Section -->
              <div style="background:#f9f9f9; padding:20px; text-align:center;">
                <img src="https://res.cloudinary.com/dtuvdlurv/image/upload/v1758367499/ecommerce-products/tiyvojgkqhcujnjiazlf.png" alt="My Store Logo" width="150" style="max-width:150px;">
              </div>

              <!-- Header -->
              <div style="background:#4CAF50; color:white; padding:20px; text-align:center;">
                <h2 style="margin:0;">🎉 Thank You for Your Order!</h2>
              </div>

              <!-- Body -->
              <div style="padding:20px;">
                <p>Hi <strong>${order.customerName}</strong>,</p>
                <p>Your order <strong>#${order._id}</strong> has been placed successfully.</p>

                <p style="font-size:16px; margin:10px 0;">
                  <b>Total Amount:</b> ₦${order.totalAmount.toLocaleString()}
                </p>

                <!-- Order Items -->
                <h3 style="margin-top:30px; border-bottom:1px solid #ddd; padding-bottom:5px;">🛍️ Order Summary</h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-top:10px;">
                  ${itemsHtml}
                </table>

                <!-- Shipping Info -->
                <h3 style="margin-top:30px; border-bottom:1px solid #ddd; padding-bottom:5px;">📦 Shipping Info</h3>
                <p>
                  <b>Address:</b> ${order.address}<br>
                  <b>Phone:</b> ${order.phone}
                </p>

                <!-- Footer -->
                <p style="margin-top:20px;">We’ll notify you when your order is shipped.</p>
                <p style="margin-top:30px; font-size:14px; color:#777;">
                  Best regards,<br><b>Twinkleweetphyn  Team</b>
                </p>
              </div>
            </div>
          `
        });
      }

      return res.redirect(`https://twinkleweetphyn.onrender.com/order-success.html?orderId=${orderId}`);
    }

    res.redirect(`/order-failed.html?reason=verification_failed`);
  } catch (err) {
    console.error("❌ Paystack verify error:", err.response?.data || err.message);
    res.redirect(`/order-failed.html?reason=server_error`);
  }
});



// Get one order by ID (customer must own it)
router.get('/orders/:id', protect, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate("items.productId", "name images price");

    if (!order) return res.status(404).json({ error: "Order not found" });

    res.json(order);
  } catch (err) {
    console.error("❌ Get order error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


module.exports = router;
