// Import Dependencies
const express = require("express");
const { authCheck, adminCheck } = require("../middlewares/authCheck"); // เพิ่ม adminCheck
const { getOrderAdmin, changeOrderStatus } = require("../controllers/admin");

const router = express.Router();

// Update Order Status (Admin Only)
router.put("/admin/order-status", authCheck, adminCheck, changeOrderStatus);

// Get All Orders (Admin Only)
router.get("/admin/orders", authCheck, adminCheck, getOrderAdmin);

module.exports = router;
