const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

// Middleware: ตรวจสอบสิทธิ์ผู้ใช้ (Authentication)
exports.authCheck = async (req, res, next) => {
    try {
        // ตรวจสอบว่า Authorization Header มีค่า
        const headerToken = req.headers.authorization;
        if (!headerToken) {
            return res.status(401).json({ message: "No Token Provided, Authorization Denied" });
        }

        // แยก Token ออกจาก Header
        const token = headerToken.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "Invalid Authorization Format" });
        }

        // ตรวจสอบความถูกต้องของ Token
        const decoded = jwt.verify(token, process.env.SECRET);
        req.user = decoded; // เก็บข้อมูลผู้ใช้ใน req.user

        // ตรวจสอบสถานะของผู้ใช้ในฐานข้อมูล
        const user = await prisma.user.findFirst({
            where: { email: req.user.email },
        });

        if (!user) {
            return res.status(404).json({ message: "User Not Found" });
        }

        if (!user.enabled) {
            return res.status(403).json({ message: "Access Denied: Account is Disabled" });
        }

        next(); // อนุญาตให้เข้าสู่ฟังก์ชันถัดไป
    } catch (err) {
        console.error("AuthCheck Error:", err);

        // ตรวจสอบประเภทข้อผิดพลาดจาก JWT
        if (err.name === "JsonWebTokenError") {
            return res.status(401).json({ message: "Invalid Token" });
        } else if (err.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token Expired" });
        }

        // ข้อผิดพลาดอื่น ๆ
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Middleware: ตรวจสอบสิทธิ์ Admin (Authorization)
exports.adminCheck = async (req, res, next) => {
    try {
        // ใช้ข้อมูล email จาก req.user ที่มาจาก authCheck
        const { email } = req.user;

        // ตรวจสอบผู้ใช้ในฐานข้อมูล
        const adminUser = await prisma.user.findFirst({
            where: { email },
        });

        if (!adminUser) {
            return res.status(404).json({ message: "User Not Found" });
        }

        if (adminUser.role !== "ADMIN") {
            return res.status(403).json({ message: "Access Denied: Admins Only" });
        }

        next(); // อนุญาตให้เข้าสู่ฟังก์ชันถัดไป
    } catch (err) {
        console.error("AdminCheck Error:", err);
        res.status(500).json({ message: "Error Verifying Admin Access" });
    }
};
