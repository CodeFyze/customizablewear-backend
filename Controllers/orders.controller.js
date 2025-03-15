import Order from "../Models/Order.js";  
import Product from "../Models/Product.js";  
import mongoose from "mongoose";
import User from "../Models/User.js";
import sendEmail from "../Utils/sendEmail.js";
import Cart from "../Models/Cart.js";
import chalk from "chalk";
import nodemailer from "nodemailer"
import { selectFields } from "express-validator/lib/field-selection.js";
import Promo from "../Models/Promo.js";


export const getAllOrders = async (req, res) => {
  console.log("getting all orders")
  try {
    // Log the incoming request to check the user ID and role
    console.log("Fetching orders for user ID:", req.user.id);
    console.log("User role:", req.user.role);

    // Verify user object and ID
    if (!req.user || !req.user.id) {
      console.log("User ID not found in the request.");
      return res.status(400).json({
        success: false,
        message: "User ID is missing in the request",
      });
    }

    // If the user is a seller, fetch all orders
    let orders;
    if (req.user.role === "seller") {
      orders = await Order.find(); // Fetch all orders for the seller
      console.log("Fetched all orders for seller:", orders);
    } else {
      // If the user is not a seller, fetch orders based on their userId
      orders = await Order.find({ userId: req.user.id });
      console.log("Fetched orders for user ID:", req.user.id);
    }

    // Check if no orders were found
    if (orders.length === 0) {
      console.log("No orders found for user ID:", req.user.id); // Log when no orders are found
      return res.status(400).json({
        success: false,
        message: "No orders found",
      });
    }

    // Log the successful response
    console.log("Successfully fetched orders:", orders);
    res.status(200).json({ success: true, orders });
  } catch (error) {
    // Log the error to help with debugging
    console.error("Error in getAllOrders route:", error);

    res.status(500).json({
      success: false,
      message: "An internal server error occurred",
    });
  }
};


export const getOrdersByUserId = async (req, res) => {
  try {
    let userId;

    // ✅ If a seller/admin is making the request, use the `userId` from URL params
    if (req.user.role === "seller" || req.user.role === "admin") {
      userId = req.params.id;  // Fetch orders for any user
    } else {
      // ✅ If a normal user, fetch only their own orders
      userId = req.user.id;
    }

    // ✅ Validate `userId` (must be a valid MongoDB ObjectId)
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log("❌ Invalid or missing User ID:", userId);
      return res.status(400).json({ success: false, message: "Invalid or missing User ID" });
    }

    console.log("✅ Fetching orders for userId:", userId);

    // ✅ Convert `userId` to ObjectId for querying
    const orders = await Order.find({ userId: new mongoose.Types.ObjectId(userId) });

    if (!orders || orders.length === 0) {
      console.log("❌ No orders found for user ID:", userId);
      return res.status(404).json({ success: false, message: "No orders found for this user" });
    }

    console.log("✅ Orders found:", orders.length);
    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error("❌ Error fetching orders by user ID:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};




export const getOrderById = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: "Unauthorized - No user found" });
    }

    // Find the order by ID
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Allow access if the user owns the order OR if they are a seller/admin
    if (order.userId.toString() !== req.user.id && req.user.role !== "seller" && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "You are not authorized to view this order" });
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error("Error fetching order by ID:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


export const createOrder = async (req, res) => {
	try {
		console.log('🚀 Incoming Order Request:', JSON.stringify(req.body, null, 2));

		const { shippingAddress, products, totalAmount, promoCode, discount, finalAmount, paymentMode } = req.body;
		const userId = req.user?.id;

		if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
			console.error('❌ Invalid or missing User ID');
			return res.status(400).json({ success: false, message: 'Invalid or missing User ID' });
		}

		if (!shippingAddress || !shippingAddress.firstName || !shippingAddress.address || products.length === 0) {
			console.error('❌ Missing required fields:', { shippingAddress, products });
			return res
				.status(400)
				.json({ success: false, message: 'Missing required fields (Shipping Address or Products)' });
		}
		const productIds = products.map((item) => item.productId);
		console.log('productIds', productIds);
		const existingProducts = await Product.find({ _id: { $in: productIds } });
		console.log('existing ids', existingProducts);

		// if (existingProducts.length !== productIds.length) {
		// 	console.error('❌ Some products do not exist:', { productIds, existingProducts });
		// 	return res.status(400).json({ success: false, message: 'Some products no longer exist' });
		// }

		const orderProducts = products.map((item) => ({
			productId: item.productId,
			title: item.title || 'Untitled Product',
			frontImage: item.frontImage || 'Default',
			sideImage: item.sideImage || '',
			price: item.logo ? item.price + 5 : item.price,
			size: item.size || 'Default',
			color: item.color || 'Default',
			logo: item.logo || '',
			quantity: item.quantity || 1,
			method: item.method || 'Not selected',
			position: item.position || 'Not selected',
			textLine: item.textLine || '',
			font: item.font || '',
			notes: item.notes || '',
		}));

		const order = new Order({
			userId: new mongoose.Types.ObjectId(userId),
			shippingAddress,
			products: orderProducts,
			totalAmount,
			promoCode: promoCode || '',
			discount: discount || 0,
			finalAmount,
			paymentMode,
			paymentStatus: paymentMode === 'Online' ? 'Paid' : 'Pending',
		});

		await order.save();
		console.log(`✅ Order ${order._id} created successfully!`);

		const user = await User.findById(userId);
		if (user && !user.isCustomer) {
			user.isCustomer = true;
			await user.save();
			console.log(`✅ User ${userId} is now marked as a customer.`);
		}

		// ✅ Send order confirmation email to customer
		if (user?.email) {
			await sendOrderConfirmationEmail(user.email, process.env.SMTP_MAIL, user?.firstName, order._id);
			console.log(`📧 Order confirmation email sent to ${user.email}`);
		}
		/// ✅ Delete the user's cart after successful order placement
		try {
			const cart = await Cart.findOne({ user: userId});
			if (cart) {
				await Cart.deleteOne({ user: userId });
				console.log(`🛒 Cart deleted for user ${userId}`);
			} else {
				console.log(`🛒 No cart found for user ${userId}`);
			}
		} catch (error) {
			console.error('❌ Error deleting cart:', error);
		}

		res.status(201).json({ success: true, message: 'Order created successfully', order });
	} catch (error) {
		console.error('❌ Error creating order:', error);
		res.status(500).json({ success: false, message: 'Internal Server Error' });
	}
};

// Configure nodemailer transporter
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
// Function to send order confirmation email
const sendOrderConfirmationEmail = async (customerEmail, sellerEmail, customerName, orderId) => {
	try {
		// Email content for the customer
		const customerMailOptions = {
			from: sellerEmail,
			to: customerEmail,
			subject: 'Order Confirmation',
			text: `Thank you for your order! Your order ID is: ${orderId}`,
		};

		console.log(customerEmail,sellerEmail)
		// Email content for the seller
		const sellerMailOptions = {
			from: customerEmail,
			to: sellerEmail,
			subject: 'New Order Received',
			text: `User ${customerName} (${customerEmail}) has placed an order. Order ID: ${orderId}`,
		};

		// Send both emails
		await transporter.sendMail(customerMailOptions);
		await transporter.sendMail(sellerMailOptions);

		console.log('Emails sent to customer and seller');
	} catch (error) {
		console.error('Error sending emails:', error);
	}
};




export const updateOrder = async (req, res) => {
	try {
		const { id } = req.params;
    const { status } = req.body; 

	
		const updates = {
			paymentStatus: status, 
		};
    

    console.log(id,status)
		// Validate order ID
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({ error: 'Invalid order ID' });
		}

		// Validate updates
		if (!updates || Object.keys(updates).length === 0) {
			return res.status(400).json({ error: 'No updates provided' });
		}

		// Find and update the order
		const updatedOrder = await Order.findByIdAndUpdate(id, updates, { new: true }).populate('userId');

    console.log(updateOrder)
		// If order not found
		if (!updatedOrder) {
			return res.status(404).json({ error: 'Order not found' });
		}

		// Get customer and seller emails
    const customerEmail = updatedOrder.userId.email;
    const sellerEmail = process.env.SMTP_MAIL
    
		// If status is updated, send an email
		if (updates.status) {
			await sendOrderStatusUpdateEmail(customerEmail, sellerEmail, updatedOrder._id, updates.status);
			console.log(`📧 Order status update email sent to ${customerEmail} and ${sellerEmail}`);
		}

		// Return updated order
		res.json({ success: true, message: 'Order updated successfully', updatedOrder });
	} catch (error) {
		console.error('❌ Error updating order:', error);
		res.status(500).json({ error: 'Failed to update order' });
	}
};
const sendOrderStatusUpdateEmail = async (customerEmail, sellerEmail, orderId, status) => {
	try {
		const mailOptionsCustomer = {
			from: sellerEmail,
			to: customerEmail,
			subject: `Order #${orderId} Status Updated`,
			text: `Your order with ID ${orderId} has been updated to: ${status}. Thank you for shopping with us!`,
		};

		const mailOptionsSeller = {
			from: sellerEmail,
			to: sellerEmail,
			subject: `Order #${orderId} Status Changed`,
			text: `The order with ID ${orderId} has been updated to: ${status}.`,
		};

		// Send emails to both customer and seller
		await transporter.sendMail(mailOptionsCustomer);
		await transporter.sendMail(mailOptionsSeller);

		console.log(`📧 Order status update emails sent successfully.`);
	} catch (error) {
		console.error('❌ Error sending status update emails:', error);
	}
};


// Delete an order
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the order by ID
    const order = await Order.findById(id);

    // If order not found, return 404 error
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if the user is the owner of the order
    if (order.userId.toString() !== req.user.id) {
      return res.status(403).json({
        message: "You are not authorized to delete this order",
      });
    }

    // Delete the order from the database
    await Order.findByIdAndDelete(id);
    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete order" });
  }
};


export const getCustomers = async (req, res) => {
  try {
    // Find unique user IDs from orders
    const customerIds = await Order.distinct("userId");

    // Fetch user details for these customers
    const customers = await User.find({ _id: { $in: customerIds } }).select(
      "firstName lastName email phone createdAt"
    );

    // Fetch order count for each customer
    const customersWithOrders = await Promise.all(
      customers.map(async (customer) => {
        const orderCount = await Order.countDocuments({ userId: customer._id });

        return {
          id: customer._id, // Customer ID
          name: `${customer.firstName} ${customer.lastName}`, // Full Name
          email: customer.email,
          phone: customer.phone,
          orders: orderCount, // Number of orders
          status: orderCount > 0 ? "Active" : "Inactive", // Status based on orders
          joinedDate: customer.createdAt, // Date of Registration
        };
      })
    );

    res.status(200).json({
      success: true,
      count: customersWithOrders.length,
      customers: customersWithOrders,
    });
  } catch (error) {
    console.error("❌ Error fetching customers:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// private messages to specify the order 
export const updateOrderMessage = async (req, res) => {
	try {
		const { orderId } = req.params;
		const { message } = req.body; // The new message from the admin
console.log(message)
		// Check if the user is an admin
		if (req.user.role !== 'seller') {
			return res.status(403).json({ success: false, message: 'Only admins can update the order message' });
		}

		// Validate the order ID
		if (!mongoose.Types.ObjectId.isValid(orderId)) {
			return res.status(400).json({ success: false, message: 'Invalid order ID' });
		}

		// Find the order and update the message
		const updatedOrder = await Order.findByIdAndUpdate(
			orderId,
			{ message }, // Update the message field
			{ new: true }, // Return the updated order
		);

		if (!updatedOrder) {
			return res.status(404).json({ success: false, message: 'Order not found' });
		}

		res.status(200).json({ success: true, message: 'Message updated successfully', updatedOrder });
	} catch (error) {
		console.error('Error updating order message:', error);
		res.status(500).json({ success: false, message: 'Internal server error' });
	}
};

//get private message
export const getOrderMessage = async (req, res) => {
	try {
		const { orderId } = req.params;
		// Check if the user is an admin
		if (req.user.role !== 'seller') {
			return res.status(403).json({ success: false, message: 'Only admins can update the order message' });
		}

		// Validate the order ID
		if (!mongoose.Types.ObjectId.isValid(orderId)) {
			return res.status(400).json({ success: false, message: 'Invalid order ID' });
		}

		// Find the order and update the message
		const {message} = await Order.findById(orderId) // Return the updated order
	

		if (!message) {
			return res.status(200).json({ success: true, message: '' });
		}

		res.status(200).json({ success: true, message: message });
	} catch (error) {
		console.error('Error getting order message:', error);
		res.status(500).json({ success: false, message: 'Internal server error' });
	}
};

// send order email
export const sendOrderEmail = async (req, res) => {
	try {
		const { orderId } = req.params;
		const { message } = req.body;

		// Validate the order ID
		if (!mongoose.Types.ObjectId.isValid(orderId)) {
			return res.status(400).json({ success: false, message: 'Invalid order ID' });
		}

		// Find the order
		const order = await Order.findById(orderId);

		if (!order) {
			return res.status(404).json({ success: false, message: 'Order not found' });
		}

		// Get the user ID from the order
		const userId = order.userId.toString();

		// Find the user by ID to get the email
		const user = await User.findById(userId);

		if (!user) {
			return res.status(404).json({ success: false, message: 'User not found' });
		}

		// Get the customer's email
		const customerEmail = user.email;

		console.log('Recipient Email:', customerEmail); // Debugging line

		if (!customerEmail) {
			return res.status(400).json({ success: false, message: 'Customer email not found' });
		}

		// Send the email to the customer
		await sendEmail({
			email: customerEmail,
			subject: 'Message from Seller',
			message: message,
		});

		res.status(200).json({ success: true, message: 'Email sent successfully' });
	} catch (error) {
		console.error('Error sending email:', error);
		res.status(500).json({ success: false, message: 'Failed to send email' });
	}
};