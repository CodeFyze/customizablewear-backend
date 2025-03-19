// utils/invoiceGenerator.js
import PDFDocument from 'pdfkit';
import fs from 'fs';

 const generateInvoice = (order, filePath) => {
	const doc = new PDFDocument();

	// Create a write stream to save the PDF
	doc.pipe(fs.createWriteStream(filePath));

	// Add invoice header
	doc.fontSize(25).text('Invoice', { align: 'center' });
	doc.moveDown();

	// Add order details
	doc.fontSize(14).text(`Order ID: ${order._id}`);
	doc.text(`Date: ${order.createdAt.toDateString()}`);
	doc.moveDown();

	// Add customer details
	doc.text(`Customer Name: ${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`);
	doc.text(`Email: ${order.shippingAddress.email}`);
	doc.text(`Phone: ${order.shippingAddress.phone}`);
	doc.text(`Address: ${order.shippingAddress.address}`);
	doc.moveDown();

	// Add product details
	doc.text('Products:');
	order.products.forEach((product, index) => {
		doc.text(`${index + 1}. ${product.title} - ${product.quantity} x $${product.price}`);
	});
	doc.moveDown();

	// Add pricing details
	doc.text(`Subtotal: $${order.totalAmount}`);
	doc.text(`Discount: $${order.discount}`);
	doc.text(`Total: $${order.finalAmount}`);
	doc.moveDown();

	// Add payment details
	doc.text(`Payment Mode: ${order.paymentMode}`);
	doc.text(`Payment Status: ${order.paymentStatus}`);
	doc.moveDown();

	// Add a thank you message
	doc.fontSize(12).text('Thank you for shopping with us!', { align: 'center' });

	// Finalize the PDF
	doc.end();
};


export default generateInvoice
