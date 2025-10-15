const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();
const app = express();
app.use(express.json());


// Allowed origins for CORS
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5500"
  
]

app.use(
  cors({
    origin: allowedOrigins,
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



// Connect to DB and Start Server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch(err => console.error(err));
