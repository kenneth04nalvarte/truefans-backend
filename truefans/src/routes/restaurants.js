const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const QRCode = require('qrcode');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create new restaurant
router.post('/', async (req, res) => {
    try {
        const { name, owner, location, address } = req.body;
        
        // Generate QR code
        const qrData = JSON.stringify({
            timestamp: Date.now()
        });
        const qrCode = await QRCode.toDataURL(qrData);

        // Create Stripe account for the restaurant
        const stripeAccount = await stripe.accounts.create({
            type: 'express',
            country: 'US',
            email: req.body.email,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
        });

        const restaurant = new Restaurant({
            name,
            owner,
            location,
            address,
            qrCode,
            stripeAccountId: stripeAccount.id
        });

        await restaurant.save();
        res.status(201).json({ message: 'Restaurant created successfully', restaurant });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update restaurant promotion
router.put('/:id/promotion', async (req, res) => {
    try {
        const { title, description, discount, validUntil } = req.body;
        const restaurant = await Restaurant.findById(req.params.id);

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        restaurant.currentPromotion = {
            title,
            description,
            discount,
            validUntil: new Date(validUntil)
        };

        await restaurant.save();
        res.json({ message: 'Promotion updated successfully', restaurant });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get restaurant by QR code
router.get('/qr/:qrCode', async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({ qrCode: req.params.qrCode });
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }
        res.json(restaurant);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router; 