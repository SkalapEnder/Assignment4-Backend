const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    user_id: {
        type: Number,
        required: true,
        unique: true,
        validate: {
            validator: Number.isInteger,
            message: 'user_id must be an integer',
        },
    },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true},
    role: { type: String, enum: ['admin', 'user'], required: true },

    favorite_news: {
        type: [{
            title: String,
            url: String,
            urlToImage: String,
            author: String,
            publishedAt: Date,
            description: String,
        }],
        default: [],
    },
    history_gpus: { type: [String], default: [] },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    // if (this.isModified('password')) {
    //     this.password = await bcrypt.hash(this.password, 10);
    // }
    next();
});

userSchema.methods.comparePassword = async function (password) {
    password = await bcrypt.hash(password, 11);
    return bcrypt.compare(password, this.password);
};

const User = mongoose.model('user_list', userSchema);
module.exports = User;

