import Order from "../Models/Order.js";  
import Product from "../Models/Product.js";  

// Get all orders for a user
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id });

    // Check if no orders were found for the user
    if (orders.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No orders found",
      });
    }

    res.status(200).json({ success: true, orders });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An internal server error occurred",
    });
    console.error("Error in getAllOrders route", error);
  }
};

// Get a single order by ID
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(400).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if the user is the owner of the order
    if (order.userId.toString() !== req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You are not the owner of this order",
      });
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An internal server error occurred",
    });
    console.error("Error in getOrderById route", error);
  }
};

// Create a new order
export const createOrder = async (req, res) => {
  try {
    const { products, totalAmount } = req.body;

    // Get all product IDs from the request body
    const productIds = products.map((item) => item.productId);

    // Fetch the products from the database
    const existingProducts = await Product.find({ _id: { $in: productIds } });

    // Check if any products are missing
    if (existingProducts.length !== productIds.length) {
      const missingProductIds = productIds.filter(
        (id) => !existingProducts.some((product) => product._id.toString() === id)
      );
      return res.status(400).json({
        message: `One or more products do not exist. Missing: ${missingProductIds.join(", ")}`,
      });
    }

    // Calculate the total price for the order
    let calculatedTotal = 0;
    for (const item of products) {
      const foundProduct = existingProducts.find(
        (product) => product._id.toString() === item.productId
      );
      if (foundProduct) {
        calculatedTotal += foundProduct.price * item.quantity;
      }
    }

    // If the provided totalAmount doesn't match the calculated total, return an error
    if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
      return res.status(400).json({
        message: `Total amount mismatch. Expected: ${calculatedTotal.toFixed(2)}, Provided: ${totalAmount.toFixed(2)}`,
      });
    }

    // Create a new order document
    const order = new Order({
      userId: req.user.id, // Assumes `req.user.id` is set by authentication middleware
      products: products.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        customizations: item.customizations || {},
      })),
      totalAmount: calculatedTotal,
    });

    // Save the order to the database
    const savedOrder = await order.save();
    res.status(201).json({
      message: "Order created successfully.",
      order: savedOrder,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Update an existing order
export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Find and update the order with the provided ID
    const updatedOrder = await Order.findByIdAndUpdate(id, updates, { new: true });

    // If order not found, return 404 error
    if (!updatedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ error: "Failed to update order" });
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
