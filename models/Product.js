const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: String,
  price: Number,
  description: String,
  stock: Number,
  category: String,
  images: [String] 
});

module.exports = mongoose.model('Product', ProductSchema);
