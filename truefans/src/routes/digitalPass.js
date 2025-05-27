const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseAdmin');
const { generatePassId } = require('../utils/qrcode');
const { sendDigitalPass } = require('../utils/email');
const passNinjaService = require('../services/passNinjaService');
const auth = require('../middleware/auth');

// Generate a new digital pass for a diner (no auth required)
router.post('/generate', async (req, res) => {
    try {
        const { name, phone, birthday, restaurantId } = req.body;
        // Find restaurant by restaurantId
        const restaurantDoc = await db.collection('restaurants').doc(restaurantId).get();
        if (!restaurantDoc.exists) {
            return res.status(404).json({ success: false, error: 'Restaurant not found' });
        }
        const restaurant = restaurantDoc.data();
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
        const snapshot = await db.collection('digitalPasses').where('userId', '==', req.user.id).get();
        const passes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Optionally, fetch restaurant details for each pass if needed
        res.json({
            success: true,
            data: passes
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
        const snapshot = await db.collection('digitalPasses').where('passId', '==', req.params.passId).where('userId', '==', req.user.id).get();
        if (snapshot.empty) {
            return res.status(404).json({
                success: false,
                error: 'Digital pass not found'
            });
        }
        const pass = snapshot.docs[0].data();
        res.json({
            success: true,
            data: pass
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
        const snapshot = await db.collection('digitalPasses').where('passId', '==', req.params.passId).where('userId', '==', req.user.id).get();
        if (snapshot.empty) {
            return res.status(404).json({
                success: false,
                error: 'Digital pass not found'
            });
        }
        const docRef = snapshot.docs[0].ref;
        const updateData = { lastUsed: new Date() };
        if (points !== undefined) updateData.points = points;
        if (visits !== undefined) updateData.visits = visits;
        await docRef.update(updateData);
        const updatedDoc = await docRef.get();
        res.json({
            success: true,
            data: updatedDoc.data()
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
        const snapshot = await db.collection('digitalPasses')
            .where('passId', '==', passId)
            .where('restaurantId', '==', restaurantId)
            .where('isActive', '==', true)
            .where('status', '==', 'active')
            .get();
        if (snapshot.empty) {
            return res.status(404).json({
                success: false,
                error: 'Invalid or expired digital pass'
            });
        }
        const docRef = snapshot.docs[0].ref;
        await docRef.update({ lastUsed: new Date(), visits: (snapshot.docs[0].data().visits || 0) + 1 });
        const updatedDoc = await docRef.get();
        res.json({
            success: true,
            data: {
                isValid: true,
                user: updatedDoc.data().userId,
                points: updatedDoc.data().points,
                visits: updatedDoc.data().visits
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