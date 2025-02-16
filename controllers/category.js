const prisma = require('../config/prisma');

// Create Category
exports.createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        const newCategory = await prisma.category.create({
            data: {
                name,
                description,
            },
        });
        res.status(201).json(newCategory); // ส่งข้อมูลหมวดหมู่ใหม่กลับ
    } catch (error) {
        console.error("Error creating category:", error);
        res.status(500).json({ message: "Error creating category", error });
    }
};

// Get All Categories
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            include: { costumes: true }, // รวมข้อมูลชุดคอสเพลย์ในแต่ละหมวดหมู่
        });
        res.status(200).json(categories);
    } catch (error) {
        console.error("Error retrieving categories:", error);
        res.status(500).json({ message: "Error retrieving categories", error });
    }
};

// Get Category by ID
exports.getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await prisma.category.findUnique({
            where: { id: parseInt(id) },
            include: { costumes: true }, // รวมข้อมูลชุดคอสเพลย์ในหมวดหมู่
        });
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }
        res.status(200).json(category);
    } catch (error) {
        console.error("Error retrieving category:", error);
        res.status(500).json({ message: "Error retrieving category", error });
    }
};

// Update Category
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const updatedCategory = await prisma.category.update({
            where: { id: parseInt(id) },
            data: { name, description },
        });
        res.status(200).json(updatedCategory); // ส่งข้อมูลหมวดหมู่ที่อัปเดตกลับ
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({ message: "Error updating category", error });
    }
};

// Delete Category
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.category.delete({
            where: { id: parseInt(id) },
        });
        res.status(204).send(); // ส่งกลับสถานะ 204 (No Content)
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ message: "Error deleting category", error });
    }
};
