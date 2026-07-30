/*const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: String,
  price: Number,
  description: String,
  stock: Number,
  category: String,
  images: [String] 
});

module.exports = mongoose.model('Product', ProductSchema);
*/

const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    category: {
      type: String,
      enum: [
        "Moissanite Diamond Jewelry",
        "Customized Jewelry (Pre-Order)",
        "Wristwatch",
        "Jewelry Set"
      ],
      required: true,
    },
   subCategory: {
  type: String,
  enum: ["Necklace", "Earring", "Bracelet", "Ring", "Name", "Font", "Colour"],
  default: null
},
    images: [String],
  },
  { timestamps: true }
);

// ✅ Indexes: these fields are filtered/sorted on constantly (shop page, category
// filters, admin listing) — without them Mongo does a full collection scan on
// every request, which gets slower as the catalog grows.
productSchema.index({ category: 1 });
productSchema.index({ subCategory: 1 });
productSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Product", productSchema);
