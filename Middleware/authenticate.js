import jwt from "jsonwebtoken";
import User from "../Models/User.js";
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
import dotenv from 'dotenv';


dotenv.config();
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized - No token provided" });
    }

    // Verify token
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    console.log("Decoded token:", decoded);

    const user = await User.findById(decoded.user.id).select("tokenVersion");
    if (!user || user.tokenVersion !== decoded.user.tokenVersion) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Token is no longer valid, please login again",
      });
    }

    req.user = { id: decoded.user.id };
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      console.error("JWT Error:", error.message);
    } else {
      console.error("Authentication Error:", error.message);
    }
    res.status(401).json({
      success: false,
      message: "Please authenticate using a valid token",
    });
  }
};




export default authenticate;


