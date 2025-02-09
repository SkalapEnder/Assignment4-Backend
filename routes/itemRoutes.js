const express = require("express");
const multer = require("multer");
const Item = require("../models/Item");
const router = express.Router();


const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// CREATE Item (Admin only)
router.post("/add", upload.array("images", 3), async (req, res) => {
    try {
        const { nameEn, nameOther, descEn, descOther } = req.body;
        const imagePaths = req.files.map((file) => file.path);

        if (imagePaths.length !== 3) {
            return res.status(400).json({ error: "Exactly 3 images are required." });
        }

        const newItem = new Item({
            name: { en: nameEn, otherLang: nameOther },
            description: { en: descEn, otherLang: descOther },
            images: imagePaths,
        });

        await newItem.save();
        res.status(201).json({ message: "Item added successfully", item: newItem });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// READ All Items
router.get("/", async (req, res) => {
    try {
        const items = await Item.find();
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// UPDATE Item (Admin only)
router.put("/edit/:id", upload.array("images", 3), async (req, res) => {
    try {
        const { nameEn, nameOther, descEn, descOther } = req.body;
        let updateData = {
            name: { en: nameEn, otherLang: nameOther },
            description: { en: descEn, otherLang: descOther },
            updatedAt: Date.now(),
        };

        if (req.files.length === 3) {
            updateData.images = req.files.map((file) => file.path);
        }

        const updatedItem = await Item.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!updatedItem) return res.status(404).json({ error: "Item not found" });

        res.json({ message: "Item updated successfully", item: updatedItem });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// DELETE Item (Admin only)
router.delete("/delete/:id", async (req, res) => {
    try {
        const deletedItem = await Item.findByIdAndUpdate(
            req.params.id,
            { deletedAt: Date.now() },
            { new: true }
        );
        if (!deletedItem) return res.status(404).json({ error: "Item not found" });

        res.json({ message: "Item deleted successfully", item: deletedItem });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;