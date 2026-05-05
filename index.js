const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();
const app = express();

// ✅ Allowed origins
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5500",
  "http://192.168.0.105:5500",
  "https://twinkleweetphyn.onrender.com",
  "https://api.twinkleweetphyn.com.ng",
  "https://twinkleweetphyn.com.ng",
  "https://www.twinkleweetphyn.com.ng", // ✅ ADD THIS
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("Blocked by CORS:", origin);
      callback(null, false); // 🔥 DON'T THROW ERROR
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

// ❌ REMOVE THIS LINE COMPLETELY (CAUSE OF YOUR ERROR)
// app.options('*', cors(corsOptions));


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

/*
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
  "https://twinkleweetphyn.onrender.com", 
  "https://api.twinkleweetphyn.com.ng",
  "https://twinkleweetphyn.com.ng",
  "https://twinkleweetphyn.onrender.com"
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
const router = require('./routes/adminRoutes');


// Use Routes
app.use('/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/coustomer',coustomerRoutes);

app.get('/', (req, res)=>{
res.send('welcome to our store')
})

// Connect to DB and Start Server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch(err => console.error(err));

/*
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
    */