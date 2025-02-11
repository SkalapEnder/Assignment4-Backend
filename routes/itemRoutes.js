const express = require("express");
const multer = require("multer");
const Item = require("../models/Item");
const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// CREATE
router.post("/add-item", upload.array("images", 3), async (req, res) => {
    try {
        const { nameEn, descEn, imagePaths } = req.body;
        const images = imagePaths.split(',');

        if (imagePaths.length !== 3) {
            return res.render('templates/error', { errorMessage: "Exactly 3 images are required."});
        }

        const newItem = new Item({
            name: nameEn,
            description: descEn,
            images: images,
        });

        await newItem.save();
        res.redirect("/items");
    } catch (error) {
        return res.render('templates/error', { errorMessage: "Internal Server Error" + error });
    }
});

// READ
router.get("/", async (req, res) => {
    try {
        const items = await Item.find();
        res.render("tasks/items", {items});
    } catch (error) {
        return res.render('templates/error', { errorMessage: "Internal Server Error" });
    }
});

// UPDATE
router.put("/update-item/:id", upload.array("images", 3), async (req, res) => {
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
        if (!updatedItem) return res.render('templates/error', { errorMessage: "Item not found" });

        res.redirect('/items');
    } catch (error) {
        return res.render('templates/error', { errorMessage: "Internal Server Error" });
    }
});

// DELETE
router.delete("/delete-item/:id", async (req, res) => {
    try {
        const deletedItem = await Item.findByIdAndUpdate(
            req.params.id,
            { deletedAt: Date.now() },
            { new: true }
        );
        if (!deletedItem) return res.render('templates/error', { errorMessage: "Item not found" });

        res.redirect('/items');
    } catch (error) {
        return res.render('templates/error', { errorMessage: "Internal Server Error" });
    }
});

module.exports = router;