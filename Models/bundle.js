import mongoose from 'mongoose';

const BundleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Bundle title is required'],
    trim: true,
  },
  price: {
    type: Number,
    required: [true, 'Bundle price is required'],
    min: [0, 'Price cannot be negative'],
  },
  description: {
    type: String,
    default: 'Premium custom bundle',
  },
  thumbnail: {
    type: String,
    required: [true, 'Thumbnail image is required'],
  },
  categories: {
    type: [String],
    required: [true, 'At least one category is required'],
    validate: {
      validator: function(v) {
        return v.length > 0;
      },
      message: 'At least one category is required',
    },
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assuming you have a User model
    required: true
  },
  products: [
    {
      image: {
        type: String,
        required: [true, 'Product image is required'],
      },
      colors: [
        {
          color: {
            type: String,
            required: [true, 'Color hex code is required'],
          },
          image: {
            type: String,
            required: [true, 'Color image is required'],
          },
          sizes: {
            type: [String],
            required: [true, 'At least one size is required'],
            validate: {
              validator: function(v) {
                return v.length > 0;
              },
              message: 'At least one size is required',
            },
          },
        },
      ],
    },
  ],
  size: {
    type: [String],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
BundleSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Bundle = mongoose.model('Bundle', BundleSchema);

export default Bundle;