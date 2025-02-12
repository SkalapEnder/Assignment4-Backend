const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        nameRu: { type: String, required: true },
        description: { type: String, required: true },
        descriptionRu: { type: String, required: true },
        images: [{ type: String, required: true }],
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date },
    },
    { timestamps: true }
);

const Item = mongoose.model("Item", itemSchema);
module.exports = Item;