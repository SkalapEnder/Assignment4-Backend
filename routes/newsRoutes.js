const express = require('express');
const axios = require('axios')
const mongoose = require("mongoose");
const router = express.Router();
const apiKey = '9656e146df53439e85473528e1af6e21'
const User = require('../models/User');

let articles = [];
let lastUpdate = new Date();

mongoose.connect('mongodb+srv://skalap2endra:kGOM7z5V54vBFdp1@cluster0.vannl.mongodb.net/assignment3?retryWrites=true&w=majority&appName=Cluster0')
    .then(() => console.log('News: Connected to MongoDB Atlas'))
    .catch((err) => console.error('Error connecting to MongoDB Atlas:', err));

router.get('/news', async (req, res) => {
    if (req.session.userId === undefined) return res.redirect('/login');

    const page = parseInt(req.query.page) || 1;
    const pageSize = 15;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    const queries = ['GPU', 'AMD', 'NVIDIA', 'RTX', 'PC'];

    try {
        // If array is empty or 1-2 days was passed
        if (articles.length === 0 || isMidnightPassed()) {
            articles = await updateArticles(queries, apiKey);
        }

        const paginatedArticles = articles.slice(startIndex, endIndex);
        const totalPages = Math.max(Math.ceil(articles.length / pageSize), 1);

        // Fetch the user's favorite news
        const user = await User.findOne({ user_id: req.session.userId });
        const favoriteNews = user ? user.favorite_news : [];

        res.render('tasks/news', {
            articles: paginatedArticles,
            favoriteNews: favoriteNews,
            currentPage: page,
            totalPages: totalPages,
        });
    } catch (error) {
        console.error("Error fetching news:", error);
        res.render("tasks/news", {
            articles: [],
            favoriteNews: [],
            currentPage: 1,
            totalPages: 1,
        });
    }
});

router.post('/add-news', async (req, res) => {
    if (req.session.userId === undefined) return res.redirect('/login');

    try {
        const newsData = JSON.parse(req.body.newsData); // Parse the JSON string
        const user = await User.findOne({ user_id: req.session.userId });

        if (user) {
            const isAlreadyFavorite = user.favorite_news.some(
                (article) => article.url === newsData.url
            );

            if (!isAlreadyFavorite) {
                user.favorite_news.push(newsData); // Add the news to favorites
                await user.save();
                res.redirect('/news');
            } else {
                return res.redirect('/news');
            }
        } else {
            return res.render('templates/error', {errorMessage: 'User not found.' });
        }
    } catch (error) {
        console.error('Error adding news to favorites:', error);
        return res.render('templates/error', {errorMessage: 'Internal server error.' });
    }
});

router.post('/remove-favorite-news', async (req, res) => {
    try {
        const { newsLink } = req.body; // Get the news URL to remove
        const user = await User.findOne({ user_id: req.session.userId });

        if (user) {
            user.favorite_news = user.favorite_news.filter(
                (article) => article.url !== newsLink
            );
            await user.save();
            res.redirect('/news');
        } else {
            return res.render('templates/error', {errorMessage: 'User not found.' });
        }
    } catch (error) {
        console.error('Error removing news from favorites:', error);
        return res.render('templates/error', {errorMessage: 'Internal server error.' });
    }
});

module.exports = router;

async function fetchAndFilterArticles(queries, from, to, apiKey) {
    const fetchedArticles = [];
    const urls = new Set();

    for (const query of queries) {
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&language=en&from=${from}&to=${to}&apiKey=${apiKey}`;

        try {
            const resp = await fetch(url);

            // Handle rate-limiting (status code 429)
            if (resp.status === 429) {
                throw new Error('The News server is busy. Please try again later!');
            }

            const data = await resp.json();
            const queryArticles = data.articles;

            for (const article of queryArticles) {
                if (urls.has(article.url)) continue;

                const content = [article.title, article.description, article.content]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                const hasKeyword = queries.some(keyword => content.includes(keyword.toLowerCase()));

                if (hasKeyword) {
                    fetchedArticles.push(article);
                    urls.add(article.url);
                }
            }
        } catch (error) {
            console.error(`Error fetching articles for query "${query}":`, error);
            throw error;
        }
    }

    return fetchedArticles;
}

function isMidnightPassed() {
    if (lastUpdate === null) return true;

    const now = new Date();
    const lastUpdateDate = new Date(lastUpdate);

    return (
        now.getUTCDate() !== lastUpdateDate.getUTCDate() ||
        now.getUTCMonth() !== lastUpdateDate.getUTCMonth() ||
        now.getUTCFullYear() !== lastUpdateDate.getUTCFullYear()
    );
}

async function updateArticles(queries, apiKey) {
    const now = new Date();
    const from = new Date(now);
    from.setUTCDate(now.getUTCDate() - 2);
    from.setUTCHours(0, 0, 0, 0);

    const to = new Date(now);
    to.setUTCHours(23, 59, 59, 999);

    try {
        const fetchedArticles = await fetchAndFilterArticles(queries, from.toISOString(), to.toISOString(), apiKey);

        lastUpdate = now.toISOString();
        console.log('Articles updated successfully.');
        return fetchedArticles;
    } catch (error) {
        console.error('Error updating articles:', error);
        throw error;
    }
}