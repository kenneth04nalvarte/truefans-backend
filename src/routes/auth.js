const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Register a new user
router.post('/register', async (req, res) => {
    const { firstName, lastName, email, password, phone, birthday, referralSource } = req.body;
    try {
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ error: 'User already exists' });
        const hashed = await bcrypt.hash(password, 10);
        const user = new User({ firstName, lastName, email, password: hashed, phone, birthday, referralSource });
        await user.save();
        res.status(201).json({ message: 'User registered' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get current user
router.get('/me', async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});

module.exports = router; 