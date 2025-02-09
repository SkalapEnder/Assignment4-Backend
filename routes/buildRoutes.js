const express = require('express');
const mongoose = require("mongoose");
const axios = require('axios');
const router = express.Router();
const User = require('../models/User');

mongoose.connect('mongodb+srv://skalap2endra:kGOM7z5V54vBFdp1@cluster0.vannl.mongodb.net/assignment3?retryWrites=true&w=majority&appName=Cluster0')
    .then(() => console.log('Build: Connected to MongoDB Atlas'))
    .catch((err) => console.error('Error connecting to MongoDB Atlas:', err));

router.get('/build', async (req, res) => {
    if (req.session.userId === undefined) {
        return res.redirect('/login');
    }

    try {
        const user = await User.findOne({ user_id: req.session.userId });
        const products_recent = user ? user.history_gpus : [];

        res.render('tasks/build', {
            products: [],
            products_recent: products_recent,
        });
    } catch (error) {
        console.error('Error fetching recently viewed GPUs:', error);
        res.render('tasks/build', {
            products: [],
            products_recent: [],
        });
    }
});

router.get('/api/gpus', async (req, res) => {
    const search = req.query.search; // User's input
    const apiUrl = 'https://raw.githubusercontent.com/voidful/gpu-info-api/gpu-data/gpu.json';

    try {
        const response = await axios.get(apiUrl);
        const allGPUs = response.data;
        const filteredGPUs = [];

        for (const [key, value] of Object.entries(allGPUs)) {
            const searchLower = search.toLowerCase();
            if (value.Model.toLowerCase().includes(searchLower)) {
                filteredGPUs.push({ identifier: key, ...value });
            }
        }

        res.json(filteredGPUs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch GPU data' });
    }
});

router.get('/api/search/:gpu', async (req, res) => {
    const gpuName = req.params.gpu;

    const options = {
        method: 'GET',
        url: 'https://real-time-amazon-data.p.rapidapi.com/search',
        params: {
            query: gpuName,
            page: '1',
            country: 'US',
            sort_by: 'REVIEWS',
            product_condition: 'NEW',
        },
        headers: {
            'x-rapidapi-key': '6c6625f883msh2274802339f753fp17f542jsnbd5531f0fdc3',
            'x-rapidapi-host': 'real-time-amazon-data.p.rapidapi.com'
        }
    };

    try {
        const response = await axios.request(options);
        const products = response.data.data.products;

        res.json({ products: products });
    } catch (error) {
        console.error(error);
        res.render('index', { products: [] });
    }
});

router.get('/api/gpus/:gpu', async (req, res) => {
    const search = req.params.gpu;
    const apiUrl = 'https://raw.githubusercontent.com/voidful/gpu-info-api/gpu-data/gpu.json';

    try {
        const response = await axios.get(apiUrl);
        const allGPUs = response.data;
        const filteredGPUs = [];

        for (const [key, value] of Object.entries(allGPUs)) {
            const searchLower = search.toLowerCase();
            if (value.Model.toLowerCase().includes(searchLower)) {
                filteredGPUs.push({ identifier: key, ...value });
            }
        }

        res.json(filteredGPUs[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch GPU data' });
    }
});

router.post('/add-gpu', async (req, res) => {
    try {
        const gpu = req.body;
        const userId = req.session.userId;
        const user = await User.findOne({user_id: userId});
        if (user === null) {
            return res.render('templates/error', {errorMessage: 'User not found'});
        }

        const newsGroup = user.history_gpus;
        if (newsGroup.length > 4) {
            newsGroup.pop()
        }
        const update = {
            $push: {
                history_gpus: {
                    $each: [gpu.Model],
                    $position: 0,
                },
            },
        };

        const result = await User.findOneAndUpdate({user_id: userId}, update)
        console.log(`${result.modifiedCount} document updated`);
        res.redirect('tasks/build');
    } catch (error) {
        console.error(error);
    }
});



module.exports = router;