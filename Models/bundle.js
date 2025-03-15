import mongoose from "mongoose";

// Color schema
const colorSchema = new mongoose.Schema({
  color: { type: String, required: true },
  image: { type: String, required: true },
  sizes: [
    {
      type: String,
      enum: ["Small", "Medium", "Large", "Extra Large"],
      required: true,
    },
  ],
});

// Bundle schema
const bundleSchema = new mongoose.Schema({
  image: { type: String, required: true },  // Main image of the bundle
  colors: [colorSchema],  // Colors with images and sizes
  categories: [
    { type: String, enum: ["solo1", "solo2", "everyday"], required: true },
  ],
  description: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: String, default: "In Stock" },
  size: [{ type: String }],  // Sizes available for the bundle
  seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  customizable: { type: Boolean, default: false },
  productType: [{ type: String }],  // Types of products (hoodie, shirt, etc.)
});

const Bundle = mongoose.model("Bundle", bundleSchema);

export default Bundle;
