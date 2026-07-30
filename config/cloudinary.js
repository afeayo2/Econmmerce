const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "ecommerce-products", // Folder in Cloudinary
    allowed_formats: ["jpg", "png", "jpeg", "webp"], // added webp
    // Cap stored size + auto-compress. Admin uploads (often straight from a
    // phone camera, several MB / 3000px+) were previously stored at full
    // original size, which is what was slowing product image loads down.
    // "limit" only shrinks images larger than this — it never upscales.
    transformation: [
      { width: 1600, height: 1600, crop: "limit", quality: "auto", fetch_format: "auto" }
    ],
  },
});

module.exports = { cloudinary, storage };
