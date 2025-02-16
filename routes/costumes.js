const express = require('express');
const router = express.Router();


// Controller
const {
    create,
    list,
    read,
    update,
    remove,
    listByFilters, // แก้ไขชื่อจาก listby เป็น listByFilters
    searchFilters,
    uploadImages, // แก้ไขชื่อจาก createImages เป็น uploadImages
    removeImage
} = require('../controllers/costumes');

// Middleware
const { authCheck , adminCheck } = require('../middlewares/authCheck');

// **Costume Routes**

// Create Costume
router.post('/costumes', create); // ใช้เฉพาะฟังก์ชัน create

// List Costumes
router.get('/costumes/:count', list);

// Read Costume by ID
router.get('/costume/:id', read);

// Update Costume
router.put('/costume/:id', update);

// Delete Costume
router.delete('/costume/:id',  remove);

// List Costumes by Filter
router.post('/costumes/filter', listByFilters);

// Search Costumes by Filters
router.post('/costumes/search/filters', searchFilters);

// Upload Costume Images
router.post('/costumes/images', authCheck, adminCheck, uploadImages);

// Remove Costume Images
router.post('/costumes/images/remove', authCheck , adminCheck, removeImage);

module.exports = router;
