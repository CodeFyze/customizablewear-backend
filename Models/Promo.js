import { set, Schema, model } from 'mongoose';

set('strictQuery', false);

const promoCodeSchema = new Schema({
	code: { type: String, required: true, unique: true }, // Promo code (e.g., "SUMMER20")
	discount: { type: Number, required: true }, // Discount percentage (e.g., 10 for 10%)
	status: { type: String, enum: ['active', 'inactive'], default: 'active' }, // Active or inactive
	expiryDate: { type: Date }, // Expiry date of the promo code
	usageLimit: { type: Number }, // Maximum number of times the promo code can be used
	timesUsed: { type: Number, default: 0 }, // Number of times the promo code has been used
	minOrderAmount: { type: Number }, // Minimum order amount required to use the promo code
	createdAt: { type: Date, default: Date.now }, // When the promo code was created
});

export default model('Promo', promoCodeSchema);
