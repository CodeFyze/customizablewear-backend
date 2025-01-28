import Order from "../Models/Order.js";

export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id });
    if (!orders) {
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

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(400).json({
        success: false,
        message: "Order not found",
      });
    }
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

// Create an order
export const createOrder = async (req, res) => {
  try {
    const { products, totalAmount } = req.body;

    const productIds = products.map((item) => item.productId);
    const existingProducts = await Product.find({ _id: { $in: productIds } });

    if (existingProducts.length !== productIds.length) {
      return res
        .status(400)
        .json({ message: "One or more products do not exist." });
    }

    let calculatedTotal = 0;
    for (const item of products) {
      const foundProduct = existingProducts.find(
        (product) => product._id.toString() === item.productId
      );
      if (foundProduct) {
        calculatedTotal += foundProduct.price * item.quantity;
      }
    }

    if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
      return res.status(400).json({
        message: `Total amount mismatch. Expected: ${calculatedTotal.toFixed(2)}, Provided: ${totalAmount.toFixed(2)}`,
      });
    }

    const order = new Order({
      userId: req.user.id,
      products: products.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        customizations: item.customizations || {},
      })),
      totalAmount: calculatedTotal,
    });

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

// Update an order
export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedOrder = await Order.findByIdAndUpdate(id, updates, { new: true });
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

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.userId.toString() !== req.user.id) {
      return res.status(403).json({
        message: "You are not authorized to delete this order",
      });
    }

    await Order.findByIdAndDelete(id);
    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete order" });
  }
};
