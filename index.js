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


dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

connectToMongo();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true, // Allow authentication (cookies)
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", authenticate, orderRoutes);
app.use("/api/cart", CartRoutes);

app.listen(port, () => {
  console.info(`Ecommerce app listening at http://localhost:${port}`);
});
