import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectToMongo from "./DB/db.js";
import authRoutes from "./Routes/auth.routes.js";
import productRoutes from "./Routes/product.routes.js";
import orderRoutes from "./Routes/order.routes.js";
import authenticate from "./Middleware/authenticate.js";
import CartRoutes from "./Routes/cartRoute.js";
import promoCodeRoutes from "./Routes/promoRoute.js"
import BundleRoute from "./Routes/bundleRoute.js"

import contactRoutes from "./Routes/contact.routes.js"

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

connectToMongo();

app.use(
	cors({
		origin: ['http://localhost:5173', 'http://localhost:5174'],
		credentials: true, // Allow authentication (cookies)
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
		allowedHeaders: ['Content-Type', 'Authorization'],
	}),
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use('/api/bundle', BundleRoute);
app.use("/api/orders", authenticate, orderRoutes);
app.use("/api/cart", CartRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/promocodes', promoCodeRoutes);

app.listen(port, () => {
  console.info(`Ecommerce app listening at http://localhost:${port}`);
});
