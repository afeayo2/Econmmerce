const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Order = require("../models/Order");
//const protectAdmin = require("../middlewares/authMiddleware");
const { sendMail } = require("../config/mailer"); // custom mail utility
const { Parser } = require("json2csv"); // for CSV export
const multer = require("multer");
const Product = require("../models/Product");
const { protect, protectAdmin } = require("../middlewares/authMiddleware");
const { storage } = require("../config/cloudinary");
const cloudinary = require("cloudinary").v2;

const router = express.Router();

// ✅ File filter for images only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image uploads are allowed (jpg, jpeg, png, webp)"), false);
  }
};

const upload = multer({ storage, fileFilter });




// Admin Registration (One-time setup)

router.post('/register-admin', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ error: 'Admin already exists' });

        const admin = new User({ name, email, password, role: 'admin' });
        await admin.save();
        res.json({ message: 'Admin registered successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});




// ===== ORDERS MANAGEMENT =====

// Get all orders (Admin only)
router.get("/orders", protectAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("items.productId", "name images category")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ Update order status (approve payment / update shipping)
// ✅ Update order status (approve payment / update shipping)
router.put("/orders/:id", protectAdmin, async (req, res) => {
  try {
    console.log("🟢 Update Order Request:", req.params.id, req.body);

    const { status, paymentStatus, shipping } = req.body;
    const order = await Order.findById(req.params.id)
      .populate("user", "email name")
      .populate("items.productId", "name images");

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (status) {
      order.status = status;
      console.log("🔹 Updated order status:", status);
    }
    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
      console.log("🔹 Updated payment status:", paymentStatus);
    }
    if (shipping) {
      order.shipping = shipping;
      console.log("🔹 Updated shipping:", shipping);
    }

    await order.save();
    console.log("✅ Saved order:", order._id);

    // ✉️ Send lifecycle emails
    const recipient = order.user?.email || order.email;
    if (recipient) {
      let subject = "Order Update";
      let header = "Order Update";
      let message = `Your order <b>#${order._id}</b> is now <b>${order.status}</b>.`;

      switch (order.status) {
        case "Confirmed":
          subject = "✅ Order Confirmed";
          header = "Your Order is Confirmed 🎉";
          message = `Hi ${order.user?.name || order.customerName || "Customer"},<br>
          Your order <b>#${order._id}</b> has been confirmed.`;
          break;

        case "Shipped":
          subject = "📦 Order Shipped";
          header = "Your Order is on the Way 🚚";
          message = `Hi ${order.user?.name || order.customerName || "Customer"},<br>
          Your order <b>#${order._id}</b> has been shipped via 
          <b>${order.shipping?.courier || "our courier"}</b>.<br>
          Tracking No: <b>${order.shipping?.trackingNo || "N/A"}</b>.`;
          break;

        case "Delivered":
          subject = "🎊 Order Delivered";
          header = "Your Order has Arrived!";
          message = `Hi ${order.user?.name || order.customerName || "Customer"},<br>
          Your order <b>#${order._id}</b> has been delivered.<br>
          Thank you for shopping with us 💖`;
          break;

        case "Cancelled":
          subject = "⚠️ Order Cancelled";
          header = "Order Cancelled";
          message = `Hi ${order.user?.name || order.customerName || "Customer"},<br>
          Unfortunately, your order <b>#${order._id}</b> has been cancelled.`;
          break;
      }

      // Build items table
      const itemsHtml = order.items.map(item => `
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:10px; text-align:center;">
            <img src="${item.productId?.images || 'https://via.placeholder.com/80'}" 
                 alt="${item.name}" width="80" style="border-radius:6px;"/>
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

      // ✨ Beautiful Email with Logo + Status
      await sendMail({
        to: recipient,
        subject,
        html: `
          <div style="font-family:Arial,sans-serif; max-width:600px; margin:auto; border:1px solid #eee; border-radius:10px; overflow:hidden;">
            
            <!-- Logo -->
            <div style="background:#f9f9f9; padding:20px; text-align:center;">
              <img src="https://res.cloudinary.com/dtuvdlurv/image/upload/v1758367499/ecommerce-products/tiyvojgkqhcujnjiazlf.png" alt="My Store Logo" width="150" style="max-width:150px;">
            </div>

            <!-- Header -->
            <div style="background:#4CAF50; color:white; padding:20px; text-align:center;">
              <h2 style="margin:0;">${header}</h2>
            </div>

            <!-- Body -->
            <div style="padding:20px;">
              <p>${message}</p>

              <p><b>Order Total:</b> ₦${order.totalAmount.toLocaleString()}</p>

              <!-- Items -->
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
              <p style="margin-top:30px; font-size:14px; color:#777;">
                Best regards,<br><b>Twinkleweetphyn Team</b>
              </p>
            </div>
          </div>
        `
      });

      console.log("📧 Email sent to:", recipient);
    } else {
      console.warn("⚠️ No recipient email found for order:", order._id);
    }

    res.json(order);
  } catch (err) {
    console.error("❌ Admin update order error:", err);
    res.status(500).json({ error: err.message });
  }
});



// ===== CUSTOMERS MANAGEMENT =====

// Get all customers
router.get("/customers", protectAdmin, async (req, res) => {
  try {
    const customers = await User.find({ role: "customer" }).select("-password");
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a customer’s order history
router.get("/customers/:id/orders", protectAdmin, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.params.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== REPORTS =====

// Sales overview
router.get("/reports/overview", protectAdmin, async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalRevenueAgg = await Order.aggregate([
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);
    const totalRevenue = totalRevenueAgg[0]?.total || 0;

    const delivered = await Order.countDocuments({ paymentStatus: "delivered" });
    const pending = await Order.countDocuments({ paymentStatus: "pending" });

    res.json({ totalOrders, totalRevenue, delivered, pending });
  } catch (err) {
    res.status(500).json({ error: "Failed to get overview" });
  }
});


// Export sales report as CSV
router.get("/reports/export", protectAdmin, async (req, res) => {
  try {
    const orders = await Order.find().populate("user", "name email");

    const fields = ["_id", "user.name", "user.email", "status", "totalPrice", "createdAt"];
    const parser = new Parser({ fields });
    const csv = parser.parse(orders);

    res.header("Content-Type", "text/csv");
    res.attachment("sales-report.csv");
    return res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ✅ Add product with multiple images
// Add product (Admin Only)
/*router.post("/", protectAdmin, upload.array("images", 5), async (req, res) => {
  console.log("===== New Product Request =====");
  console.log("Body:", JSON.stringify(req.body, null, 2));
  console.log("Files:", JSON.stringify(req.files, null, 2));

  try {
    const { name, description, price, stock, category, subCategory } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ error: "Name, price, and category are required" });
    }

    const imageUrls = req.files ? req.files.map(file => file.path) : [];

    const product = new Product({
      name,
      description,
      price,
      stock,
      category,
      subCategory: subCategory || null,
      images: imageUrls,
    });

    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});*/





router.post("/", protectAdmin, upload.array("images", 5), async (req, res) => {
  try {
    console.log("📦 Received product POST");
    console.log("Body:", req.body);
    console.log("Files:", req.files);

    const { name, price, category, description, stock, subCategory } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ error: "Name, price, and category are required" });
    }

    const product = new Product({
      name,
      price: Number(price),
      stock: stock ? Number(stock) : 0,
      description,
      category,
      subCategory: subCategory || null,
      images: (req.files || []).map(f => f.path), // ✅ Cloudinary URLs
    });

    await product.save();
    res.status(201).json(product);
  } catch (err) {
    console.error("❌ Add Product Error:", err);
    res.status(500).json({ error: err.message });
  }
});



// ✅ Get all products
// GET /admin/products?page=1&limit=10
// ✅ Get all products (with pagination)
router.get("/products", protectAdmin, async (req, res) => {
  try {
    console.log("➡️ Reached /admin/products route");

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    console.log(`📄 Page: ${page}, Limit: ${limit}, Skip: ${skip}`);

    const total = await Product.countDocuments();
    console.log(`📦 Total products in DB: ${total}`);

    const products = await Product.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    console.log(`✅ Returning ${products.length} products`);

    res.json({
      products,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("❌ Error in /admin/products:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// ✅ Get single product
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




// ✅ Update product (supports multiple new images)
router.put("/:id", protectAdmin, upload.array("images", 5), async (req, res) => {
  try {
    const { name, description, price, stock, category } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Update fields if present
    if (name) product.name = name;
    if (description) product.description = description;
    if (price) product.price = price;
    if (stock) product.stock = stock;
    if (category) product.category = category;

    // Replace images if new ones are uploaded
    if (req.files && req.files.length > 0) {
      // Delete old images from Cloudinary
      for (let imgUrl of product.images) {
        const publicId = imgUrl.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      }
      product.images = req.files.map(file => file.path);
    }

    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ Delete product
router.delete("/:id", protectAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    for (let imgUrl of product.images) {
      const publicId = imgUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(publicId);
    }

    await product.deleteOne();
    res.json({ message: "Product and images removed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
