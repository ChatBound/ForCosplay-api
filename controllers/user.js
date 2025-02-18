const prisma = require("../config/prisma");

// List Users
exports.listUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name:true,
        email: true,
        role: true,
        enabled: true,
        address: true,
      },
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Change User Status (Enabled/Disabled)
exports.changeStatus = async (req, res) => {
  try {
    const { id, enabled } = req.body;
    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: { enabled: enabled },
    });
    res.send("Update Status Success");
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Change User Role (USER/ADMIN)
exports.changeRole = async (req, res) => {
  try {
    const { id, role } = req.body;
    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: { role: role },
    });
    res.send("Update Role Success");
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Add Items to Cart (Buy/Rent Costumes)
exports.userCart = async (req, res) => {
  try {
    const { cart } = req.body;
    const userId = req.user.id;

    // Validate cart data
    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({
        message: "Cart data is invalid or empty",
      });
    }

    // Check availability and fetch price for each costume
    for (const item of cart) {
      const costume = await prisma.costume.findUnique({
        where: { id: item.id },
        select: { available: true, name: true, salePrice: true, rentalPrice: true },
      });
      if (!costume || !costume.available) {
        return res.status(400).json({
          ok: false,
          message: `ขออภัย. ชุดคอสเพลย์ "${costume?.name || "costume"}" ไม่พร้อมใช้งาน`,
        });
      }
      // Determine the price based on selectedPurchaseType
      const price =
        item.selectedPurchaseType === "RENTAL"
          ? costume.rentalPrice
          : costume.salePrice;
      if (!price || isNaN(price)) {
        return res.status(400).json({
          ok: false,
          message: `ขออภัย. ราคาของชุดคอสเพลย์ "${costume?.name || "costume"}" ไม่ถูกต้อง`,
        });
      }
      // Update item with the correct price
      item.price = price;
    }

    // Remove old cart data
    const existingCart = await prisma.cart.findFirst({
      where: { orderById: userId },
      select: { id: true },
    });
    if (existingCart) {
      await prisma.costumeOnCart.deleteMany({
        where: { cartId: existingCart.id },
      });
      await prisma.cart.deleteMany({ where: { orderById: userId } });
    }

    // Validate price and calculate cart total
    const costumesData = cart.map((item) => {
      if (!item.price || isNaN(item.price)) {
        throw new Error(`Invalid price for costume ID ${item.id}`);
      }
      return {
        costumeId: item.id,
        quantity: item.quantity,
        price: item.price, // ใช้ price ที่ถูกต้อง
        size: item.size,
        type: item.selectedPurchaseType || "PURCHASE", // เพิ่ม type ของแต่ละ item
  
        
      };
    });
    const totalPrice = costumesData.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    if (isNaN(totalPrice)) {
      throw new Error("Cart total calculation failed");
    }

// Create new cart
const newCart = await prisma.cart.create({
  data: {
    costumes: {
      create: costumesData.map((item) => ({
        costumeId: item.costumeId,
        count: item.quantity, // เพิ่มค่าสำหรับ count (ใช้ quantity)
        price: item.price,   // คำนวณค่าแล้วกำหนดให้ฟิลด์ price
        size: item.size,     // เพิ่ม size ลงใน CostumeOnCart
        type: item.type, // ใช้ type ของแต่ละ item
      })),
    },
    orderById: userId,
    type: cart.selectedPurchaseType || "PURCHASE", // ใช้ค่าจาก selectedPurchaseType ของรายการแรก
    totalPrice: totalPrice, // บันทึก totalPrice เข้าไปในฐานข้อมูล
    size: cart[0].selectedSize, // ใช้ size จากรายการแรก
  },
});
    // ส่ง totalPrice กลับไปยัง frontend
    console.log("Cart Data:", cart);
    res.json({
      message: "Add Cart Success",
      totalPrice, // ส่ง totalPrice กลับไปยัง frontend
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Get User Cart
exports.getUserCart = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find the user's cart with related costumes
    const cart = await prisma.cart.findFirst({
      where: { orderById: userId }, // ตรวจสอบชื่อฟิลด์ว่าถูกต้อง (orderById หรือ orderedById)
      include: {
        costumes: {
          include: {
            costume: true, // Include costume details
          },
        },
      },
    });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Calculate cart total from costumes data
    const totalPrice = cart.costumes.reduce(
      (sum, item) => sum + item.price * item.count, // คำนวณราคารวมจาก price และ count
      0
    );

    // Format and send the response
    console.log(cart);
    res.json({
      costumes: cart.costumes.map((item) => ({
        id: item.id,
        costumeId: item.costumeId,
        name: item.costume.name, // ชื่อสินค้า
        image: item.costume.images?.[0]?.url || null, // รูปภาพสินค้า (ถ้ามี)
        price: item.price, // ราคาต่อหน่วย
        count: item.count, // จำนวน
        totalPrice: item.price * item.count, // ราคารวมของรายการนี้
        size: item.size, // เพิ่ม size ลงใน response
        type: item.type, // เพิ่ม type ลงใน response
        
      })),
      totalPrice,
    });

    
  

    
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Empty User Cart
exports.emptyCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await prisma.cart.findFirst({
      where: { orderById: userId },
    });
    if (!cart) {
      return res.status(400).json({ message: "No cart found" });
    }

    await prisma.costumeOnCart.deleteMany({
      where: { cartId: cart.id  },
    });
    await prisma.cart.deleteMany({ where: { orderById: userId } });

    res.json({ message: "Cart emptied successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Save User Address
exports.saveAddress = async (req, res) => {
  try {
    const { address } = req.body;
    const userId = req.user.id;

    await prisma.user.update({
      where: { id: userId },
      data: { address },
    });

    res.json({ message: "Address updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Save Order (Buy/Rent Costumes)
exports.saveOrder = async (req, res) => {
  try {
    const { id, amount, status, currency } = req.body.paymentIntent;
    const userId = req.user.id;

    // Find user's cart with related costumes
    const userCart = await prisma.cart.findFirst({
      where: { orderById: userId },
      include: { costumes: true },
    });

    if (!userCart || userCart.costumes.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Validate totalPrice
    if (!userCart.totalPrice || isNaN(userCart.totalPrice) || userCart.totalPrice <= 0) {
      return res.status(400).json({ message: "Invalid total price in cart" });
    }

    const amountTHB = Number(amount) / 100;
    const order = await prisma.order.create({
      data: {
        costumes: {
          create: userCart.costumes.map((item) => ({
            costumeId: item.costumeId,
            count: item.count, // ใช้ count แทน quantity (ตาม Prisma Schema)
            price: item.price,
            size: item.size || userCart.size, // เพิ่ม size ลงใน CostumeOnOrder
            type: item.type || userCart.type, // เพิ่ม type ลงใน CostumeOnOrder
          })),
        },
        orderBy: {
          connect: { id: req.user.id }, // เชื่อมโยง userId
        },
        totalPrice: userCart.totalPrice, // ใช้ totalPrice จาก cart
        stripePaymentId: id,
        amount: amountTHB,
        statu : status,
        currentcy: currency,
      },
    });

    // Update costume availability and sold count
    for (const item of userCart.costumes) {
      const costume = await prisma.costume.findUnique({
        where: { id: item.costumeId },
        select: { sold: true, quantity: true },
      });
    
      if (!costume) {
        throw new Error(`Costume with ID ${item.costumeId} not found`);
      }
    
      // ตรวจสอบว่ายังมีสินค้าเหลืออยู่หรือไม่
      if (costume.quantity <= 0) {
        throw new Error(`Costume with ID ${item.costumeId} is out of stock`);
      }
    
      // อัปเดตค่า sold และ quantity
      await prisma.costume.update({
        where: { id: item.costumeId },
        data: {
          sold: { increment: item.count }, // เพิ่มค่า sold ตามจำนวนที่ซื้อ
          quantity: { decrement: item.count }, // ลดค่า quantity ตามจำนวนที่ซื้อ
        },
      });
    }

    // Clear cart
    await prisma.cart.deleteMany({ where: { orderById: userId } });

    res.json({ message: "Order placed successfully", order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};



// Get User Orders
exports.getOrder = async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await prisma.order.findMany({
      where: { orderById: userId },
      include: {
        costumes: {
          include: { costume: true },
        },
      },
    });

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "No orders found" });
    }

    res.json({ orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};
