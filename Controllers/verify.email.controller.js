import Contact from '../Models/Contact.js';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export const verifyEmail = async (req, res) => {
	try {
		const { token } = req.params; // Get token from URL

		// Verify the token
		let decoded;
		try {
			decoded = jwt.verify(token, process.env.JWT_SECRET);
		} catch (error) {
			// Token expired or invalid
			if (error.name === 'TokenExpiredError') {
				return res.status(400).json({ error: 'Token has expired. Please request a new verification email.' });
			} else {
				return res.status(400).json({ error: 'Invalid token. Please request a new verification email.' });
			}
		}

		// Find the contact form using the email in the token
		const contact = await Contact.findOne({ email: decoded.email });

		if (!contact) {
			return res.status(404).json({ error: 'Contact not found' });
		}

		// Update the isVerified flag
		contact.isVerified = true;
		contact.verificationToken = null; // Clear the token after successful verification
		await contact.save();

		// Send email to the admin
		const transporter = nodemailer.createTransport({
			service: process.env.SMTP_SERVICE,
			auth: {
				user: process.env.SMTP_MAIL,
				pass: process.env.SMPT_PASSWORD,
			},
			tls: {
				rejectUnauthorized: false, // Allow self-signed certificates
			},
		});

		console.log(contact);
		const mailOptions = {
			from: process.env.SMTP_MAIL,
			to: process.env.COMPANY_EMAIL,
			subject: 'New Contact Form Verified',
			text: `The contact form submission from ${contact.email} has been verified.`,
		};

		// Send email

		await transporter.sendMail(mailOptions);

		res.status(200).json({ message: 'Email verified successfully!' });
	} catch (error) {
		// Log unexpected errors
		console.error(error);
		res.status(500).json({ error: 'Something went wrong. Please try again later.' });
	}
};

export default verifyEmail;
