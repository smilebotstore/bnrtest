/**
 * Auth Controller
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const db = require('../database/firebaseService');
const discordService = require('../services/discordService');
const { parseClientInfo } = require('../utils/clientInfo');

// Anti-spam & deduplication cache (guarantees exactly 1 log per action even on rapid clicks / retries)
const recentLoginEvents = new Map();
const recentLogoutEvents = new Map();

class AuthController {
    async login(req, res) {
        try {
            const { username, password, timezone: clientTimezone } = req.body;
            if (!username || !password) {
                return res.status(400).json({ success: false, message: 'Username dan password wajib diisi.' });
            }

            // Parse detailed client environment & network info
            const clientInfo = parseClientInfo(req, clientTimezone);

            // Check maintenance mode
            const settings = await db.get('settings') || {};
            const isMaintenance = settings.maintenanceMode === true;

            const cleanUsername = username.trim();
            const user = await db.get(`users/${cleanUsername}`);

            if (!user) {
                await db.logSecurity('FAILED_LOGIN', cleanUsername, `Percobaan login gagal (User tidak ditemukan) dari IP ${clientInfo.ip}`);
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
                await db.logSecurity('FAILED_LOGIN', cleanUsername, `Password salah saat login dari IP ${clientInfo.ip} (${clientInfo.browser} / ${clientInfo.os})`);
                return res.status(401).json({ success: false, message: 'Username atau password salah.' });
            }

            // Prepare login audit payload
            const lastLoginInfo = {
                username: user.username,
                name: user.name,
                role: user.role,
                accountNumber: user.accountNumber,
                ip: clientInfo.ip,
                browser: clientInfo.browser,
                os: clientInfo.os,
                timezone: clientInfo.timezone,
                loginTime: clientInfo.loginTime,
                timestamp: clientInfo.timestamp
            };

            // Update user's last login and detailed login metadata in database
            await db.update(`users/${cleanUsername}`, { 
                lastLogin: clientInfo.timestamp,
                lastLoginInfo 
            });

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

            // Deduplication guard (guarantees exactly 1 log & 1 webhook per login action)
            const now = Date.now();
            const lastTime = recentLoginEvents.get(cleanUsername) || 0;
            const isDuplicate = (now - lastTime) < 3000;
            recentLoginEvents.set(cleanUsername, now);
            if (recentLoginEvents.size > 500) recentLoginEvents.clear();

            if (!isDuplicate) {
                // Audit Log to database with complete security metadata
                await db.logAudit(
                    cleanUsername, 
                    'USER_LOGIN', 
                    `Login berhasil dari IP ${clientInfo.ip} menggunakan ${clientInfo.browser} (${clientInfo.os})`,
                    {
                        ip: clientInfo.ip,
                        browser: clientInfo.browser,
                        os: clientInfo.os,
                        timezone: clientInfo.timezone,
                        loginTime: clientInfo.loginTime,
                        role: user.role,
                        name: user.name,
                        accountNumber: user.accountNumber
                    }
                );

                // Discord Audit Webhook Notification (Plain Text, Waktu WIB)
                discordService.sendAuditLoginLog({
                    username: user.username,
                    name: user.name,
                    role: user.role,
                    accountNumber: user.accountNumber,
                    ip: clientInfo.ip,
                    browser: clientInfo.browser,
                    os: clientInfo.os
                }).catch(e => console.error('[Discord Webhook Error]', e));
            }

            return res.json({
                success: true,
                message: 'Login berhasil.',
                token,
                user: {
                    username: user.username,
                    name: user.name,
                    role: user.role,
                    accountNumber: user.accountNumber,
                    avatarUrl: user.avatarUrl || null
                }
            });
        } catch (err) {
            console.error('[Login Error]', err);
            return res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem saat proses login.' });
        }
    }

    async logout(req, res) {
        try {
            const clientInfo = parseClientInfo(req);
            let username = req.user?.username || req.body?.username;

            // If not available, decode from Authorization Bearer token header if present
            if (!username && req.headers['authorization']) {
                const parts = req.headers['authorization'].split(' ');
                if (parts.length === 2 && parts[0] === 'Bearer') {
                    try {
                        const decoded = jwt.decode(parts[1]);
                        if (decoded && decoded.username) {
                            username = decoded.username;
                        }
                    } catch {}
                }
            }

            if (username) {
                const user = await db.get(`users/${username}`) || {};

                // Deduplication guard (guarantees exactly 1 log & 1 webhook per logout action)
                const now = Date.now();
                const lastLogout = recentLogoutEvents.get(username) || 0;
                const isDuplicate = (now - lastLogout) < 3000;
                recentLogoutEvents.set(username, now);
                if (recentLogoutEvents.size > 500) recentLogoutEvents.clear();

                if (!isDuplicate) {
                    // Audit log in database (visible in Admin Panel Audit Log)
                    await db.logAudit(
                        username,
                        'USER_LOGOUT',
                        `Pengguna keluar dari sistem dari IP ${clientInfo.ip} (${clientInfo.browser} / ${clientInfo.os})`,
                        {
                            ip: clientInfo.ip,
                            browser: clientInfo.browser,
                            os: clientInfo.os,
                            timezone: clientInfo.timezone,
                            logoutTime: clientInfo.loginTime,
                            role: user.role || 'USER',
                            name: user.name || username,
                            accountNumber: user.accountNumber || '-'
                        }
                    );

                    // Discord Audit Webhook Notification (Plain Text, Waktu WIB)
                    discordService.sendAuditLogoutLog({
                        username,
                        name: user.name || username,
                        role: user.role || 'USER',
                        accountNumber: user.accountNumber || '-',
                        ip: clientInfo.ip,
                        browser: clientInfo.browser,
                        os: clientInfo.os
                    }).catch(e => console.error('[Discord Webhook Error]', e));
                }
            }

            return res.json({ success: true, message: 'Logout berhasil dicatat.' });
        } catch (err) {
            console.error('[Logout Error]', err);
            return res.json({ success: true });
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
                    createdAt: user.createdAt,
                    avatarUrl: user.avatarUrl || null
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
