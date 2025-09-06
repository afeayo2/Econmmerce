const express = require("express");
const multer = require("multer");
const Product = require("../models/Product");
const protectAdmin = require("../middlewares/authMiddleware");
const { storage } = require("../config/cloudinary");

const upload = multer({ storage });
const router = express.Router();

// Add product (Admin Only)
router.post("/", protectAdmin, upload.single("image"), async (req, res) => {
  try {
    const { name, description, price, stock, category } = req.body;

    // Cloudinary gives file info in req.file
    const imageUrl = req.file.path; // Cloudinary URL

    const product = new Product({
      name,
      description,
      price,
      stock,
      category,
      images: [req.file.path], // ✅ Correct field name
    });

    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get single product by ID
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Update product (Admin Only)

router.put("/:id", protectAdmin, upload.single("image"), async (req, res) => {
  try {
    const { name, description, price, stock, category } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Update fields
    if (name) product.name = name;
    if (description) product.description = description;
    if (price) product.price = price;
    if (stock) product.stock = stock;
    if (category) product.category = category;

    // If a new image is uploaded, replace the old one
    if (req.file) {
      // Delete old images from Cloudinary
      for (let imgUrl of product.images) {
        const publicId = imgUrl.split("/").pop().split(".")[0]; // extract public_id
        await cloudinary.uploader.destroy(publicId);
      }
      product.images = [req.file.path];
    }

    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete product (Admin Only)
router.delete("/:id", protectAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Delete images from Cloudinary
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

router.get("/", async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

module.exports = router;
