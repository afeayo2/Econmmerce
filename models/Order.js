// models/Order.js
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  customerName: { type: String, required: true }, // from User.name
  email: { type: String, required: true },
  address: { type: String, required: true },
  phone: String,
   items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
      name: String,
      price: Number,
      quantity: Number,
      customization: {
        customName: String,
        font: String,
        color: String
      }
    }
  ],
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ["paystack", "bank_transfer"], required: true },
  paymentStatus: { type: String, enum: ["pending", "paid"], default: "pending" }, // 💳 Payment
  status: { // 🚚 Order lifecycle
    type: String,
    enum: ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"],
    default: "Pending"
  },
  paystackRef: String,
  shipping: {
    courier: String,
    trackingNo: String,
    estimatedDelivery: Date,
    note: String
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Order", orderSchema);
