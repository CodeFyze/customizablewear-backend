// import jwt from "jsonwebtoken";
// import User from "../Models/User.js";
// const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
// import dotenv from 'dotenv';


// dotenv.config();
// const authenticate = async (req, res, next) => {
//   try {
//     // Get token from cookies and check if it exists
//     const token = req.cookies.accessToken;
//     if (!token) {
//       return res.status(401).json({ success: false, message: "Unauthorized - No token provided" });
//     }

//     // Verify token
//     const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);

//     const user = await User.findById(decoded.user.id).select("tokenVersion");
//     if (!user || user.tokenVersion !== decoded.user.tokenVersion) {
//       return res.status(401).json({
//         success: false,
//         message: "Unauthorized - Token is no longer valid, please login again",
//       });
//     }

//     req.user = { id: decoded.user.id };
//     next();
//   } catch (error) {
//     if (error.name === "JsonWebTokenError") {
//       console.error("JWT Error:", error.message);
//     } else {
//       console.error("Authentication Error:", error.message);
//     }
//     res.status(401).json({
//       success: false,
//       message: "Please authenticate using a valid token",
//     });
//   }
// };




// export default authenticate;


import jwt from "jsonwebtoken";
import User from "../Models/User.js"; 
import dotenv from "dotenv";
dotenv.config();

const authenticate = async (req, res, next) => {
  try {
    // ✅ Get token from Cookies OR Authorization Header
    let token = req.cookies.accessToken;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1]; 
    }

    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized - No token provided" });
    }

    // ✅ Verify JWT token using the correct secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET); 

    // ✅ Check if user exists and tokenVersion matches
    const user = await User.findById(decoded.user.id).select("tokenVersion role");
    if (!user || user.tokenVersion !== decoded.user.tokenVersion) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Token is no longer valid, please login again",
      });
    }

    // ✅ Attach user details to request
    req.user = { id: user._id.toString(), role: user.role };

    next();
  } catch (error) {
    console.error("Authentication Error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Please authenticate using a valid token",
    });
  }
};

export default authenticate;
