const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
    {
        name: {
            en: { type: String, required: true },
            otherLang: { type: String, required: true },
        },
        description: {
            en: { type: String, required: true },
            otherLang: { type: String, required: true },
        },
        images: [{ type: String, required: true }],
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date },
        deletedAt: { type: Date },
    },
    { timestamps: true }
);

const Item = mongoose.model("Item", itemSchema);
module.exports = Item;