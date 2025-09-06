// models/Order.js
const mongoose = require('mongoose');

// models/Order.js
const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "Coustomer", required: true }, // 👈 Add this
    customerName: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
    phone: String,
    items: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
            name: String,
            price: Number,
            quantity: Number
        }
    ],
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['paystack', 'bank_transfer'], required: true },
    paymentStatus: { type: String, default: 'pending' },
    paystackRef: String,
    createdAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model('Order', orderSchema);

