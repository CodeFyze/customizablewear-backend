import express from "express";
import { body } from "express-validator";
import {
  signup,
  login,
  logout,
  forgetPassword,
  resetPassword,
  updatePassword,
  getUserDetails,
  updateUser,
  verifySignup,
  refreshToken,
  isAdmin,
  getUserId
} from "../Controllers/auth.controller.js";
import authenticate from "../Middleware/authenticate.js";

// Set up multer for in-memory storage
import multer from 'multer';
const storage = multer.memoryStorage();
const upload = multer({ storage }).single('profilePic');

const router = express.Router();

// Create a new user using: POST "/api/auth/signup". Doesn't require Auth
router.post(
  "/signup",
  upload,
  [
    body("firstName", "firstName must be at least 3 characters long").trim().isString().isLength({
      min: 3,
    }),
    body("lastName", "lastName must be at least 3 characters long").trim().isString().isLength({
      min: 3,
    }),
    body("email", "Enter a valid email").trim().isString().isEmail(),
    body("password", "Password must be at least 5 characters").trim().isString().isLength({
      min: 5,
    }),
    body("role", "Role must be either 'user' or 'seller'")
      .optional().trim().isString().isIn(["user", "seller"]),
  ],
  signup
);

router.get("/user-id", getUserId);

// Verify signup using: POST "/api/auth/signup/verify". No Auth required
// router.post(
//   "/signup/verify",
//   [
//     body("email", "Enter a valid email").trim().isString().isEmail(),
//     // check for string only otp

//     body("otp", "OTP must be 6 digits long").trim().isNumeric().isLength({ min: 6, max: 6 }),
//   ],
//   verifySignup
// );

router.post(
  "/signup/verify",
  [
    body("otp", "OTP must be 6 digits long").trim().isNumeric().isLength({ min: 6, max: 6 }),
  ],
  verifySignup
);

// Login using: POST "/api/auth/login". No Auth required
router.post(
  "/login",
  [
    body("email", "Enter a valid email").trim().isString().isEmail(),
    body("password", "Password must be at least 5 characters").trim().isString().isLength({
      min: 5,
    }),
  ],
  login
);

// Logout using: GET "/api/auth/logout". No Auth required
router.post("/logout", logout);

// Refresh token using: POST "/api/auth/refresh-token". No Auth required
router.post( "/refresh-token", refreshToken );

// Forget Password using: POST "/api/auth/password/forget". No Auth required
router.post(
  "/password/forget",
  [body("email", "Enter a valid email").trim().isString().isEmail()],
  forgetPassword
);

// Reset Password using: POST "/api/auth/password/reset". No Auth required
router.post(
  "/password/reset",
  [
    body("email", "Enter a valid email").trim().isString().isEmail(),
    body("otp", "OTP must be 6 digits long").trim().isNumeric().isLength({ min: 6, max: 6 }),
    body("password", "Password must be at least 5 characters").trim().isString().isLength({
      min: 5,
    }),
  ],
  resetPassword
);

// Update password using: POST "/api/auth/password/update". Requires Auth
router.post(
  "/password/update",
  authenticate,
  [
    body("oldPassword", "oldPassword must be at least 5 characters").trim().isString().isLength({
      min: 5,
    }),
    body("newPassword", "newPassword must be at least 5 characters").trim().isString().isLength({
      min: 5,
    }),
  ],
  updatePassword
);

// Get user details using: GET "/api/auth/user". Requires Auth
router.get("/user", authenticate, getUserDetails);

// Update user using: POST "/api/auth/user/update". Requires Auth
router.post(
  "/user/update",
  authenticate,
  upload,
  [
    body("firstName", "firstName must be at least 3 characters long").isLength({ min: 3 }).optional().trim().isString().isLength({
      min: 3,
    }),
    body("lastName", "lastName must be at least 3 characters long").isLength({ min: 3 }).optional().trim().isString().isLength({
      min: 3,
    }),
    body("email", "Enter a valid email").optional().trim().isString().isEmail(),
    body("role").optional().trim().isString().isIn(["user", "seller"]).withMessage("Role must be either 'user' or 'seller'"),
  ],
  updateUser
);

// Is Logged In using: GET "/api/auth/isAdmin". No Auth required
router.get("/isAdmin", authenticate, isAdmin);

export default router;
