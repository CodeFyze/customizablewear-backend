// import axios from 'axios';
// import Contact from '../Models/Contact.js';
// import jwt from 'jsonwebtoken';
// import nodemailer from 'nodemailer';
// import dotenv from 'dotenv';

// dotenv.config();

// const submitContactForm = async (req, res) => {
// 	try {
// 		const { name, email, message } = req.body;

// 		// Validate required fields
// 		if (!email || !message) {
// 			return res.status(400).json({ error: 'Email and message are required' });
// 		}

// 		// Check if contact already exists
// 		let contact = await Contact.findOne({ email });

// 		if (contact) {
// 			// Use the existing name from the database
// 			const existingName = contact.name;

// 			// Append the new message to the existing entry
// 			contact.messages = contact.messages || []; // Ensure messages array exists
// contact.messages.push({ text: message, sentAt: new Date() });

// 			await contact.save();

// 			return res.status(200).json({
// 				message: 'Message added successfully',
// 				data: { name: existingName, email, message },
// 			});
// 		}

// 		// If it's a new user, require the name field
// 		if (!name) {
// 			return res.status(400).json({ error: 'Name is required for first-time users' });
// 		}

// 		// Create a new contact entry
// 		const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });

// 		contact = new Contact({
// 			name,
// 			email,
// 			messages: [{ text: message, sentAt: new Date() }],

// 			isVerified: false,
// 			verificationToken: token,
// 		});


// 		await contact.save();

// 		// Send Email Notification to Admin
// 		const transporter = nodemailer.createTransport({
// 			service: process.env.SMPT_SERVICE,
// 			auth: {
// 				user: process.env.SMPT_MAIL,
// 				pass: process.env.SMPT_PASSWORD,
// 			},
// 			tls: {
// 				rejectUnauthorized: false, // Allow self-signed certificates
// 			},
// 		});

// 		const verificationUrl = `http://localhost:5000/api/contact/verify-email/${token}`;

// 		const mailOptions = {
// 			from: process.env.SMPT_MAIL,
// 			to: email, // Send to the user who filled the form
// 			subject: 'Verify Your Email Address',
// 			text: `Please click the following link to verify your email: ${verificationUrl}`,
// 		};

// 		await transporter.sendMail(mailOptions);

// 		// Send a response to the user
// 		res.status(201).json({ message: 'Please check your email to verify your address.' });
// 	} catch (error) {
// 		// console.error(error);
// 		res.status(500).json({ Error: 'Something went wrong',error });
// 	}
// };

// export default submitContactForm;

import axios from 'axios';
import Contact from '../Models/Contact.js';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const submitContactForm = async (req, res) => {
	try {
		const { name, email, message } = req.body;

		if (!email || !message) {
			return res.status(400).json({ error: 'Email and message are required' });
		}

		let contact = await Contact.findOne({ email });

		if (contact) {
			contact.messages = contact.messages || [];
			contact.messages.push({ text: message, sentAt: new Date() });

			await contact.save();
			await sendCompanyEmail(contact.name, email, message);

			return res.status(200).json({ message: 'Again, your message has been submitted.' });
		}

		if (!name) {
			return res.status(400).json({ error: 'Name is required for first-time users' ,user:"Existing User"});
		}

		contact = new Contact({
			name,
			email,
			messages: [{ text: message, sentAt: new Date() }],
		});

		await contact.save();
		await sendCompanyEmail(name, email, message);

		return res.status(201).json({ message: 'Your form has been submitted.',user:"New User" });
	} catch (error) {
		res.status(500).json({ error: 'Something went wrong', details: error.message });
	}
};


const sendCompanyEmail = async (name, email, message) => {
    const transporter = nodemailer.createTransport({
        service: process.env.SMPT_SERVICE,
        auth: {
            user: process.env.SMPT_MAIL,
            pass: process.env.SMPT_PASSWORD,
        },
        tls: {
            rejectUnauthorized: false,
        },
    });

    const mailOptions = {
        from: process.env.SMPT_MAIL,
        to: process.env.COMPANY_EMAIL,
        subject: 'New Contact Form Submission',
        text: `A new contact form submission has been received:\n\nName: ${name}\nEmail: ${email}\nMessage: ${message}`,
    };

    await transporter.sendMail(mailOptions);
};

export default submitContactForm;
