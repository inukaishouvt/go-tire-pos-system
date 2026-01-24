const express = require('express');
const Database = require('../database/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all settings
router.get('/', authenticateToken, async (req, res) => {
    try {
        const db = new Database();
        const settings = await db.query('SELECT * FROM settings ORDER BY key');

        // Convert to key-value object for easier frontend use
        const settingsObj = {};
        settings.forEach(setting => {
            settingsObj[setting.key] = {
                value: setting.value,
                description: setting.description,
                updated_at: setting.updated_at
            };
        });

        res.json(settingsObj);
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update settings (admin only)
router.put('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { settings } = req.body;

        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ error: 'Settings object is required' });
        }

        const db = new Database();

        // Update each setting
        for (const [key, value] of Object.entries(settings)) {
            // Ensure values are strings for storage
            const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

            await db.run(
                'UPDATE settings SET value =?, updated_at = CURRENT_TIMESTAMP WHERE key =?',
                [stringValue, key]
            );

            // If the row doesn't exist (e.g. new setting like receipt_footer), insert it
            const exists = await db.get('SELECT id FROM settings WHERE key =?', [key]);
            if (!exists) {
                await db.run(
                    'INSERT INTO settings (key, value, description) VALUES (?,?,?)',
                    [key, stringValue, key === 'receipt_footer' ? 'Receipt footer message' : 'System setting']
                );
            }
        }

        // Return updated settings
        const updatedSettings = await db.query('SELECT * FROM settings ORDER BY key');
        const settingsObj = {};
        updatedSettings.forEach(setting => {
            // Handle legacy tax_rate key if needed, or just return as is
            settingsObj[setting.key] = {
                value: setting.value,
                description: setting.description,
                updated_at: setting.updated_at
            };
        });

        res.json(settingsObj);
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get specific setting by key
router.get('/:key', authenticateToken, async (req, res) => {
    try {
        const { key } = req.params;
        const db = new Database();

        const setting = await db.get('SELECT * FROM settings WHERE key = ?', [key]);

        if (!setting) {
            return res.status(404).json({ error: 'Setting not found' });
        }

        res.json(setting);
    } catch (error) {
        console.error('Get setting error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
