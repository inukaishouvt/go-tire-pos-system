const express = require('express');
const Database = require('../database/db');
const { authenticateToken, requireCashier, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all payments for a sale
router.get('/sale/:saleId', authenticateToken, requireCashier, async (req, res) => {
    try {
        const { saleId } = req.params;
        const db = new Database();

        const payments = await db.query(
            'SELECT * FROM payments WHERE sale_id = ? ORDER BY created_at DESC',
            [saleId]
        );

        res.json(payments);
    } catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add payment to existing sale
router.post('/', authenticateToken, requireCashier, async (req, res) => {
    try {
        const { sale_id, amount, payment_method, notes } = req.body;

        if (!sale_id || !amount || !payment_method) {
            return res.status(400).json({ error: 'Sale ID, amount, and payment method are required' });
        }

        const paymentAmount = parseFloat(amount);
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            return res.status(400).json({ error: 'Payment amount must be a valid number greater than 0' });
        }

        const db = new Database();

        // Get sale details
        const sale = await db.get('SELECT * FROM sales WHERE id = ?', [sale_id]);
        if (!sale) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        // Calculate new amount paid
        const currentPaid = parseFloat(sale.amount_paid || 0);
        const newPaid = currentPaid + paymentAmount;
        const totalAmount = parseFloat(sale.total_amount || 0);

        // Allow slight float precision tolerance
        if (newPaid > (totalAmount + 0.05)) {
            return res.status(400).json({
                error: `Payment amount exceeds balance. Balance due: ${(totalAmount - currentPaid).toFixed(2)}`
            });
        }

        // Add payment record
        const result = await db.run(
            'INSERT INTO payments (sale_id, amount, payment_method, notes) VALUES (?, ?, ?, ?)',
            [sale_id, paymentAmount, payment_method, notes || `Payment ${payment_method}`]
        );

        // Update sale amount_paid and status
        const newStatus = newPaid >= (totalAmount - 0.01) ? 'completed' : 'pending';

        await db.run(
            'UPDATE sales SET amount_paid = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newPaid, newStatus, sale_id]
        );

        // Get updated sale
        const updatedSale = await db.get('SELECT * FROM sales WHERE id = ?', [sale_id]);

        let newPayment = null;
        if (result && result.id) {
            newPayment = await db.get('SELECT * FROM payments WHERE id = ?', [result.id]);
        }

        res.status(201).json({
            payment: newPayment || { id: result.id, sale_id, amount: paymentAmount, payment_method },
            sale: updatedSale,
            balance_remaining: Math.max(0, totalAmount - newPaid)
        });
    } catch (error) {
        console.error('Add payment error:', error);
        res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
});

// Get all pending sales (for dashboard)
router.get('/pending', authenticateToken, requireCashier, async (req, res) => {
    try {
        const db = new Database();
        const user = req.user;

        let sql = `
            SELECT s.*, u.full_name as cashier_name, c.name as customer_name,
                   (s.total_amount - s.amount_paid) as balance_due
            FROM sales s
            JOIN users u ON s.cashier_id = u.id
            LEFT JOIN customers c ON s.customer_id = c.id
            WHERE s.status = 'pending'
        `;
        let params = [];

        // Non-admin users can only see their own pending sales
        if (user.role !== 'admin') {
            sql += ' AND s.cashier_id = ?';
            params.push(user.id);
        }

        sql += ' ORDER BY s.created_at DESC';

        const pendingSales = await db.query(sql, params);
        res.json(pendingSales);
    } catch (error) {
        console.error('Get pending sales error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
