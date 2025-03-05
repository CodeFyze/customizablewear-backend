import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
	name: { type: String, required: true },
	email: { type: String, required: true, } ,
	messages: [
		{
			text: { type: String, required: true },
			sentAt: { type: Date, default: Date.now },
		},
	], // Store messages as an array
	verificationToken: { type: String, default: null }, // Store the verification token
	isVerified: { type: Boolean, default: false }, // Flag to check if the email is verified
	createdAt: { type: Date, default: Date.now },
});

const Contact = mongoose.model('Contact', contactSchema);

export default Contact;
