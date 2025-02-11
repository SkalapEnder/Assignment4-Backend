const express = require('express');
const mongoose = require("mongoose");
const axios = require('axios');
const router = express.Router();
const User = require('../models/User');

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Build: Connected to MongoDB Atlas'))
    .catch((err) => console.error('Error connecting to MongoDB Atlas:', err));

const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.redirect('/login');
};

router.get('/build', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findOne({ user_id: req.session.userId });
        const products_recent = user? user.history_gpus : [] ;
        console.log(products_recent);
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
        res.json({ products: [] });
    }
});

router.get('/api/gpus', async (req, res) => {
    try {
        const search = req.query.search;
        if (!search) return res.render('templates/error', {errorMessage: 'Missing search query' });

        const apiUrl = 'https://raw.githubusercontent.com/voidful/gpu-info-api/gpu-data/gpu.json';
        const response = await axios.get(apiUrl);
        const allGPUs = response.data;

        const filteredGPUs = Object.entries(allGPUs)
            .filter(([key, value]) => value.Model.toLowerCase().includes(search.toLowerCase()))
            .map(([key, value]) => ({ identifier: key, ...value }));

        res.json(filteredGPUs);
    } catch (error) {
        console.error('Error fetching GPU data:', error);
        return res.render('templates/error', {errorMessage: 'Failed to fetch GPU data' });
    }
});

router.get('/api/gpus/:gpu', async (req, res) => {
    try {
        const search = req.params.gpu;
        const apiUrl = 'https://raw.githubusercontent.com/voidful/gpu-info-api/gpu-data/gpu.json';
        const response = await axios.get(apiUrl);
        const allGPUs = response.data;

        const filteredGPUs = Object.entries(allGPUs)
            .filter(([key, value]) => value.Model.toLowerCase().includes(search.toLowerCase()))
            .map(([key, value]) => ({ identifier: key, ...value }));

        if (filteredGPUs.length === 0) {
            return res.render('templates/error', {errorMessage: 'GPU not found' });
        }

        res.json({ gpu: filteredGPUs[0] });
    } catch (error) {
        console.error('Error fetching GPU data:', error);
        return res.render('templates/error', {errorMessage: 'Failed to fetch GPU data' });
    }
});

router.post('/add-gpu', async (req, res) => {
    try {
        const { gpuModel, gpuIdentifier } = req.body;
        const userId = req.session.userId;

        if (!userId) {
            return res.render('templates/error', {errorMessage: 'Unauthorized' });
        }

        const user = await User.findOne({ _id: userId });
        if (!user) {
            return res.render('templates/error', {errorMessage: 'User not found' });
        }

        if (user.history_gpus.length >= 5) {
            user.history_gpus.shift();
        }

        user.history_gpus.push({ gpuModel, gpuIdentifier: gpuIdentifier || null, createdAt: new Date() });
        await user.save();
    } catch (error) {
        console.error('Error adding GPU:', error);
        return res.render('templates/error', {errorMessage: 'Failed to add GPU' });
    }
});

module.exports = router;
