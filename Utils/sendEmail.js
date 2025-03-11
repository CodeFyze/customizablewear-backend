	// import nodeMailer from "nodemailer";

	// const sendEmail = async (options) =>{
	//     const transporter = nodeMailer.createTransport({
	//         host: process.env.SMPT_HOST,
	//         port: process.env.SMPT_PORT,
	//         service: process.env.,
	//         auth:{
	//             user : process.env.SMPT_MAIL,
	//             pass : process.env.SMPT_PASSWORD,
	//         },

	//     });

	//      const mailOptions = {
	//         from : process.env.SMPT_MAIL,
	//         to: options.email,
	//         subject: options.subject,
	//         text : options.message,
	//      };

	//      await transporter.sendMail(mailOptions);
	// };

	// export default sendEmail;


	import dotenv from "dotenv";
	import nodemailer from "nodemailer";

	dotenv.config();

const sendEmail = async (options) => {
	const transporter = nodemailer.createTransport({
			host: process.env.SMTP_HOST,
			port: process.env.SMTP_PORT,
			service: process.env.SMTP_SERVICE,
			auth: {
				user: process.env.SMTP_MAIL,
				pass: process.env.SMTP_PASSWORD,
			},
			tls: {
				rejectUnauthorized: false,
			},
		});

	console.log('Send Email Options:', options);
	const mailOptions = {
		from: process.env.SMTP_MAIL,
		to: options.email,
		subject: options.subject,
		text: options.message,
	};

	
console.log('Mail Options (sendEmail utility):', mailOptions);
	await transporter.sendMail(mailOptions);
	};

	export default sendEmail;
