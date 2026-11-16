/**
 * Super Admin Controller
 * High-privilege management actions with strict audit trail.
 */
const crypto = require('crypto');
const db = require('../database/firebaseService');
const discordService = require('../services/discordService');

class AdminController {
    // Overview statistics
    async getOverview(req, res) {
        try {
            const [usersMap, accountsMap, txMap, settings] = await Promise.all([
                db.get('users') || {},
                db.get('accounts') || {},
                db.get('transactions') || {},
                db.get('settings') || {}
            ]);

            const users = Object.values(usersMap);
            const accounts = Object.values(accountsMap);
            const transactions = Object.values(txMap);

            const totalBalance = accounts.reduce((acc, curr) => acc + (curr.balance || 0), 0);
            const activeUsersCount = users.filter(u => u.status === 'ACTIVE').length;

            return res.json({
                success: true,
                stats: {
                    totalUsers: users.length,
                    activeUsers: activeUsersCount,
                    totalAccounts: accounts.length,
                    totalBalance,
                    totalTransactions: transactions.length,
                    maintenanceMode: settings.maintenanceMode === true
                }
            });
        } catch (err) {
            console.error('[Admin Overview Error]', err);
            return res.status(500).json({ success: false, message: 'Gagal memuat statistik admin.' });
        }
    }

    // List all users
    async getUsers(req, res) {
        try {
            const [usersMap, accountsMap] = await Promise.all([
                db.get('users') || {},
                db.get('accounts') || {}
            ]);

            const users = Object.values(usersMap).map(u => {
                const acc = accountsMap[u.accountNumber] || {};
                return {
                    name: u.name,
                    username: u.username,
                    role: u.role,
                    status: u.status,
                    accountNumber: u.accountNumber,
                    balance: acc.balance || 0,
                    createdAt: u.createdAt,
                    lastLogin: u.lastLogin,
                    lastLoginInfo: u.lastLoginInfo || null
                };
            });

            return res.json({ success: true, users });
        } catch (err) {
            console.error('[Admin GetUsers Error]', err);
            return res.status(500).json({ success: false, message: 'Gagal mengambil data nasabah.' });
        }
    }

    // Create new customer account
    async createUser(req, res) {
        try {
            const { name, username, password, initialBalance } = req.body;
            if (!name || !username || !password) {
                return res.status(400).json({ success: false, message: 'Nama, username, dan password wajib diisi.' });
            }

            const cleanUsername = username.trim().toLowerCase();
            const existingUser = await db.get(`users/${cleanUsername}`);
            if (existingUser) {
                return res.status(400).json({ success: false, message: 'Username sudah digunakan.' });
            }

            // Generate unique 10-digit account number starting with 12
            const randomDigits = Math.floor(10000000 + Math.random() * 90000000);
            const newAccNo = `12${randomDigits}`;

            // Hash password with SHA-256
            const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
            const parsedBalance = parseInt(initialBalance, 10) || 0;

            const now = Date.now();
            const userData = {
                name: name.trim(),
                username: cleanUsername,
                password: hashedPassword,
                role: 'CUSTOMER',
                status: 'ACTIVE',
                accountNumber: newAccNo,
                createdAt: now,
                lastLogin: now
            };

            const accountData = {
                accountNumber: newAccNo,
                username: cleanUsername,
                ownerName: name.trim(),
                balance: parsedBalance,
                status: 'ACTIVE',
                openedAt: now
            };

            await db.set(`users/${cleanUsername}`, userData);
            await db.set(`accounts/${newAccNo}`, accountData);

            await db.logAudit(
                req.user.username,
                'CREATE_USER',
                `Membuat nasabah baru: ${name} (@${cleanUsername}), No Rekening: ${newAccNo}, Saldo Awal: Rp ${parsedBalance}`
            );

            return res.json({
                success: true,
                message: 'Nasabah baru berhasil didaftarkan.',
                user: {
                    name: userData.name,
                    username: userData.username,
                    accountNumber: newAccNo,
                    balance: parsedBalance
                }
            });
        } catch (err) {
            console.error('[Create User Error]', err);
            return res.status(500).json({ success: false, message: 'Gagal membuat akun nasabah.' });
        }
    }

    // Toggle user status (ACTIVE / SUSPENDED)
    async toggleUserStatus(req, res) {
        try {
            const { username, status } = req.body;
            if (!username || !['ACTIVE', 'SUSPENDED'].includes(status)) {
                return res.status(400).json({ success: false, message: 'Data tidak valid.' });
            }

            if (username === req.user.username) {
                return res.status(400).json({ success: false, message: 'Tidak dapat menonaktifkan akun sendiri.' });
            }

            const targetUser = await db.get(`users/${username}`);
            if (!targetUser) {
                return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
            }

            await db.update(`users/${username}`, { status });
            if (targetUser.accountNumber) {
                await db.update(`accounts/${targetUser.accountNumber}`, { status });
            }

            await db.logAudit(
                req.user.username,
                'TOGGLE_USER_STATUS',
                `Mengubah status nasabah @${username} menjadi ${status}`
            );

            return res.json({
                success: true,
                message: `Status nasabah @${username} berhasil diubah menjadi ${status}.`
            });
        } catch (err) {
            console.error('[Toggle Status Error]', err);
            return res.status(500).json({ success: false, message: 'Gagal mengubah status nasabah.' });
        }
    }

    // Adjust balance manually
    async adjustBalance(req, res) {
        try {
            const { accountNumber, newBalance, reason } = req.body;
            const parsedBalance = parseFloat(newBalance);

            if (isNaN(parsedBalance) || parsedBalance < 0) {
                return res.status(400).json({ success: false, message: 'Saldo baru harus berupa angka positif.' });
            }

            const account = await db.get(`accounts/${accountNumber}`);
            if (!account) {
                return res.status(404).json({ success: false, message: 'Rekening tidak ditemukan.' });
            }

            const oldBalance = account.balance || 0;
            await db.update(`accounts/${accountNumber}`, { balance: parsedBalance });

            // Audit
            await db.logAudit(
                req.user.username,
                'MANUAL_BALANCE_ADJUST',
                `Ubah saldo ${accountNumber} (${account.ownerName}) dari Rp ${oldBalance} menjadi Rp ${parsedBalance}. Alasan: ${reason || 'Penyesuaian Admin'}`
            );

            await db.sendNotification(
                account.username,
                'Penyesuaian Saldo',
                `Saldo rekening Anda telah disesuaikan oleh Administrator menjadi Rp ${parsedBalance.toLocaleString('id-ID')}.`
            );

            return res.json({
                success: true,
                message: 'Saldo berhasil diperbarui.',
                newBalance: parsedBalance
            });
        } catch (err) {
            console.error('[Adjust Balance Error]', err);
            return res.status(500).json({ success: false, message: 'Gagal memperbarui saldo.' });
        }
    }

    // Get Top Up Requests
    async getTopUps(req, res) {
        try {
            const requestsMap = await db.get('paymentRequests') || {};
            const requests = Object.values(requestsMap).filter(r => r.status === 'PENDING');
            requests.sort((a, b) => b.timestamp - a.timestamp);

            return res.json({ success: true, requests });
        } catch (err) {
            console.error('[Get TopUps Error]', err);
            return res.status(500).json({ success: false, message: 'Gagal mengambil data pengajuan top up.' });
        }
    }

    // Approve Top Up
    async approveTopUp(req, res) {
        try {
            const { requestId } = req.body;
            if (!requestId) {
                return res.status(400).json({ success: false, message: 'ID pengajuan wajib diisi.' });
            }

            const request = await db.get(`paymentRequests/${requestId}`);
            if (!request || request.status !== 'PENDING') {
                return res.status(400).json({ success: false, message: 'Pengajuan tidak ditemukan atau sudah diproses.' });
            }

            const account = await db.get(`accounts/${request.accountNumber}`);
            if (!account) {
                return res.status(404).json({ success: false, message: 'Rekening tujuan tidak ditemukan.' });
            }

            // Credit balance
            const oldBalance = account.balance || 0;
            const newBalance = oldBalance + request.amount;
            await db.update(`accounts/${request.accountNumber}`, { balance: newBalance });
            await db.update(`paymentRequests/${requestId}`, { status: 'APPROVED', approvedBy: req.user.username, approvedAt: Date.now() });

            // Record transaction
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const txId = `TOPUP-${dateStr}-${Date.now().toString().slice(-6)}`;
            const txRecord = {
                id: txId,
                type: 'TOPUP',
                accountNumber: request.accountNumber,
                amount: request.amount,
                note: `Top Up Saldo disetujui Admin (${request.note || '-'})`,
                status: 'SUCCESS',
                timestamp: Date.now(),
                role: 'CREDIT'
            };
            await db.set(`accountTransactions/${request.accountNumber}/${txId}`, txRecord);

            // Audit & Notification
            await db.logAudit(
                req.user.username,
                'APPROVE_TOPUP',
                `Menyetujui Top Up ${requestId} untuk @${request.username} sebesar Rp ${request.amount}`
            );

            await db.sendNotification(
                request.username,
                'Top Up Disetujui',
                `Pengajuan Top Up sebesar Rp ${request.amount.toLocaleString('id-ID')} telah disetujui Admin. Saldo telah ditambahkan.`
            );

            return res.json({
                success: true,
                message: 'Pengajuan Top Up berhasil disetujui.',
                newBalance
            });
        } catch (err) {
            console.error('[Approve TopUp Error]', err);
            return res.status(500).json({ success: false, message: 'Gagal menyetujui pengajuan top up.' });
        }
    }

    // Get audit logs
    async getAuditLogs(req, res) {
        try {
            const logsMap = await db.get('auditLogs') || {};
            const logs = Object.values(logsMap);
            logs.sort((a, b) => b.timestamp - a.timestamp);
            const recentLogs = logs.slice(0, 50);

            return res.json({ success: true, logs: recentLogs });
        } catch (err) {
            console.error('[Get Audit Logs Error]', err);
            return res.status(500).json({ success: false, message: 'Gagal mengambil log audit.' });
        }
    }

    // Toggle Maintenance Mode
    async toggleMaintenance(req, res) {
        try {
            const { enabled } = req.body;
            const isEnabled = enabled === true;
            await db.update('settings', { maintenanceMode: isEnabled });

            await db.logAudit(
                req.user.username,
                'MAINTENANCE_TOGGLE',
                `Mengubah status mode pemeliharaan menjadi: ${isEnabled ? 'AKTIF' : 'NONAKTIF'}`
            );

            return res.json({
                success: true,
                message: `Mode pemeliharaan berhasil diubah menjadi: ${isEnabled ? 'AKTIF' : 'NONAKTIF'}`,
                maintenanceMode: isEnabled
            });
        } catch (err) {
            console.error('[Toggle Maintenance Error]', err);
            return res.status(500).json({ success: false, message: 'Gagal mengubah status pemeliharaan.' });
        }
    }
}

module.exports = new AdminController();
