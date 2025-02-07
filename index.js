import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import connectToMongo from './DB/db.js';
import authRoutes from './Routes/auth.routes.js';
import productRoutes from './Routes/product.routes.js';
import orderRoutes from './Routes/order.routes.js';
import authenticate from './Middleware/authenticate.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Connect to database
connectToMongo();

// ✅ Fix CORS Middleware
app.use(cors({
  origin: 'http://localhost:5173', // ✅ Allow only your frontend
  credentials: true, // ✅ Allow authentication (cookies)
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // ✅ Allowed methods
  allowedHeaders: ['Content-Type', 'Authorization'], // ✅ Allowed headers
}));

app.use(express.json());
app.use(cookieParser());

// Define routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes); // ✅ Ensure this matches frontend request
app.use('/api/orders', authenticate, orderRoutes);

app.listen(port, () => {
  console.info(`Ecommerce app listening at http://localhost:${port}`);
});
