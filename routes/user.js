const express = require('express');
const router = express.Router();
const { authCheck, adminCheck } = require('../middlewares/authCheck');
const {
    listUsers,
    changeStatus,
    changeRole,
    userCart,
    getUserCart,
    emptyCart,
    saveAddress,
    saveOrder,
    getOrder,
    updateProfile,
    getRentals, // เพิ่มฟังก์ชัน getRentals
    returnRental, // เพิ่มฟังก์ชัน returnRental
    updateRentalStatus,
} = require('../controllers/user');

// Admin-only routes
router.get('/users', authCheck, adminCheck, listUsers); // แสดงรายชื่อผู้ใช้ทั้งหมด
router.post('/change-status', authCheck, adminCheck, changeStatus); // เปลี่ยนสถานะผู้ใช้ (enabled/disabled)
router.post('/change-role', authCheck, adminCheck, changeRole); // เปลี่ยนสิทธิ์ผู้ใช้ (USER/ADMIN)

// User Cart routes
router.post('/user/cart', authCheck, userCart); // เพิ่มสินค้า/ชุดคอสเพลย์ในตะกร้า
router.get('/user/cart', authCheck, getUserCart); // แสดงตะกร้าของผู้ใช้
router.delete('/user/cart', authCheck, emptyCart); // ล้างตะกร้าของผู้ใช้

// User Address routes
router.post('/user/address', authCheck, saveAddress); // บันทึกที่อยู่ผู้ใช้

// User Order routes
router.post('/user/order', authCheck, saveOrder); // บันทึกคำสั่งซื้อหรือเช่าชุดคอสเพลย์
router.get('/user/order', authCheck, getOrder); // แสดงคำสั่งซื้อของผู้ใช้

router.patch('/user/update-profile', authCheck , updateProfile); 

router.get('/user/profile', authCheck, async (req, res) => {
    try {
      const user = req.user; // Assuming `authCheck` middleware attaches the user to `req.user`
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user); // Return user data
    } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Rental Tracking routes
router.get('/user/rentals', authCheck, getRentals); // ดึงข้อมูลคำสั่งเช่า
router.post('/user/return-rental', authCheck, returnRental); // แจ้งคืนสินค้า


router.put("/user/rentals/:id/status", authCheck, updateRentalStatus); // ใช้สำหรับอัปเดตสถานะเช่าสินค้า

module.exports = router;
