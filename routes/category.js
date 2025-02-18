const express = require('express');
const router = express.Router();
const {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
} = require('../controllers/category');
const { authCheck, adminCheck } = require('../middlewares/authCheck');

// @ENDPOINT https://forcosplay.com/api/category
router.post('/category', authCheck, adminCheck, createCategory); // สร้างหมวดหมู่
router.get('/category', getAllCategories); // ดึงข้อมูลหมวดหมู่ทั้งหมด
router.get('/category/:id', getCategoryById); // ดึงข้อมูลหมวดหมู่ตาม ID
router.put('/category/:id', authCheck, updateCategory); // อัปเดตหมวดหมู่
router.delete('/category/:id', authCheck, adminCheck, deleteCategory); // ลบหมวดหมู่

module.exports = router;
