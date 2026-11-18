/**
 * Authentication & Authorization Middleware
 * Verifies JWT tokens and enforces Role-Based Access Control (RBAC).
 */
const jwt = require('jsonwebtoken');
const config = require('../../config');
const db = require('../database/firebaseService');

const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Akses ditolak: Token autentikasi tidak ditemukan.' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, config.jwt.secret);

        // Verify that user exists in database and is ACTIVE
        const user = await db.get(`users/${decoded.username}`);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Akun tidak ditemukan.' });
        }

        if (user.status !== 'ACTIVE') {
            return res.status(403).json({ success: false, message: 'Akun dinonaktifkan atau disuspend oleh administrator.' });
        }

        // Attach user info to request
        req.user = {
            username: user.username,
            name: user.name,
            role: user.role,
            accountNumber: user.accountNumber
        };

        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Sesi login telah berakhir, silakan masuk kembali.' });
        }
        return res.status(401).json({ success: false, message: 'Token autentikasi tidak valid.' });
    }
};

const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'SUPER_ADMIN') {
        db.logSecurity('UNAUTHORIZED_ADMIN_ACCESS', req.user ? req.user.username : 'ANONYMOUS', 'Mencoba mengakses endpoint admin tanpa izin.');
        return res.status(403).json({ success: false, message: 'Akses ditolak: Hak akses Super Admin diperlukan.' });
    }
    next();
};

module.exports = {
    verifyToken,
    requireAdmin
};
