import { validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import User from "../Models/User.js";
import { generateTokenAndSetCookie } from "../Utils/generateTokenAndSetCookie.js";
import sendEmail from "../Utils/sendEmail.js";
import jwt from "jsonwebtoken";
import uploadToAzure from '../Utils/uploadToAzureStorage.js';
import dotenv from "dotenv";
dotenv.config();


export const signup = async (req, res) => {
  try {
    console.log(req.body);
    
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("Validation errors:", errors.array());
      return res.status(400).json({
        success: false,
        message: `Validation errors - ${errors.array()[0].msg}`,
      });
    }

    // Hash the password
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(req.body.password, salt);
    req.body.password = hash;

    // Check if user already exists
    let user = await User.findOne({ email: req.body.email }).select("email verified");

    if (user) {
      // ✅ If user exists but is not verified, update it instead of creating a new one
      if (!user.verified) {
        console.log(`⚠️ Updating existing user (${user.email}) and marking as verified`);
        user.password = hash;
        user.verified = true;
        await user.save();
      } else {
        return res.status(400).json({
          success: false,
          message: "Sorry, a user with this email already exists",
        });
      }
    } else {
      // ✅ Create new user and mark as verified
      user = new User({ ...req.body, verified: true });
      await user.save();
    }

    // Generate JWT token for immediate authentication
    const jwtSecret = process.env.JWT_SECRET || "fallback_secret_key";
    const token = jwt.sign(
      { user: { id: user._id, tokenVersion: user.tokenVersion, role: user.role } },
      jwtSecret,
      { expiresIn: "1d" }
    );

    // Store token in HTTP-only cookies
    res.cookie("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    res.cookie("userRole", user.role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    res.status(201).json({
      success: true,
      message: "User created and logged in",
      token,
      user: { role: user.role },
    });

  } catch (error) {
    console.error("❌ Error in signup route", error);
    res.status(500).json({
      success: false,
      message: "An internal server error occurred",
    });
  }
};



export const login = async (req, res) => {
  try {
    console.log("🚀 Incoming Login Request:", req.body);

    // Validate Request Data
    if (!req.body.email || !req.body.password) {
      console.error("❌ Missing email or password in request");
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    // Find user by email
    let user = await User.findOne({ email: req.body.email }).select("password tokenVersion verified email role");

    if (!user) {
      console.error("❌ User not found with email:", req.body.email);
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // ✅ If the user is not verified, mark them as verified
    if (!user.verified) {
      console.log(`✅ Automatically verifying user (${user.email})`);
      user.verified = true;
      await user.save();
    }

    // Compare hashed passwords
    const isPasswordValid = await bcrypt.compare(req.body.password, user.password);
    if (!isPasswordValid) {
      console.error("❌ Invalid password for user:", req.body.email);
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }

    // Ensure JWT secret is set
    const jwtSecret = process.env.JWT_SECRET || "fallback_secret_key"; 
    if (!jwtSecret) {
      throw new Error("JWT_SECRET is missing from environment variables");
    }

    // ✅ Generate JWT Token
    const token = jwt.sign(
      { user: { id: user.id, tokenVersion: user.tokenVersion, role: user.role } },
      jwtSecret, 
      { expiresIn: "1d" }
    );

    // Store token in HTTP-only cookies
    res.cookie("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    res.cookie("userRole", user.role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    console.log("✅ Login successful for user:", user.email);

    res.status(200).json({
      success: true,
      message: "User signed in",
      token,
      user: { role: user.role },
    });

  } catch (error) {
    console.error("❌ Error in login route:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


export const getUserId = async (req, res) => {
  try {
    if (!req.cookies.userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    res.status(200).json({ success: true, userId: req.cookies.userId });
  } catch (error) {
    console.error("Error fetching user ID:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getUserIdFromOrder = async (req, res) => {
  try {
    // Check if userId exists in cookies
    if (!req.cookies.userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    // Return the user ID from cookies
    res.status(200).json({ success: true, userId: req.cookies.userId });
  } catch (error) {
    console.error("❌ Error fetching user ID from order module:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


export const logout = (req, res) => {
  try {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.status(200).json({ success: true, message: "User logged out" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An internal server error occured",
    });
    console.error("Error in logout route", error);
  }
};

export const refreshToken = async (req, res) => {
  try {
    // Get token from cookies and check if it exists
    const incomingToken = req.cookies.refreshToken;
    if (!incomingToken)
      return res.status(401).json({
        success: false,
        message: "Unauthorized - No refresh token in cookies, Redirect to login",
      });
    
    // Verify token and check if it is valid
    const decoded = jwt.verify(incomingToken, process.env.REFRESH_TOKEN_SECRET);
    if (!decoded)
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Invalid refresh token",
      });
    
    // Check if user exists and tokenVersion is same
    const user = await User.findById(decoded.user.id).select('tokenVersion');
    if (!user)
      return res.status(401).json({
        success: false,
        message: "Unauthorized - User does not exist, please login again",
      });
    if (user.tokenVersion !== decoded.user.tokenVersion)
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Token is no longer valid, please login again",
      });
    
    // Create and return a token
    const data = { user: { id: user.id, tokenVersion: user.tokenVersion } };
    const { refreshToken } = generateTokenAndSetCookie(data, res);
    user.refreshToken = refreshToken;

    await user.save();

    res.status(200).json({ success: true, message: "Token refreshed" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An internal server error occured",
    });
    console.error("Error in refreshToken route", error);
  }
}

export const forgetPassword = async (req, res) => {
  try {
    // If there are errors, return Bad request and the errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error(errors.array());
      return res.status(400).json({
        success: false,
        message: `Validation errors - ${errors.array()[0].msg}`,
      });
    }

    // Check if user exists
    let user = await User.findOne({ email: req.body.email }).select("email otp otpExpires");
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "Please enter valid credentials" });

    const otp = user.generateOTP();
    const message = `Your password reset OTP is :- \n\n ${otp} \n\nIf you have not requested this email then, please ignore it.`;

    await sendEmail({
      email: user.email,
      subject: "Ecommerce password Recovery",
      message,
    });
    
    // Save the user
    await user.save();

    res.status(200).json({
      success: true,
      message: `Email sent to ${user.email} successfully `,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An internal server error occured",
    });
    console.error("Error in forgetPassword route", error);
  }
};

export const resetPassword = async (req, res) => {
  try {
    // If there are errors, return Bad request and the errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error(errors.array());
      return res.status(400).json({
        success: false,
        message: `Validation errors - ${errors.array()[0].msg}`,
      });
    }

    const { email, otp, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select("password otp otpExpires tokenVersion verified refreshToken");
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "No user found with this email" });

    // Check if OTP is valid
    const isOtpValid = user.verifyOTP(otp);
    if (!isOtpValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });
    }

    // Hash the password and clear the OTP and Verified status
    const salt = bcrypt.genSaltSync(10);
    user.password = bcrypt.hashSync(password, salt);
    user.otp = undefined;
    user.otpExpires = undefined;
    user.verified = true;

    // Increment the tokenVersion and save the user
    user.incrementTokenVersion();

    // Create and return a token
    const data = { user: { id: user.id, tokenVersion: user.tokenVersion } };
    const { refreshToken } = generateTokenAndSetCookie(data, res);
    user.refreshToken = refreshToken;

    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An internal server error occurred",
    });
    console.error("Error in resetPassword route", error);
  }
};

export const updatePassword = async (req, res) => {
  try {
    // If there are errors, return Bad request and the errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error(errors.array());
      return res.status(400).json({
        success: false,
        message: `Validation errors - ${errors.array()[0].msg}`,
      });
    }

    // Check if user exists
    let user = await User.findById(req.user.id).select("password tokenVersion");
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "User does not exists" });

    // Check if old password is correct
    const comparePassword = bcrypt.compareSync(
      req.body.oldPassword,
      user.password
    );
    if (!comparePassword)
      return res
        .status(400)
        .json({ success: false, message: "Please enter valid credentials" });

    // Hash the new password and save the user
    const salt = bcrypt.genSaltSync(10);
    user.password = bcrypt.hashSync(req.body.newPassword, salt);

    // Increment the tokenVersion and save the user
    user.incrementTokenVersion();
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An internal server error occurred",
    });
    console.error("Error in updatePassword route", error);
  }
};

export const getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -otp -otpExpires -tokenVersion -verified -refreshToken"
    );
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "User details fetched successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An internal server error occurred",
    });
    console.error("Error in getUserDetails route", error);
  }
};

export const updateUser = async (req, res) => {
  try {
    // If there are errors, return Bad request and the errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error(errors.array());
      return res.status(400).json({
        success: false,
        message: `Validation errors - ${errors.array()[0].msg}`,
      });
    }

    // Check if user exists
    const user = await User.findById(req.user.id).select("-password -otp -otpExpires -tokenVersion -verified -refreshToken");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    const { firstName, lastName, email, role } = req.body;

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (role) user.role = role;
    if (req.file) {
      user.profilePic = await uploadToAzure(req.file, user.email);
    }

    await user.save();
    res.status(200).json({ success: true, user: req.user });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An internal server error occurred",
    });
    console.error("Error in updateUser route", error);
  }
};




export const isAdmin = async (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] 🔹 Checking Admin Access`);

    // ✅ Extract token from Cookies or Authorization Header
    let token = req.cookies.authToken;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      console.warn(`[${new Date().toISOString()}] ❌ Unauthorized - No token provided.`);
      return res.status(401).json({ success: false, message: "Unauthorized - No token provided" });
    }

    // ✅ Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ❌ Invalid or expired token.`);
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    // ✅ Fetch user from database and verify tokenVersion
    const user = await User.findById(decoded.user.id).select("role tokenVersion");
    if (!user || user.tokenVersion !== decoded.user.tokenVersion) {
      console.warn(`[${new Date().toISOString()}] ❌ Unauthorized - Token invalid or user does not exist.`);
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Token is no longer valid, please login again",
      });
    }

    // ✅ Check if user has admin privileges
    if (user.role !== "seller") {
      console.warn(`[${new Date().toISOString()}] ❌ Unauthorized - User is not an admin.`);
      return res.status(403).json({ success: false, message: "User is not an admin", isAdmin: false });
    }

    // ✅ Issue a new token (refresh mechanism)
    const newToken = jwt.sign(
      { user: { id: user._id, tokenVersion: user.tokenVersion, role: user.role } },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // ✅ Store token in HTTP-only cookie
    res.cookie("authToken", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    console.log(`[${new Date().toISOString()}] ✅ Admin Access Granted - User ID: ${user._id}, Role: ${user.role}`);
    
    return res.status(200).json({
      success: true,
      message: "User is an admin",
      isAdmin: true,
      token: newToken, // ✅ Returning the new token in the response
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Internal Server Error in isAdmin route:`, error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};