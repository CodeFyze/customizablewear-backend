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
			case 'order_status_update':
				subject = `Order Status Update - #${data.order._id}`;
				html = generateOrderStatusUpdateEmail(data);
				break;
			case 'private_message':
				subject = `Message About Your Order #${data.order._id}`;
				html = generatePrivateMessageEmail(data);
				break;
			case 'order_dispatched':
				subject = `Order Dispatched - #${data.order._id}`;
				html = generateDispatchEmail(data);
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

function generateOrderStatusUpdateEmail({ customer, order, status }) {
	const customerName = customer?.name || customer?.firstName || 'Valued Customer';
	const companyName = process.env.COMPANY_NAME;
	const companyPhone = process.env.COMPANY_PHONE;
	const companyWebsite = process.env.COMPANY_WEBSITE;

	return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
        }
        .order-details {
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
        }
        .status-update {
          font-weight: bold;
          color: #2c7be5;
        }
        .footer {
          margin-top: 30px;
          font-size: 0.9em;
          color: #777;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Order Status Update</h2>
        </div>
        
        <p>Dear ${customerName},</p>
        
        <p>We wanted to inform you about an update to your order status.</p>
        
        <div class="order-details">
          <h3>Order Details</h3>
          <p><strong>Order Number:</strong> #${order._id}</p>
          <p><strong>New Status:</strong> <span class="status-update">${status}</span></p>
        </div>
        
        <p>If you have any questions about your order status or need further assistance, 
        please don't hesitate to contact our customer service team.</p>
        
        <div class="footer">
          <p>Best regards,</p>
          <p><strong>${companyName}</strong></p>
          <p><a href="${companyWebsite}">${companyWebsite}</a></p>
          <p>${companyPhone}</p>
        </div>
      </div>
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
	else if (type === 'order_status_update') {
		return `
      Order Status Update - #${data.order._id}
      
      Dear ${data.customer?.name || data.customer?.firstName || 'Valued Customer'},
      
      We wanted to inform you about an update to your order status.
      
      Order Details:
      - Order Number: #${data.order._id}
      - New Status: ${data.status}
     
      
      If you have any questions about your order status or need further assistance, 
      please don't hesitate to contact our customer service team.
      
      Best regards,
      ${process.env.COMPANY_NAME || 'Your Company'}
      ${process.env.COMPANY_WEBSITE || ''}
      ${process.env.COMPANY_PHONE || ''}
    `;
	}
	// Similar for shipping notification
}
// In your email utility functions
function generatePrivateMessageEmail({ customer, order, sellerMessage }) {
    const companyName = process.env.COMPANY_NAME || 'Our Store';
    
	console.log('customer===>', customer);
	console.log('order===>', order);
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { color: #2c7be5; border-bottom: 1px solid #eee; padding-bottom: 10px; }
                .message-box { background: #f9f9f9; padding: 15px; border-left: 3px solid #2c7be5; margin: 20px 0; }
                .footer { font-size: 0.9em; color: #777; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>Message About Your Order #${order._id}</h2>
            </div>
            
            <p>Dear ${customer.name},</p>
            
            <div class="message-box">
                <p><strong>Seller's Message:</strong></p>
                <p>${sellerMessage}</p>
            </div>
            
          
            
            <p>Please reply to this email if you have any questions.</p>
            
            <div class="footer">
                <p>Best regards,</p>
                <p><strong>${companyName} Team</strong></p>
            </div>
        </body>
        </html>
    `;
}

// Text version (for non-HTML clients)
function generatePrivateMessageText({ customer, order, sellerMessage }) {
    return `
        Message About Your Order #${order._id}
        
        Dear ${customer.firstName},
        
        Seller's Message:
        ${sellerMessage}
        
        Order Details:
        - Status: ${order.paymentStatus}
        ${order.trackingId ? `- Tracking ID: ${order.trackingId}\n` : ''}
        
        Please reply to this email if you have questions.
        
        Best regards,
        ${process.env.COMPANY_NAME || 'Our Store'} Team
    `;
}


function generateDispatchEmail({ customer, order, trackingId, shippingCarrier }) {
	const customerName = customer?.name || customer?.firstName || 'Valued Customer';
	const companyName = process.env.COMPANY_NAME;
	const companyPhone = process.env.COMPANY_PHONE;
	const companyWebsite = process.env.COMPANY_WEBSITE;
    
    // Calculate estimated delivery date (7 days from now as default)
    const estimatedDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    // Generate tracking URL based on carrier
    const trackingUrls = {
        'FedEx': `https://www.fedex.com/fedextrack/?trknbr=${trackingId}`,
        'UPS': `https://www.ups.com/track?tracknum=${trackingId}`,
        'USPS': `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingId}`,
        'DHL': `https://www.dhl.com/us-en/home/tracking/tracking-parcel.html?submit=1&tracking-id=${trackingId}`
    };

    const trackingUrl = trackingUrls[shippingCarrier] || '#';

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .header { color: #2c7be5; font-size: 24px; margin-bottom: 20px; }
                .details { background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0; }
                .address { border-left: 3px solid #2c7be5; padding-left: 10px; margin: 15px 0; }
                .tracking-link { color: #2c7be5; text-decoration: none; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">Order Dispatch Confirmation</div>
            
            <p>Dear ${customerName},</p>
            <p>Great news! Your order <strong>#${order._id}</strong> has been dispatched and is on its way to you.</p>
            
            <div class="details">
                <p><strong>Order Number:</strong> ${order._id}</p>
                <p><strong>Dispatch Date:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>Courier:</strong> ${shippingCarrier}</p>
                <p><strong>Tracking Number:</strong> ${trackingId}</p>
                <p><strong>Tracking Link:</strong> <a href="${trackingUrl}" class="tracking-link">Click here to track</a></p>
            </div>
            
            <div class="address">
                <p><strong>Shipping Address:</strong></p>
                <p>${order.shippingAddress.firstName} ${order.shippingAddress.lastName}</p>
                <p>${order.shippingAddress.address}</p>
            </div>
            
            <p>Your estimated delivery date is <strong>${estimatedDelivery}</strong>.</p>
            <p>You can track your package using the link above.</p>
            
            <p>If you have any questions or need further assistance, feel free to contact our support team at
            
            <p>Thank you for choosing ${companyName}! We hope you love your customized workwear.</p>
            
            <p>Best regards,<br>
            The ${companyName} Team<br>
            <a href="${companyWebsite}">${companyWebsite}</a><br>
            ${companyPhone}</p>
        </body>
        </html>
    `;
}

export default sendEmail;
