const prisma = require('../config/prisma');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create Costume
exports.create = async (req, res) => {
    try {

        console.log("Request Body:", req.body); // <== เพิ่มบรรทัดนี้

        const { name, description, rentalPrice, sizes, salePrice, categoryId, available,quantity, images , rentalOptions } = req.body;
      

        if (!sizes) {
            return res.status(400).json({ message: "sizes is required" });
        }

        // ตรวจสอบ rentalOptions
        if (!Array.isArray(rentalOptions)) {
            return res.status(400).json({ message: "rentalOptions must be an array" });
        }

        // กรอง rentalOptions เพื่อให้มีเฉพาะข้อมูลที่ถูกต้อง
        const validRentalOptions = Array.isArray(rentalOptions)
        ? rentalOptions.filter((option) => option.duration && !isNaN(option.price))
        : [];
            

        const costume = await prisma.costume.create({
            data: {
                name,
                description,
                rentalPrice: parseFloat(rentalPrice),
                salePrice: parseFloat(salePrice),
                categoryId: parseInt(categoryId),
                available: Boolean(available),  sizes ,quantity: parseInt(quantity) , // เพิ่ม sizes เข้าไป
                images: {
                    create: images.map((item) => ({
                        asset_id: item.asset_id,
                        public_id: item.public_id,
                        url: item.url,
                        secure_url: item.secure_url,
                    })),
                },
                rentalOptions: {
                    createMany: {
                      data: validRentalOptions.length > 0
                        ? validRentalOptions.map((option) => ({
                            duration: parseInt(option.duration),
                            price: parseFloat(option.price),
                          }))
                        : [], // Default เป็น array ว่างหากไม่มีข้อมูล
                    },
                  },
                },
              });

        res.status(201).json({ message: "Costume created successfully", costume });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error", error: err.message });
    }
};

// List Costumes
exports.list = async (req, res) => {
    try {
        const { count } = req.params;

        const costumes = await prisma.costume.findMany({
            take: parseInt(count),
            orderBy: { createdAt: 'desc' },
            include: { category: true, images: true , rentalOptions: true},
        });

        res.status(200).json(costumes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error", error: err.message });
    }
};

// Read Costume by ID
exports.read = async (req, res) => {
    try {
      const { id } = req.params;
      const costume = await prisma.costume.findUnique({
        where: { id: Number(id) },
        include: { category: true, images: true, rentalOptions: true }, // รวม rentalOptions
      });
  
      if (!costume) {
        return res.status(404).json({ message: "Costume not found" });
      }
  
      res.status(200).json(costume);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server Error", error: err.message });
    }
  };

// Update Costume
exports.update = async (req, res) => {
    try {
        const { name, description, rentalPrice, salePrice, categoryId, available, images , sizes , quantity ,rentalOptions } = req.body;
        const { id } = req.params;

        // Delete old images
        await prisma.image.deleteMany({
            where: { costumeId: Number(id) },
        });

        // ลบ rentalOptions เดิม
        await prisma.rentalOption.deleteMany({
            where: { costumeId: Number(id) },
        });

            // กรอง rentalOptions เพื่อให้มีเฉพาะข้อมูลที่ถูกต้อง
        const validRentalOptions = Array.isArray(rentalOptions)
        ? rentalOptions.filter((option) => option.duration && !isNaN(option.price))
        : [];

        const updatedCostume = await prisma.costume.update({
            where: { id: Number(id) },
            data: {
                name,
                description,
                rentalPrice: parseFloat(rentalPrice),
                salePrice: parseFloat(salePrice),
                categoryId: parseInt(categoryId),
                sizes,
                rentalOptions,
                quantity: parseInt(quantity) ,
                available: Boolean(available),
                images: {
                    create: images.map((item) => ({
                        asset_id: item.asset_id,
                        public_id: item.public_id,
                        url: item.url,
                        secure_url: item.secure_url,
                    })),
                },
                rentalOptions: {
                    createMany: {
                      data: validRentalOptions.length > 0
                        ? validRentalOptions.map((option) => ({
                            duration: parseInt(option.duration),
                            price: parseFloat(option.price),
                          }))
                        : [], // Default เป็น array ว่างหากไม่มีข้อมูล
                    },
                  },
                },
              });

        res.status(200).json({ message: "Costume updated successfully", updatedCostume });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error", error: err.message });
    }
};

// Remove Costume
exports.remove = async (req, res) => {
    try {
        const { id } = req.params;

        const costume = await prisma.costume.findUnique({
            where: { id: Number(id) },
            include: { images: true },
        });

        if (!costume) {
            return res.status(404).json({ message: "Costume not found" });
        }

        // Delete images from cloud
        const deletePromises = costume.images.map((image) =>
            new Promise((resolve, reject) => {
                cloudinary.uploader.destroy(image.public_id, (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                });
            })
        );

        await Promise.all(deletePromises);

        // Delete costume
        await prisma.costume.delete({
            where: { id: Number(id) },
        });

        res.status(200).json({ message: "Costume deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error", error: err.message });
    }
};

// List Costumes by Filters
exports.listByFilters = async (req, res) => {
    try {
        const { sort, order, limit } = req.body;

        const costumes = await prisma.costume.findMany({
            take: limit,
            orderBy: { [sort]: order },
            include: { category: true, images: true },
        });

        res.status(200).json(costumes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error", error: err.message });
    }
};

// Search Filters
exports.searchFilters = async (req, res) => {
    try {
        const { query, category, price } = req.body;

        let whereCondition = {};

        if (query) {
            whereCondition.name = { contains: query };
        }

        if (category) {
            whereCondition.categoryId = { in: category.map((id) => Number(id)) };
        }

        if (price) {
            whereCondition.salePrice = {
                gte: price[0],
                lte: price[1],
            };
        }

        const costumes = await prisma.costume.findMany({
            where: whereCondition,
            include: { category: true, images: true },
        });

        res.status(200).json(costumes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error", error: err.message });
    }
};

// Upload Images
exports.uploadImages = async (req, res) => {
    try {
        const result = await cloudinary.uploader.upload(req.body.image, {
            public_id: `Cosplay-${Date.now()}`,
            resource_type: 'auto',
            folder: 'CosplayCostumes',
        });

        res.status(201).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error", error: err.message });
    }
};

// Remove Image
exports.removeImage = async (req, res) => {
    try {
        const { public_id } = req.body;

        cloudinary.uploader.destroy(public_id, (error, result) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ message: "Failed to delete image" });
            }
            res.status(200).json({ message: "Image deleted successfully", result });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error", error: err.message });
    }
};
