const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseAdmin');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Generate a digital pass
router.post('/generate', async (req, res) => {
    try {
        const { userId, restaurantId } = req.body;
        // Check if user and restaurant exist
        const userDoc = await db.collection('users').doc(userId).get();
        const restaurantDoc = await db.collection('restaurants').doc(restaurantId).get();
        if (!userDoc.exists || !restaurantDoc.exists) {
            return res.status(404).json({ message: 'User or restaurant not found' });
        }
        const user = userDoc.data();
        const restaurant = restaurantDoc.data();
        // Generate unique pass ID
        const passId = crypto.randomBytes(16).toString('hex');
        // Create digital pass in Firestore
        const digitalPassData = {
            userId,
            restaurantId,
            passId,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            visits: 0,
            isActive: true,
            status: 'active'
        };
        await db.collection('digitalPasses').add(digitalPassData);
        // Generate pass data for wallet
        const passData = {
            passId,
            restaurantName: restaurant.name,
            restaurantLogo: restaurant.digitalWallet?.logo,
            primaryColor: restaurant.digitalWallet?.primaryColor,
            secondaryColor: restaurant.digitalWallet?.secondaryColor,
            customMessage: restaurant.digitalWallet?.customMessage,
            user: {
                name: `${user.firstName} ${user.lastName}`,
                email: user.email
            },
            createdAt: digitalPassData.createdAt,
            expiresAt: digitalPassData.expiresAt
        };
        // Send email with pass data
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: `Your Digital Pass for ${restaurant.name}`,
            html: `
                <h1>Welcome to ${restaurant.name}'s Loyalty Program!</h1>
                <p>Here's your digital pass:</p>
                <div style="background-color: ${restaurant.digitalWallet?.cardBackground}; 
                           color: ${restaurant.digitalWallet?.cardTextColor};
                           padding: 20px;
                           border-radius: 10px;
                           text-align: center;">
                    <img src="${restaurant.digitalWallet?.logo}" alt="Restaurant Logo" style="max-width: 200px;">
                    <h2>${restaurant.name}</h2>
                    <p>${restaurant.digitalWallet?.customMessage}</p>
                    <p>Pass ID: ${passId}</p>
                    <p>Valid until: ${new Date(digitalPassData.expiresAt).toLocaleDateString()}</p>
                </div>
                <p>To add this pass to your digital wallet, click the button below:</p>
                <a href="${process.env.APP_URL}/add-to-wallet/${passId}" 
                   style="background-color: ${restaurant.digitalWallet?.primaryColor}; 
                          color: white; 
                          padding: 10px 20px; 
                          text-decoration: none; 
                          border-radius: 5px;">
                    Add to Wallet
                </a>
            `
        };
        await transporter.sendMail(mailOptions);
        res.status(201).json({
            message: 'Digital pass created and email sent successfully',
            passData
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get pass details
router.get('/:passId', async (req, res) => {
    try {
        const snapshot = await db.collection('digitalPasses').where('passId', '==', req.params.passId).get();
        if (snapshot.empty) {
            return res.status(404).json({ message: 'Pass not found' });
        }
        const pass = snapshot.docs[0].data();
        res.json(pass);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update pass status (e.g., when visiting)
router.put('/:passId/visit', async (req, res) => {
    try {
        const snapshot = await db.collection('digitalPasses').where('passId', '==', req.params.passId).get();
        if (snapshot.empty) {
            return res.status(404).json({ message: 'Pass not found' });
        }
        const docRef = snapshot.docs[0].ref;
        await docRef.update({
            visits: (snapshot.docs[0].data().visits || 0) + 1,
            lastVisit: new Date()
        });
        const updatedDoc = await docRef.get();
        res.json({ message: 'Visit recorded successfully', pass: updatedDoc.data() });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Generate wallet pass file (dummy implementation)
router.get('/:passId/wallet', async (req, res) => {
    try {
        const snapshot = await db.collection('digitalPasses').where('passId', '==', req.params.passId).get();
        if (snapshot.empty) {
            return res.status(404).json({ message: 'Pass not found' });
        }
        const pass = snapshot.docs[0].data();
        // Generate pass file based on platform (iOS/Android)
        const platform = req.query.platform || 'ios';
        const passFile = JSON.stringify({ ...pass, platform });
        res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
        res.setHeader('Content-Disposition', `attachment; filename="pass.pkpass"`);
        res.send(passFile);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router; 