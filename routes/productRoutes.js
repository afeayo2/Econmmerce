const express = require("express");
const Product = require("../models/Product");
const router = express.Router();

// Public: Get all products
// ✅ .lean() skips Mongoose document hydration and returns plain JS objects —
// noticeably faster for read-only endpoints like this one, especially as the
// catalog grows.
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 }).lean();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: Get single product
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
