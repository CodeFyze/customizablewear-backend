import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    default: "user",
    enum: ["user", "seller"],
  },
  profilePic: {
    type: String,
    default: "",
  },
  tokenVersion: {
    type: Number,
    default: 1,
  },
  refreshToken: {
    type: String,
  },
  otp: {
    type: Number,
  },
  otpExpires: {
    type: Date,
  },
  verified: {
    type: Boolean,
    default: false,
  },
},{ timestamps: true });

// Middleware to capitalize first letter of first and last name
UserSchema.pre("save", async function (next) {
  const avatarDomain = "https://avatar.iran.liara.run";
  
  if (this.isModified("firstName")) {
    this.firstName =
      this.firstName.charAt(0).toUpperCase() +
      this.firstName.slice(1).toLowerCase();
  }
  if (this.isModified("lastName")) {
    this.lastName =
      this.lastName.charAt(0).toUpperCase() +
      this.lastName.slice(1).toLowerCase();
  }

  if (this.isModified("firstName") || this.isModified("lastName")) {
    const username = `${this.firstName}+${this.lastName}`;
    const newProfilePic = `${avatarDomain}/username?username=${username}`;
    
    if (!this.profilePic || this.profilePic.startsWith(avatarDomain)) {
      this.profilePic = newProfilePic;
    }
  }

  next();
});

// Method to generate OTP
UserSchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generates a 6-digit numeric OTP
  this.otp = otp;
  this.otpExpires = Date.now() + 10 * 60 * 1000; // OTP expires in 10 minutes
  return otp;
};

// Method to verify OTP
UserSchema.methods.verifyOTP = function (enteredOtp) {
  if (this.otp === enteredOtp && this.otpExpires > Date.now()) {
    this.otp = undefined;
    this.otpExpires = undefined;
    return true;
  }
  return false;
};

// Method to increment token version
UserSchema.methods.incrementTokenVersion = function () {
  this.tokenVersion += 1;
  return this.tokenVersion;
};

export default mongoose.model("user", UserSchema);
