import nodemailer from 'nodemailer';
import 'dotenv/config';

// Configure your email transporter
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

const sendEmail = async ({ type, to, data }) => {
	console.log('data coming to sendEmail', data);
	try {
		let subject, html;

		switch (type) {
			case 'order_confirmation':
				subject = `Order Confirmation - #${data.order.number}`;
				html = generateOrderConfirmationEmail(data);
				break;
			case 'shipping_notification':
				subject = `Your Order Has Shipped - #${data.order.number}`;
				html = generateShippingNotificationEmail(data);
				break;
			default:
				throw new Error('Unsupported email type');
		}

		const mailOptions = {
			from: `" <${process.env.SMTP_COMPANY}>`,
			to,
			subject,
			html,
			// Add text version for email clients that don't support HTML
			text: generateTextVersion(data, type),
		};

		const info = await transporter.sendMail(mailOptions);
		console.log(`Email sent to ${to}`, info.messageId);
		return true;
	} catch (error) {
		console.error('Error sending email:', error);
		throw error;
	}
};

function generateOrderConfirmationEmail({ customer = {}, order = {} }) {
	console.log('customer===>', customer);
	const customerName = customer.name ? customer.name : 'Valued Customer';

	const companyName = process.env.COMPANY_NAME;
	const companyPhone = process.env.COMPANY_PHONE;
	const companyWebsite = process.env.COMPANY_WEBSITE;
	console.log('companyWebsite==>', companyWebsite);
	const orderNumber = order.number || 'N/A';
	const orderDate =
		order.date ||
		new Date().toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});

	const paymentMethod = order.paymentMethod || 'Not specified';
	const productionTime = order.productionTime || '7-10 business days';

	// Calculate estimated delivery (14 days from now if not provided)
	const estimatedDelivery =
		order.estimatedDelivery ||
		new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});

	// Format order items with fallbacks
	const orderItems = (order.items || []).map((item) => ({
		name: item.name || 'Custom Workwear Item',
		quantity: item.quantity || 1,
		color: item.color || 'Standard',
		size: item.size || 'One Size',
		price: item.price ? `$${Number(item.price).toFixed(2)}` : '$0.00',
	}));

	// Calculate totals with fallbacks
	const subtotal = order.subtotal ? `$${Math.round(Number(order.subtotal))}` : '$0.00';
	const shippingCost = order.shippingCost ? `$${Math.round(Number(order.shippingCost))}` : '$0.00';
	const discount = order.discount && `$${Math.round(Number(order.discount))}`;

	const total = order.total ? `$${Math.round(Number(order.total))}` : '$0.00';

	return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
           
        </head>
        <body>
            <h2>Order Confirmation</h2>
            
            <p>Dear ${customerName},</p>
            
            <p>Thank you for your order! We appreciate your trust in ${companyName} for your customized workwear needs.</p>
            <p>Our team is now preparing your order with the highest attention to detail.</p>
            
            <div class="order-summary">
                <h3>Order Summary</h3>
                <p><strong>Order Number:</strong> ${orderNumber}</p>
                <p><strong>Order Date:</strong> ${orderDate}</p>
                <p><strong>Payment Method:</strong> ${paymentMethod}</p>
                
                <div class="items-list">
                    <h4>Customized Items Ordered:</h4>
                    ${orderItems
											.map(
												(item) => `
                        <div class="item-detail">
                            <p><strong>${item.name}</strong> - Qty: ${item.quantity}</p>
                        ${
													item.customization?.trim()
														? `<p><strong>Customization:</strong> ${item.customization}</p>`
														: ''
												}
                            <p><strong>Color:</strong> ${item.color}</p>
                            <p><strong>Size:</strong> ${item.size}</p>
                            <p><strong>Price:</strong> ${item.price}</p>
                        </div>
                    `,
											)
											.join('')}
                </div>
                
                <div class="totals">
                    <p><strong>Subtotal:</strong> ${subtotal}</p>
                    <p><strong>Shipping:</strong> ${shippingCost}</p>
                    <p><strong>Shipping:</strong> ${discount}</p>
                    <p><strong>Total:</strong> ${total}</p>
                </div>
            </div>
            
            <div class="production-details">
                <h3>Production & Shipping Details:</h3>
                <p><strong>Estimated Production Time:</strong> ${productionTime}</p>
                <p><strong>Estimated Delivery Date:</strong> ${estimatedDelivery}</p>
            </div>
            
            <p>Your order is now in production, and we will notify you once it has been shipped. If you have any final adjustments or questions, please contact us within 24 hours at <a href="mailto:${companyName}">${companyName}</a> or call us at ${companyName}.</p>
            
            <p>Thank you for choosing ${companyName}! We look forward to providing you with high-quality customized workwear.</p>
            
            <div class="footer">
                <p>Best regards,</p>
                <p><strong>${companyName}</strong></p>
                <p><a href="${companyWebsite}">${companyWebsite}</a></p>
                <p>${companyPhone}</p>
            </div>
        </body>
        </html>
    `;
}

function generateShippingNotificationEmail({ customer, order }) {
	return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Your Order Has Shipped</title>
            <style>
                /* Similar styling to order confirmation */
            </style>
        </head>
        <body>
            <!-- Similar structure to order confirmation but for shipping -->
        </body>
        </html>
    `;
}

// Text version for email clients that don't support HTML
function generateTextVersion(data, type) {
	console.log('data.order.discount===>', data.order.discount);
	if (type === 'order_confirmation') {
		return `
            Order Confirmation - #${data.order.number}
            
            Dear ${data.customer.name},
            
            Thank you for your order! Here are your order details:
            
            Order #${data.order.number}
            Order Date: ${data.order.date}
            Estimated Delivery: ${data.order.estimatedDelivery}
            
            Order Items:
            ${data.order.items
							.map(
								(item) => `
              - ${item.name} (Qty: ${item.quantity})
                Size: ${item.size}, Color: ${item.color}
                ${item.customization !== 'None' ? `Custom: ${item.customization}` : ''}
                Price: $${item.price}
            `,
							)
							.join('\n')}
            
            Subtotal: $${data.order.subtotal}

            Shipping: $${data.order.shippingCost}
            ${data.order.discount !== 0.0 ? `Discount: -$${data.order.discount}` : ''}
            Total: $${data.order.total}
            
            Thank you for your business!
            ${process.env.COMPANY_NAME || 'Your Company'}
        `;
	}
	// Similar for shipping notification
}

export default sendEmail;
