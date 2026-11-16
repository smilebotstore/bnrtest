/**
 * Auth Controller
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const db = require('../database/firebaseService');

class AuthController {
    async login(req, res) {
        try {
            const { username, password } = req.body;
            if (!username || !password) {
                return res.status(400).json({ success: false, message: 'Username dan password wajib diisi.' });
            }

            // Check maintenance mode
            const settings = await db.get('settings') || {};
            const isMaintenance = settings.maintenanceMode === true;

            const cleanUsername = username.trim();
            const user = await db.get(`users/${cleanUsername}`);

            if (!user) {
                return res.status(401).json({ success: false, message: 'Username atau password salah.' });
            }

            // Check maintenance bypass (only super admin allowed during maintenance)
            if (isMaintenance && user.role !== 'SUPER_ADMIN') {
                return res.status(503).json({ 
                    success: false, 
                    isMaintenance: true,
                    message: 'Sistem sedang dalam pemeliharaan berkala. Silakan kembali beberapa saat lagi.' 
                });
            }

            // Check status
            if (user.status !== 'ACTIVE') {
                return res.status(403).json({ success: false, message: 'Akun Anda telah dinonaktifkan oleh administrator.' });
            }

            // Hash input password
            const hashedInput = crypto.createHash('sha256').update(password).digest('hex');
            if (user.password !== hashedInput) {
                await db.logSecurity('FAILED_LOGIN', cleanUsername, 'Password salah saat login.');
                return res.status(401).json({ success: false, message: 'Username atau password salah.' });
            }

            // Update last login
            await db.update(`users/${cleanUsername}`, { lastLogin: Date.now() });

            // Generate JWT
            const token = jwt.sign(
                {
                    username: user.username,
                    role: user.role,
                    accountNumber: user.accountNumber
                },
                config.jwt.secret,
                { expiresIn: config.jwt.expiresIn }
            );

            // Audit
            await db.logAudit(cleanUsername, 'USER_LOGIN', 'Berhasil login ke sistem BNR');

            return res.json({
                success: true,
                message: 'Login berhasil.',
                token,
                user: {
                    username: user.username,
                    name: user.name,
                    role: user.role,
                    accountNumber: user.accountNumber
                }
            });
        } catch (err) {
            console.error('[Login Error]', err);
            return res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem saat proses login.' });
        }
    }

    async getMe(req, res) {
        try {
            const user = await db.get(`users/${req.user.username}`);
            if (!user) {
                return res.status(404).json({ success: false, message: 'Data pengguna tidak ditemukan.' });
            }

            const account = await db.get(`accounts/${user.accountNumber}`);

            return res.json({
                success: true,
                user: {
                    username: user.username,
                    name: user.name,
                    role: user.role,
                    accountNumber: user.accountNumber,
                    createdAt: user.createdAt
                },
                account: account || {
                    accountNumber: user.accountNumber,
                    balance: 0,
                    status: 'ACTIVE'
                }
            });
        } catch (err) {
            console.error('[GetMe Error]', err);
            return res.status(500).json({ success: false, message: 'Gagal mengambil data pengguna.' });
        }
    }

    async getPublicConfig(req, res) {
        try {
            const settings = await db.get('settings') || {};
            return res.json({
                success: true,
                maintenanceMode: settings.maintenanceMode === true,
                fees: {
                    transferFee: config.banking.transferFee,
                    profileChangeFee: config.banking.profileChangeFee,
                    topUpFee: config.banking.topUpFee,
                    minimumTransfer: config.banking.minimumTransfer,
                    maximumTransfer: config.banking.maximumTransfer,
                    dailyTransferLimit: config.banking.dailyTransferLimit
                }
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: 'Gagal mengambil konfigurasi publik.' });
        }
    }
}

module.exports = new AuthController();
