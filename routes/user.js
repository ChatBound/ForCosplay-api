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



module.exports = router;
