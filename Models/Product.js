import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema(
	{
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

		size: {
			type: [String],
			required: true,
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
			// required: true,
		},
		backImage: {
			type: String,
			// required: true,
		},
		images: {
			type: [String], // Array of image URLs
			validate: [arrayLimit, '{PATH} exceeds the limit of 10'],
		},
		colors: {
			type: [String], // Array of color options
		},
		colorImages: {
			type: [String], // ✅ Array of color image URLs
		},
		seller: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		customizable: {
			type: Boolean,
			default: false,
		}, // Indicates if customization is allowed
		productType: {
			type: [String], // Array to store selected product types
			enum: ['hoodie', 'shirt', 'trouser', 'polo', 'pant', 'sweatShirt', ''], // Restrict to specific types
		},
	},
	{ timestamps: true },
);

function arrayLimit(val) {
	return val.length <= 5;
}

export default mongoose.model('Product', ProductSchema);
