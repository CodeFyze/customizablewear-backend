import { set, Schema, model } from 'mongoose';

set('strictQuery', false);

const promoCodeSchema = new Schema({
	_id: String,
	code: {
		type: String,
		required: true,
		unique: true,
	},
	discount: {
		type: Number,
		required: true,
	},
	expiresAt: {
		type: Date,
		required: true,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

export default model('Promo', promoCodeSchema);
