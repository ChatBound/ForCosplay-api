const prisma = require("../config/prisma");

// Change Order Status (Admin Only)
exports.changeOrderStatus = async (req, res) => {
    try {
        const { orderBy, status } = req.body;

        // Debugging: ตรวจสอบข้อมูลที่รับเข้ามา
        console.log("Received data:", { orderBy, status });

        // ตรวจสอบว่ามีค่า orderId และ orderStatus ถูกต้องหรือไม่
        if (!orderBy || !status) {
            return res.status(400).json({ message: "Order ID and status are required" });
        }

        // ตรวจสอบว่าออเดอร์มีอยู่หรือไม่
        const existingOrder = await prisma.order.findUnique({
            where: { id: Number(orderBy) },
        });

        if (!existingOrder) {
            return res.status(404).json({ message: "Order not found" });
        }

        // อัปเดตสถานะออเดอร์
        const updatedOrder = await prisma.order.update({
            where: { id: Number(orderBy) },
            data: { status },
        });

        res.json({ message: "Order status updated successfully", updatedOrder });
    } catch (err) {
        console.error("Error updating order status:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Get All Orders (Admin Only)
exports.getOrderAdmin = async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            include: {
                costumes: {
                    include: {
                        costume: true
                    }
                },
                orderBy: {
                    select: {
                        id: true,
                        email: true,
                        address: true,
                    }
                }
            }
        });

        res.json(orders);
    } catch (err) {
        console.error("Error fetching orders:", err); // แก้ไข console.log(errr) เป็น err
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
