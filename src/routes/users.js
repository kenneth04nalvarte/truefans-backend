const express = require('express');
const router = express.Router();
const User = require('../models/User');
const geolib = require('geolib');

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, email, phone, birthday, referralSource } = req.body;
        
        const user = new User({
            firstName,
            lastName,
            email,
            phone,
            birthday,
            referralSource
        });

        await user.save();
        res.status(201).json({ message: 'User registered successfully', user });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update user location
router.post('/:id/location', async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.location.coordinates = [longitude, latitude];
        await user.save();

        res.json({ message: 'Location updated successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get nearby restaurants
router.get('/:id/nearby-restaurants', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const [longitude, latitude] = user.location.coordinates;
        
        // Find restaurants within 500 meters
        const restaurants = await Restaurant.find({
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude]
                    },
                    $maxDistance: 500 // 500 meters
                }
            }
        });

        res.json(restaurants);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router; 