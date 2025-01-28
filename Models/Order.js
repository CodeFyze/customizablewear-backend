import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  products: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true },
      customizations: { 
        type: Map, 
        of: String, 
        default: {}, 
      }, // Example: { "name": "Ali", "logo": "logo.png", "placement": "back" }
    },
  ],
  totalAmount: { type: Number, required: true },
  status: { type: String, default: "Pending" },
  paymentMode: { 
    type: String,
    enum: ["Online", "Cash on Delivery"],
    default: "Cash on Delivery",
  }, // Online, Cash on Delivery
  paymentStatus: { type: String, default: "Pending" }, // Paid, Unpaid
}, { timestamps: true });

export default mongoose.model('order', OrderSchema);