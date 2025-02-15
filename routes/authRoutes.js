const express = require('express');
const User = require('../models/User');
const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');
const passport = require('passport');
const { MailerSend, EmailParams, Sender, Recipient } = require("mailersend");
const LocalStrategy = require('passport-local');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const Item = require('../models/Item');
require('dotenv').config();
const router = express.Router();
const adminCode = process.env.ADMIN_KEY;

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Auth: Connected to MongoDB Atlas'))
    .catch((err) => console.error('Error connecting to MongoDB Atlas:', err));

const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.redirect('/login');
};

const mailerSend = new MailerSend({apiKey: process.env.MAIL_API_KEY,});

const sendEmail = async (to, subject, html) => {
    try {
        const senderEmail = process.env.SENDER_EMAIL;
        const senderName = process.env.SENDER_NAME || "Mailersend Trial";

        const sender = new Sender(senderEmail, senderName);
        const recipients = [new Recipient(to, "Guest")];

        const emailParams = new EmailParams()
            .setFrom(sender)
            .setTo(recipients)
            .setReplyTo(sender)
            .setSubject(subject)
            .setHtml(html)
            .setText(html.replace(/<[^>]*>/g, "")); // Convert HTML to plain text

        const response = await mailerSend.email.send(emailParams);
        return response.statusCode >= 200 && response.statusCode < 300;
    } catch (error) {
        console.error("❌ Error sending email:" + error);
        return false;
    }
};

passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
        const user = await User.findOne({ email: email });
        if (user === null) return done(null, false, { message: 'Invalid email or password' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return done(null, false, { message: 'Invalid email or password' });

        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

passport.serializeUser((user, done) => done(null, user.user_id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findOne({user_id: id});
        done(null, user);
    } catch (err) {
        done(err);
    }
});



// REGISTER part
router.get('/register', (req, res) => res.render('auth/registration', {role: 'user'}));

router.post('/register', [
  body('email').isEmail().withMessage('Invalid email address'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number')
    .matches(/[@$!%*?&]/).withMessage('Password must contain a special character')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errorMessage: errors.array()[0]['msg'] });
    }
    const { username, email, password, role, secretCode } = req.body;

    const existingUser = await User.findOne({ email: email });
    if (existingUser !== null) {
        return res.render('templates/error', { errorMessage: 'User with this email already exists' });
    }

    if (role === 'admin' && secretCode !== adminCode) {
        return res.render('templates/error', { errorMessage: 'Invalid secret code' });
    }

    // Find new free ID from collection (starts from 0)
    const userId = await getNextFreeUserId();
    if (isNaN(userId)) {
        throw new Error('Failed to generate a valid user_id');
    }

    const newUser = new User({
        user_id: userId,
        username: username,
        email: email,
        password: password,
        role: role,
        history_news: [],
        history_gpus: [],
        created_at: new Date(),
        updated_at: new Date(),
    });

    await newUser.save();
    res.redirect('/login');
});



// LOGIN part
router.get('/login', (req, res) => res.render('auth/login'));

router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err);
        }

        if (!user) {
            return res.status(400).json({ errorMessage: 'Invalid email or password' });
        }
        req.logIn(user, (err) => {
            if (err) return next(err);

            req.session.userId = user.user_id;
            req.session.username = user.username;
            req.session.isLoggedIn = true;

            return res.redirect('/');
        });
    })(req, res, next);
});



// UPDATE part
router.get('/update', isAuthenticated, async (req, res) => {
    const user = await getUser(req.session.userId);
    if (user === null) {
        return res.render('templates/error', {errorMessage: 'User not found'});
    }
    res.render('profile/update', {user});
})

router.get('/update/:id', isAuthenticated, async (req, res) => {
    const user = await getUser(req.params.id);
    if (user === null) {
        return res.render('templates/error', {errorMessage: 'User not found'});
    }
    res.render('profile/update', {user});
})

router.post('/update', isAuthenticated, [
    body('email').isEmail().withMessage('Invalid email address'),],
    async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errorMessage: errors.array()[0]['msg'] });
    }

    const { user_id, username, email, role, secret_code } = req.body;

    if (role === 'admin' && secret_code === null) {
        return res.render('templates/error', {errorMessage: 'Secret code is required for admins'});
    }

    try {
        const updateData = {
            username: username,
            email: email,
            role: role };
        if (role === 'admin') {
            if (secret_code !== adminCode) {
                return res.render('templates/error', {errorMessage: 'Invalid secret code'});
            }
        }

        const updatedUser = await User.findOneAndUpdate(
            {user_id: user_id},
            {$set: updateData}
        );
        if (updatedUser === null) {
            return res.render('templates/error', {errorMessage: 'Error updating user'});
        }
        req.session.username = username;
        res.redirect('/profile');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating user.');
    }
});



// USER part
router.get('/profile', isAuthenticated, async (req, res) => {
    const user = await getUser(req.session.userId);
    if (user === null) {
        return res.render('templates/error', {errorMessage: 'User not found'});
    }
    return res.render('profile/profile', {user});
})

router.get('/clearhistory', isAuthenticated, async (req, res) => {
    const user = await getUser(req.session.userId);
    if (user === null) {
        return res.status(400).json({errorMessage: 'User not found'});
    }

    user.history_gpus = []
    await user.save()
    return res.render('profile/profile', {user});
})

// RESET PASSWORD PART
router.get('/password-reset', (req, res) => res.render('reset/reset_password'));

router.post('/password-reset', [
    body('email').isEmail().withMessage('Invalid email address')],
    async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errorMessage: errors.array()[0]['msg'] });
    }

    const email = req.body.email;

    if (email === undefined) return res.status(400).json({ errorMessage: "Email is required" });

    const user = await User.findOne({ email: email });
    if (user === null) return res.status(400).json({ errorMessage: "No account with that email exists." });

    // Generate a secure token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = resetToken;
    user.tokenExpiry = Date.now() + 3600000;
    await user.save();


    const resetLink = `${process.env.BASE_URL}/password-reset/${resetToken}`;

    // Email template
    const emailHtml = `
        <h3>Password Reset Request</h3>
        <p>You requested to reset your password. Click the link below:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>If you didn't request this, ignore this email.</p>
    `;

    const response = await sendEmail(email, "Password Reset Request", emailHtml);
    if(!response) return res.status(500).json({errorMessage: 'Error sending message to email'});
    res.status(200).json({message: 'The request sent to your email.'});
});


router.get('/password-reset/:token', async (req, res) => {
    const user = await User.findOne({
        resetToken: req.params.token,
        tokenExpiry: { $gt: Date.now() }
    });

    if (user === null) {
        return res.render('templates/error', { errorMessage: 'Link are not actual!'});
    }

    res.render('reset/reset_password_form', { token: req.params.token});
});

router.post('/password-reset/:token', [
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
        .matches(/[0-9]/).withMessage('Password must contain a number')
        .matches(/[@$!%*?&]/).withMessage('Password must contain a special character')
],
    async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errorMessage: errors.array()[0]['msg'] });
    }

    const { password } = req.body;
    const user = await User.findOne({
        resetToken: req.params.token,
        tokenExpiry: { $gt: Date.now() }
    });

    if (user === null) return res.status(400).json({ errorMessage: "Token is invalid or expired." });

    user.password = password;
    user.resetToken = undefined;
    user.tokenExpiry = undefined;
    await user.save();
    res.redirect('/reset-success')
});

router.get('/reset-success', (req, res) => res.render('reset/reset_password_success'))



// LOG OUT part
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            res.render('templates/error', {errorMessage: 'Error logging out'});
        }
        res.redirect('/');
    });
});

router.get('/delete-account', isAuthenticated, async (req, res) => {
    const userId = req.session.userId;

    try {
        const deletedUser = await User.findOneAndDelete({ user_id: userId });
        if (deletedUser === null) {
            return res.render('templates/error', {errorMessage: 'User not found or not deleted'});
        }

        req.session.destroy();
        res.redirect('/');
    } catch (err) {
        return res.render('templates/error', {errorMessage: err});
    }
});



// ADMIN PART
router.post('/register/admin', [
        body('email').isEmail().withMessage('Invalid email address'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
            .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
            .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
            .matches(/[0-9]/).withMessage('Password must contain a number')
            .matches(/[@$!%*?&]/).withMessage('Password must contain a special character')],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errorMessage: errors.array()[0]['msg'] });
        }
        const { username, email, password, role, secretCode } = req.body;

        const existingUser = await User.findOne({ username: username });
        if (existingUser !== null) {
            return res.status(400).json({ errorMessage: 'User already exists' });
        }

        if (role === 'admin' && secretCode !== adminCode) {
            return res.status(400).json({ errorMessage: 'Invalid secret code' });
        }

        // Find new free ID from collection (starts from 0)
        const userId = await getNextFreeUserId();
        if (isNaN(userId)) {
            throw new Error('Failed to generate a valid user_id');
        }

        const newUser = new User({
            user_id: userId,
            username: username,
            email: email,
            password: password,
            role: role,
            favorite_news: [],
            history_planets: [],
            created_at: new Date(),
            updated_at: new Date(),
        });

        await newUser.save();
        res.redirect('/admin');
    });

router.get('/admin', isAuthenticated, async (req, res) => {
    const users = await User.find({});
    res.render('profile/admin', {users});
})

router.get('/admin-items', isAuthenticated, async (req, res) => {
    const items = await Item.find({});
    res.render('profile/items', {items})
})

router.get('/delete-account/:id', isAuthenticated, async (req, res) => {
    const userId = Number(req.params.id);

    try {
        const deletedUser = await User.findOneAndDelete({ user_id: userId });
        if (deletedUser === null) {
            return res.render('templates/error', {errorMessage: 'User not found or not deleted'});
        }

        res.redirect('/admin');
    } catch (err) {
        return res.render('templates/error', {errorMessage: err});
    }
});



// Helpers
async function getUser(id){
    const user = await User.findOne({ user_id: id });
    if (user === null) return null;
    return user;
}

async function getNextFreeUserId() {
    try {
        const lastUser = await User.findOne().sort({ user_id: -1 });
        if (lastUser === null) {
            return 0;
        }
        return parseInt(lastUser.user_id + 1);
    } catch (err) {
        console.error('Error retrieving next free user_id:', err.message);
        throw new Error('Failed to retrieve next free user ID');
    }
}

module.exports = router;
