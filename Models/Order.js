import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        title: { type: String, required: true },
        frontImage: { type: String, required: true },
        sideImage: { type: String },
        price: { type: Number, required: true },
        size: { type: String, required: true },
        color: { type: String, required: true },
        logo: { type: String },
        quantity: { type: Number, default: 1, min: 1 },
        method: { type: String, default: "Not selected" },
        position: { type: String, default: "Not selected" },
        textLine: { type: String, default: "" },
        font: { type: String, default: "" },
        notes: { type: String, default: "" },
      },
    ],
    shippingAddress: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      companyName: { type: String },
      address: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      additionalInfo: { type: String, default: "" },
      sameAsBilling: { type: Boolean, default: true },
    },
    promoCode: { type: String, default: "" },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    finalAmount: { type: Number, required: true },
    status: { type: String, default: "Pending" },
    paymentMode: {
      type: String,
      enum: ["Online", "Cash on Delivery"],
      default: "Cash on Delivery",
    },
    paymentStatus: { type: String, default: "Pending" },
  },
  { timestamps: true }
);

export default mongoose.model("Order", OrderSchema);
