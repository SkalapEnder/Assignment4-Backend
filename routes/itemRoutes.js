const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const Item = require("../models/Item");
const router = express.Router();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
    },
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        return cb(new Error("Only images are allowed"));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: fileFilter,
});

router.post("/add-item", upload.array("images", 5), async (req, res) => {
    try {
        const { name, description, nameRu, descriptionRu, } = req.body;

        if (!name || !description || !nameRu || !descriptionRu) {
            return res.status(400).json({ errorMessage: "Name and description are required." });
        }

        if (!req.files || req.files.length < 3) {
            return res.status(400).json({ errorMessage: "You must upload at least 3 images." });
        }

        const imagePaths = req.files.map(file => `uploads/${file.filename}`);

        const newItem = new Item({
            name,
            nameRu,
            description,
            descriptionRu,
            images: imagePaths,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        await newItem.save();
        res.status(201).json({ message: "Item successfully created!" });
    } catch (error) {
        console.error("Error creating item:", error);
        res.status(500).json({ errorMessage: "Internal Server Error: " + error.message });
    }
});

router.delete("/delete-item/:id", async (req, res) => {
    try {
        const id = req.params.id;

        const item = await Item.findOne({_id: id});
        if (!item) {
            return res.status(404).json({ errorMessage: "Item not found" });
        }

        item.images.forEach((imagePath) => {
            const fullPath = path.join(__dirname, "..", imagePath);
            fs.unlink(fullPath, (err) => {
                if (err && err.code !== "ENOENT") {
                    console.error("Error deleting image:", err);
                }
            });
        });

        // Delete item from database
        await Item.findOneAndDelete({_id: id});

        res.json({ message: "Item and images successfully deleted" });
    } catch (error) {
        console.error("Error deleting item:", error);
        res.status(500).json({ errorMessage: "Internal Server Error: " + error.message });
    }
});

// Update Item & Images
router.put('/items/update/:id', async (req, res) => {
    try {
        const { name, nameRu, description, descriptionRu } = req.body;
        await Item.findByIdAndUpdate(req.params.id, { name, nameRu, description, descriptionRu });
        res.json({ message: "Item updated successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

router.post('/items/upload-image/:id', upload.single('image'), async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ message: "Item not found" });
        }

        item.images.push(`/uploads/${req.file.filename}`); // Store image path
        await item.save();

        res.json({ message: "Image uploaded successfully!", imageUrl: `/uploads/${req.file.filename}` });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

router.delete('/items/delete-image/:id/:index', async (req, res) => {
    try {
        const { id, index } = req.params;
        const item = await Item.findById(id);
        if (!item) {
            return res.status(404).json({ message: "Item not found" });
        }

        item.images.splice(index, 1); // Remove image by index
        await item.save();

        res.json({ message: "Image deleted successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;