

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
        service: process.env.SMTP_SERVICE,
        auth: {
            user: process.env.SMTP_MAIL,
            pass: process.env.SMTP_PASSWORD,
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
