const express = require('express');
const router = express.Router();
const DigitalPass = require('../models/DigitalPass');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const { generatePassId } = require('../utils/qrcode');
const { sendDigitalPass } = require('../utils/email');
const passNinjaService = require('../services/passNinjaService');
const auth = require('../middleware/auth');

// Generate a new digital pass for a diner (no auth required)
router.post('/generate', async (req, res) => {
    try {
        const { name, phone, birthday, restaurantId } = req.body;
        // Find restaurant by restaurantId
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({ success: false, error: 'Restaurant not found' });
        }
        // Create a dummy user object for PassNinja
        const user = { firstName: name, lastName: '', phone, birthday };
        // Generate unique pass ID
        const passId = generatePassId();
        // Create PassNinja pass
        const passNinjaPass = await passNinjaService.createPass(user, restaurant, { passId, points: 0 });
        // Respond with download URL
        res.status(201).json({
            success: true,
            downloadUrl: passNinjaPass.downloadUrl
        });
    } catch (error) {
        console.error('Error generating digital pass:', error);
        res.status(500).json({ success: false, error: 'Failed to generate digital pass' });
    }
});

// Get all digital passes for a user
router.get('/user', auth, async (req, res) => {
    try {
        const passes = await DigitalPass.find({ userId: req.user.id })
            .populate('restaurantId', 'name logo')
            .sort({ createdAt: -1 });

        // Get PassNinja pass details for each pass
        const passesWithDetails = await Promise.all(
            passes.map(async (pass) => {
                const passNinjaDetails = await passNinjaService.getPass(pass.passNinjaId);
                return {
                    ...pass.toObject(),
                    downloadUrl: passNinjaDetails.downloadUrl
                };
            })
        );

        res.json({
            success: true,
            data: passesWithDetails
        });
    } catch (error) {
        console.error('Error fetching digital passes:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch digital passes'
        });
    }
});

// Get a specific digital pass
router.get('/:passId', auth, async (req, res) => {
    try {
        const pass = await DigitalPass.findOne({
            passId: req.params.passId,
            userId: req.user.id
        }).populate('restaurantId', 'name logo');

        if (!pass) {
            return res.status(404).json({
                success: false,
                error: 'Digital pass not found'
            });
        }

        // Get PassNinja pass details
        const passNinjaDetails = await passNinjaService.getPass(pass.passNinjaId);

        res.json({
            success: true,
            data: {
                ...pass.toObject(),
                downloadUrl: passNinjaDetails.downloadUrl
            }
        });
    } catch (error) {
        console.error('Error fetching digital pass:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch digital pass'
        });
    }
});

// Update pass points/visits
router.put('/:passId/update', auth, async (req, res) => {
    try {
        const { points, visits } = req.body;
        const pass = await DigitalPass.findOne({
            passId: req.params.passId,
            userId: req.user.id
        });

        if (!pass) {
            return res.status(404).json({
                success: false,
                error: 'Digital pass not found'
            });
        }

        // Update points and visits
        if (points !== undefined) pass.points = points;
        if (visits !== undefined) pass.visits = visits;
        pass.lastUsed = new Date();

        await pass.save();

        // Update PassNinja pass
        await passNinjaService.updatePass(pass.passNinjaId, {
            secondaryFields: [
                {
                    key: 'points',
                    label: 'Points',
                    value: pass.points.toString()
                }
            ]
        });

        res.json({
            success: true,
            data: pass
        });
    } catch (error) {
        console.error('Error updating digital pass:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update digital pass'
        });
    }
});

// Validate a digital pass (for restaurant staff)
router.post('/validate', auth, async (req, res) => {
    try {
        const { passId } = req.body;
        const restaurantId = req.user.restaurantId; // Assuming restaurant staff are authenticated

        const pass = await DigitalPass.findOne({
            passId,
            restaurantId,
            isActive: true,
            status: 'active'
        }).populate('userId', 'name email');

        if (!pass) {
            return res.status(404).json({
                success: false,
                error: 'Invalid or expired digital pass'
            });
        }

        // Update last used timestamp
        pass.lastUsed = new Date();
        pass.visits += 1;
        await pass.save();

        res.json({
            success: true,
            data: {
                isValid: true,
                user: pass.userId,
                points: pass.points,
                visits: pass.visits
            }
        });
    } catch (error) {
        console.error('Error validating digital pass:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to validate digital pass'
        });
    }
});

module.exports = router; 