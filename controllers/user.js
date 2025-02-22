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
        createdAt: true,
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
        item.selectedPurchaseType === "RENTAL" && item.rentalDuration
          ? costume.rentalPrice * item.rentalDuration // คูณกับจำนวนวันเช่า
          : costume.salePrice; // ราคาขายปกติ
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
        rentalDuration: item.selectedRentalDuration || null, // เพิ่ม rentalDuration ลงใน CostumeOnCart
  
        
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
        rentalDuration: item.rentalDuration, // เพิ่ม rentalDuration ลงใน CostumeOnCart
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

    // คำนวณวันเช่าสำหรับแต่ละสินค้า
    const today = new Date();
    const orderData = {
      costumes: {
        create: userCart.costumes.map((item) => {
          let rentalStartDate = new Date(today);
          let rentalEndDate = new Date(today);
          if (item.type === "RENTAL" && item.rentalDuration > 0) {
            rentalEndDate.setDate(today.getDate() + item.rentalDuration);
          } else {
            rentalEndDate.setDate(today.getDate() + 1); // ค่าเริ่มต้นเช่า 1 วัน
          }
          return {
            costumeId: item.costumeId,
            count: item.count,
            price: item.price,
            size: item.size || userCart.size,
            type: item.type || userCart.type,
            rentalDuration: item.rentalDuration,
            rentalStartDate: rentalStartDate,
            rentalEndDate: rentalEndDate,
            rentalStatus: item.type === "RENTAL" ? "Rented" : null,
          };
        }),
      },
      orderBy: { connect: { id: req.user.id } },
      totalPrice: userCart.totalPrice,
      stripePaymentId: id,
      amount: Number(amount) / 100,
      statu: status,
      currentcy: currency || "thb",
    };

    // บันทึกข้อมูลออเดอร์
    const order = await prisma.order.create({ data: orderData });

    // Update costume availability and sold count
    for (const item of userCart.costumes) {
      const costume = await prisma.costume.findUnique({
        where: { id: item.costumeId },
        select: { sold: true, quantity: true },
      });
      if (!costume) {
        throw new Error(`Costume with ID ${item.costumeId} not found`);
      }
      if (costume.quantity < item.count) {
        throw new Error(`Not enough stock for costume ID ${item.costumeId}`);
      }
      await prisma.costume.update({
        where: { id: item.costumeId },
        data: {
          sold: { increment: item.count },
          quantity: { decrement: item.count },
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



const bcrypt = require('bcryptjs'); // ใช้เข้ารหัส password
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id; // ดึง ID จาก token (middleware authCheck ต้องแน่ใจว่าแนบ req.user มา)
        const { name, email, password } = req.body;

        // ตรวจสอบว่ามีผู้ใช้อยู่หรือไม่
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        let updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
        });

        res.json({
            message: 'Profile updated successfully',
            user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};




// Get Rentals (เฉพาะคำสั่งเช่า)
exports.getRentals = async (req, res) => {
  try {
    const userId = req.user.id;
    const rentals = await prisma.order.findMany({
      where: {
        orderById: userId,
        costumes: { some: { type: "RENTAL" } },
      },
      include: {
        costumes: {
          include: { costume: true },
        },
        orderBy: true,
      },
    });
    if (!rentals || rentals.length === 0) {
      return res.status(404).json({ message: "No rental orders found" });
    }
    const formattedRentals = rentals.flatMap((order) =>
      order.costumes.map((costume) => ({
        id: order.id,
        username: order.orderBy.email,
        product: costume.costume.name || "ไม่มีข้อมูล",
        size: costume.size || "ไม่มีข้อมูล",
        startDate: costume.rentalStartDate ? costume.rentalStartDate.toISOString() : null,
        endDate: costume.rentalEndDate ? costume.rentalEndDate.toISOString() : null,
        rentalStatus: costume.rentalStatus || "ไม่มีข้อมูล",
      }))
    );
    res.json(formattedRentals);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Return Rental
exports.returnRental = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
    });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    const now = new Date();
    if (new Date(order.rentalEndDate) < now) {
      return res.status(400).json({ message: "Cannot return overdue rental" });
    }
    const updatedOrder = await prisma.order.update({
      where: { id: Number(orderId) },
      data: {
        status: "Returned", // อัปเดตสถานะเป็น "Returned"
      },
    });
    res.json({ message: "Marked rental as returned successfully", order: updatedOrder });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};


// Update Rental Status
exports.updateRentalStatus = async (req, res) => {
  try {
    const { id } = req.params; // ดึง ID จาก URL
    const { status } = req.body; // ดึงค่าที่ส่งมาใน body
    // อัปเดตค่าใน Database
    const updatedRental = await prisma.order.update({
      where: { id: parseInt(id) },
      data: {
        costumes: {
          updateMany: {
            where: { rentalStatus: { not: status } }, // อัปเดตเฉพาะที่ไม่ตรงกับ status เดิม
            data: { rentalStatus: status },
          },
        },
      },
      include: { costumes: true },
    });
    res.json({ message: "Rental status updated", rental: updatedRental });
  } catch (err) {
    console.error("Error updating rental status:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

