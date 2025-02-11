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
        const products_recent = user !== null ? user.history_gpus : [] ;

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
            'x-rapidapi-key': 'dfca59b31amshf2fb6536281997dp18b48ejsnf695b2ced82c',
            'x-rapidapi-host': 'real-time-amazon-data.p.rapidapi.com'
        }
    };

    try {
        const response = await axios.request(options);
        if(response.status === 429) res.json({products: []});
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

router.post('/api/gpus/specific', async (req, res) => {
    try {
        const { search } = req.body;
        const apiUrl = 'https://raw.githubusercontent.com/voidful/gpu-info-api/gpu-data/gpu.json';
        const response = await axios.get(apiUrl);
        const allGPUs = response.data;

        const filteredGPUs = Object.entries(allGPUs)
            .filter(([key, value]) => key.toLowerCase().includes(search.toLowerCase()))
            .map(([key, value]) => ({ identifier: key, ...value }));

        if (filteredGPUs.length === 0) {
            return res.status(400).json({errorMessage: 'GPU not found' });
        }

        res.json({ gpu: filteredGPUs[0] });
    } catch (error) {
        console.error('Error fetching GPU data:', error);
        return res.render('templates/error', {errorMessage: 'Failed to fetch GPU data' });
    }
});

router.post('/add-gpu', isAuthenticated, async (req, res) => {
    try {
        const { gpuModel, gpuIdentifier } = req.body;

        const user = await User.findOne({ user_id: req.session.userId });
        if (user === null) {
            return res.status(400).json({errorMessage: 'User does not exist'});
        }

        if (user.history_gpus.length >= 5) {
            user.history_gpus.shift();
        }

        user.history_gpus.push({ gpuModel, gpuIdentifier: gpuIdentifier, createdAt: new Date() });
        await user.save();
        res.status(200);
    } catch (error) {
        console.error('Error adding GPU:', error);
        return res.render('templates/error', {errorMessage: 'Failed to add GPU' });
    }
});

module.exports = router;
