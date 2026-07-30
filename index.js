const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const compression = require('compression');

dotenv.config();
const app = express();

// ✅ Gzip compression for all responses (big perf win for JSON payloads)
app.use(compression());

// ✅ Allowed origins
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5500",
  "http://192.168.0.105:5500",
  "https://twinkleweetphyn.onrender.com",
  "https://api.twinkleweetphyn.com.ng",
  "https://twinkleweetphyn.com.ng",
  "https://www.twinkleweetphyn.com.ng",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    // Any GitHub Codespaces forwarded-port preview URL, e.g.
    // https://afeayo2-something-8080.app.github.dev
    const isCodespacesPreview = /\.app\.github\.dev$/.test(new URL(origin).hostname);

    // Any localhost/127.0.0.1 port, useful while testing locally with
    // different dev server ports (5500, 8080, etc.)
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

    if (allowedOrigins.includes(origin) || isCodespacesPreview || isLocalhost) {
      callback(null, true);
    } else {
      console.log("Blocked by CORS:", origin);
      callback(null, false);
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

// ✅ Body parser
app.use(express.json());

// ✅ Routes
const adminRoutes = require('./routes/adminRoutes');
const productRoutes = require('./routes/productRoutes');
const coustomerRoutes = require('./routes/coustomerRoutes');

app.use('/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/coustomer', coustomerRoutes);

// ✅ Test route
app.get('/', (req, res) => {
  res.send('Welcome to our store');
});

// ✅ Connect DB and start server safely
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });

  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
