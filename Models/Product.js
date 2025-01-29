import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
  },
  description: {
    type: String,
    // required: true,
    trim: true,
    // minlength: 10,
  },
  price: {
    type: Number,
    required: true,
  },
  frontImage: {
    type: String,
    required: true,
  },
  sideImage: {
    type: String,
    required: true,
  },
  backImage: {
    type: String,
    required: true,
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  customizable: { 
    type: Boolean,
    default: false
  }, // Indicates if customization is allowed
}, { timestamps: true });

function arrayLimit(val) {
  return val.length <= 5;
}

export default mongoose.model('product', ProductSchema);