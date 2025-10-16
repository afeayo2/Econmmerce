const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();
const app = express();
app.use(express.json());



const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5500",
  "http://192.168.0.105:5500", 
  "https://express-js-on-vercel-rust-eight.vercel.app", 
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);



process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Import Routes
const adminRoutes = require('./routes/adminRoutes');
const productRoutes = require('./routes/productRoutes');
const coustomerRoutes = require('./routes/coustomerRoutes');


// Use Routes
app.use('/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/coustomer',coustomerRoutes);


/*
// Connect to DB and Start Server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch(err => console.error(err));
*/

module.exports = app;


if (process.env.NODE_ENV !== 'production') {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => {
      console.log('MongoDB Connected');
      app.listen(process.env.PORT || 5000, () => {
        console.log(`Server running locally on port ${process.env.PORT || 5000}`);
      });
    })
    .catch(err => console.error(err));
}