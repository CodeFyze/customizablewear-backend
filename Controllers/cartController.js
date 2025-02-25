import multer from 'multer';
import { uploadToCloudinary } from "../config/uploadToCloudinary.js";
import Cart from "../Models/Cart.js";
import Product from '../Models/Product.js';
import Order from '../Models/Order.js';


const storage = multer.memoryStorage(); 
const upload = multer({ storage }).single('logo'); 


// export const addToCart = async (req, res) => {
//   upload(req, res, async (err) => {
//     if (err) {
//       console.error("Error handling file upload:", err);
//       return res.status(400).json({ success: false, message: "File upload failed" });
//     }

//     try {
//       const { productId, quantity, size, color, method, position, usePreviousLogo } = req.body;
//       const userId = req.user?.id;

//       if (!userId) {
//         return res.status(401).json({ success: false, message: "Unauthorized - No user found" });
//       }

//       // Ensure valid quantity
//       const finalQuantity = quantity && Number.isInteger(quantity) && quantity > 0 ? quantity : 1;

//       if (!productId || !finalQuantity || !size || !color) {
//         return res.status(400).json({ success: false, message: "Missing required fields" });
//       }

//       // Fetch the product
//       const product = await Product.findById(productId);
//       if (!product) return res.status(404).json({ success: false, message: "Product not found" });

//       let logoUrl = "";

//       if (usePreviousLogo === "true") {
//         // ✅ Fetch previous logo from user's orders
//         const lastOrderWithLogo = await Order.findOne({ userId, "products.logo": { $exists: true, $ne: "" } })
//           .sort({ createdAt: -1 })
//           .select("products.logo");

//         if (lastOrderWithLogo) {
//           const logoProduct = lastOrderWithLogo.products.find((p) => p.logo);
//           if (logoProduct) logoUrl = logoProduct.logo;
//         }
//       } else if (req.file) {
//         // ✅ Upload new logo
//         logoUrl = await uploadToCloudinary(req.file, "shirt-logo");
//       }

//       let finalPrice = product.price;
//       if (!usePreviousLogo && req.file) finalPrice += 5;

//       let cart = await Cart.findOne({ user: userId });
//       if (!cart) cart = new Cart({ user: userId, products: [] });

//       cart.products.push({
//         product: productId,
//         title: product.title,
//         frontImage: product.frontImage,
//         sideImage: product.sideImage || "",
//         price: finalPrice,
//         size,
//         color,
//         logo: logoUrl || "",
//         quantity: finalQuantity,
//         method: method || "Not selected",
//         position: position || "Not selected",
//       });

//       await cart.save();
//       res.status(200).json({ success: true, cart });
//     } catch (error) {
//       console.error("Error adding to cart:", error);
//       res.status(500).json({ success: false, message: "Internal Server Error" });
//     }
//   });
// };



export const addToCart = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error("Error handling file upload:", err);
      return res.status(400).json({ success: false, message: "File upload failed" });
    }

    try {
      const { productId, quantity, size, color, method, position, usePreviousLogo, textLine, font, notes } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized - No user found" });
      }

      // Ensure valid quantity
      const finalQuantity = quantity && Number.isInteger(quantity) && quantity > 0 ? quantity : 1;

      if (!productId || !finalQuantity || !size || !color) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
      }

      // Fetch the product
      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ success: false, message: "Product not found" });

      let logoUrl = "";

      if (usePreviousLogo === "true") {
        // ✅ Fetch previous logo from user's orders
        const lastOrderWithLogo = await Order.findOne({ userId, "products.logo": { $exists: true, $ne: "" } })
          .sort({ createdAt: -1 })
          .select("products.logo");

        if (lastOrderWithLogo) {
          const logoProduct = lastOrderWithLogo.products.find((p) => p.logo);
          if (logoProduct) logoUrl = logoProduct.logo;
        }
      } else if (req.file) {
        // ✅ Upload new logo
        logoUrl = await uploadToCloudinary(req.file, "shirt-logo");
      }

      let finalPrice = product.price;
      if (!usePreviousLogo && req.file) finalPrice += 5;

      let cart = await Cart.findOne({ user: userId });
      if (!cart) cart = new Cart({ user: userId, products: [] });

      cart.products.push({
        product: productId,
        title: product.title,
        frontImage: product.frontImage,
        sideImage: product.sideImage || "",
        price: finalPrice,
        size,
        color,
        logo: logoUrl || "",
        quantity: finalQuantity,
        method: method || "Not selected",
        position: position || "Not selected",
        textLine: textLine || "",  // ✅ Storing textLine
        font: font || "",  // ✅ Storing font
        notes: notes || ""  // ✅ Storing notes
      });

      await cart.save();
      res.status(200).json({ success: true, cart });
    } catch (error) {
      console.error("Error adding to cart:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  });
};



export const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id; 

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }
    cart.products = cart.products.filter(
      (item) => item.product.toString() !== productId
    );

    await cart.save();

    res.status(200).json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    console.log("Fetching cart for user:", userId);

    // Ensure products are populated correctly
    const cart = await Cart.findOne({ user: userId }).populate(
      "products.product",
      "title frontImage sideImage price"
    );

    // Include method, position, textLine, font, and notes in the response
    const formattedCart = cart?.products.map((item) => ({
      _id: item._id,
      product: item.product,
      title: item.title,
      frontImage: item.frontImage,
      sideImage: item.sideImage,
      price: item.price,
      size: item.size,
      color: item.color,
      logo: item.logo,
      quantity: item.quantity,
      method: item.method || "Not selected",
      position: item.position || "Not selected",
      textLine: item.textLine || "",  // Add textLine to the response
      font: item.font || "",          // Add font to the response
      notes: item.notes || ""         // Add notes to the response
    }));

    res.status(200).json({ success: true, cart: formattedCart });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
