import mongoose from "mongoose";

const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  products: [
    {
      product: {
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
  createdAt: { type: Date, default: Date.now },
});

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;
