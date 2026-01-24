const express = require('express');
const bcrypt = require('bcryptjs');
const Database = require('../database/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const db = new Database();
        const users = await db.query('SELECT id, username, role, full_name, created_at FROM users ORDER BY created_at DESC');
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new user (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { username, password, role, full_name } = req.body;

        if (!username || !password || !role) {
            return res.status(400).json({ error: 'Username, password, and role are required' });
        }

        if (!['admin', 'cashier'].includes(role)) {
            return res.status(400).json({ error: 'Role must be admin or cashier' });
        }

        const db = new Database();

        // Check if username already exists
        const existingUser = await db.get('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db.run(
            'INSERT INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)',
            [String(username), hashedPassword, String(role), full_name ? String(full_name) : null]
        );

        if (!result.id) {
            throw new Error('Failed to retrieve new user ID');
        }

        const newUser = await db.get(
            'SELECT id, username, role, full_name, theme_color, created_at FROM users WHERE id = ?',
            [result.id]
        );

        res.status(201).json(newUser);
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Update user (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { username, role, full_name } = req.body;

        const db = new Database();

        // Check if user exists
        const existingUser = await db.get('SELECT * FROM users WHERE id = ?', [id]);
        if (!existingUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if username already exists (excluding current user)
        if (username && username !== existingUser.username) {
            const usernameExists = await db.get('SELECT id FROM users WHERE username = ? AND id != ?', [username, id]);
            if (usernameExists) {
                return res.status(400).json({ error: 'Username already exists' });
            }
        }

        if (role && !['admin', 'cashier'].includes(role)) {
            return res.status(400).json({ error: 'Role must be admin or cashier' });
        }

        // Update user
        const updates = [];
        const params = [];

        if (username !== undefined) {
            updates.push('username = ?');
            params.push(String(username));
        }
        if (role !== undefined) {
            updates.push('role = ?');
            params.push(String(role));
        }
        if (full_name !== undefined) {
            updates.push('full_name = ?');
            params.push(full_name ? String(full_name) : null);
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id);

        await db.run(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        const updatedUser = await db.get(
            'SELECT id, username, role, full_name, theme_color, created_at, updated_at FROM users WHERE id = ?',
            [id]
        );

        res.json(updatedUser);
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user theme color
router.patch('/theme-color', authenticateToken, async (req, res) => {
    try {
        const { theme_color } = req.body;
        const id = req.user.id;

        if (!theme_color) {
            return res.status(400).json({ error: 'Theme color is required' });
        }

        const db = new Database();

        // Check if theme_color column exists (backward compatibility)
        try {
            const hasThemeColor = await db.hasColumn('users', 'theme_color');

            if (hasThemeColor) {
                await db.run(
                    'UPDATE users SET theme_color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [theme_color, id]
                );
                res.json({ success: true, theme_color });
            } else {
                // Column doesn't exist yet, migration needed
                res.json({ success: false, message: 'Database migration required. Theme color will be available after migration.' });
            }
        } catch (err) {
            console.error('Theme color update error:', err);
            res.status(500).json({ error: 'Failed to update theme color' });
        }
    } catch (error) {
        console.error('Update theme color error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reset user password (admin only)
router.post('/:id/reset-password', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { new_password } = req.body;

        if (!new_password) {
            return res.status(400).json({ error: 'New password is required' });
        }

        const db = new Database();

        // Check if user exists
        const user = await db.get('SELECT id FROM users WHERE id = ?', [id]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);
        await db.run(
            'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [hashedPassword, id]
        );

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const db = new Database();

        // Check if user exists
        const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Prevent deleting the last admin
        if (user.role === 'admin') {
            const adminCount = await db.get('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin']);
            if (adminCount.count <= 1) {
                return res.status(400).json({ error: 'Cannot delete the last admin user' });
            }
        }

        // Check if user has sales records
        const salesCount = await db.get('SELECT COUNT(*) as count FROM sales WHERE cashier_id = ?', [id]);
        if (salesCount.count > 0) {
            return res.status(400).json({
                error: 'Cannot delete user with sales records. Consider deactivating instead.'
            });
        }

        await db.run('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
