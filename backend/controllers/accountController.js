/**
 * Account Controller
 * Handles account details, profile modifications, top-up requests, and notifications.
 */
const fs = require('fs');
const path = require('path');
const db = require('../database/firebaseService');
const config = require('../../config');

class AccountController {
    // Get full account details including virtual card
    async getDetails(req, res) {
        try {
            const accNo = req.user.accountNumber;
            const account = await db.get(`accounts/${accNo}`);
            const user = await db.get(`users/${req.user.username}`);

            if (!account || !user) {
                return res.status(404).json({ success: false, message: 'Data rekening tidak ditemukan.' });
            }

            // Virtual Card Data: generated consistently from account number
            const cardPrefix = "4901 88";
            const paddedAcc = accNo.padStart(10, '0');
            const virtualCardNumber = `${cardPrefix}${paddedAcc.slice(0, 2)} ${paddedAcc.slice(2, 6)} ${paddedAcc.slice(6, 10)}`;
            const virtualCvv = (parseInt(accNo.slice(-3), 10) % 900 + 100).toString();

            return res.json({
                success: true,
                account: {
                    accountNumber: account.accountNumber,
                    ownerName: account.ownerName || user.name,
                    username: user.username,
                    avatarUrl: user.avatarUrl || null,
                    balance: account.balance || 0,
                    status: account.status,
                    openedAt: account.openedAt,
                    virtualCard: {
                        cardNumber: virtualCardNumber,
                        cvv: virtualCvv,
                        expiry: "12/29",
                        holderName: account.ownerName || user.name,
                        brand: "BNR DEBIT PLATINUM"
                    }
                }
            });
        } catch (err) {
            console.error('[Account Details Error]', err);
            return res.status(500).json({ success: false, message: 'Gagal mengambil data rekening.' });
        }
    }

    // Change official account name with administrative fee
    async changeName(req, res) {
        try {
            const { newName } = req.body;
            if (!newName || newName.trim().length < 3) {
                return res.status(400).json({ success: false, message: 'Nama baru harus minimal 3 karakter.' });
            }

            const cleanName = newName.trim();
            const accNo = req.user.accountNumber;
            const account = await db.get(`accounts/${accNo}`);

            if (!account) {
                return res.status(404).json({ success: false, message: 'Rekening tidak ditemukan.' });
            }

            const fee = config.banking.profileChangeFee;
            const currentBalance = account.balance || 0;

            if (currentBalance < fee) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Saldo tidak mencukupi untuk biaya perubahan nama. Biaya administrasi: Rp ${fee.toLocaleString('id-ID')}, Saldo Anda: Rp ${currentBalance.toLocaleString('id-ID')}.` 
                });
            }

            // Deduct fee and update name
            const newBalance = currentBalance - fee;
            await db.update(`accounts/${accNo}`, { balance: newBalance, ownerName: cleanName });
            await db.update(`users/${req.user.username}`, { name: cleanName });

            // Record transaction fee
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const txId = `FEE-${dateStr}-${Date.now().toString().slice(-6)}`;
            const feeRecord = {
                id: txId,
                type: 'FEE_CHANGE_NAME',
                accountNumber: accNo,
                amount: fee,
                note: `Biaya Perubahan Nama Rekening Menjadi "${cleanName}"`,
                status: 'SUCCESS',
                timestamp: Date.now(),
                role: 'DEBIT'
            };
            await db.set(`accountTransactions/${accNo}/${txId}`, feeRecord);

            // Audit
            await db.logAudit(req.user.username, 'CHANGE_NAME', `Mengubah nama akun menjadi "${cleanName}" (Biaya: Rp ${fee})`);
            await db.sendNotification(
                req.user.username,
                'Perubahan Nama Berhasil',
                `Nama rekening Anda telah resmi diubah menjadi "${cleanName}". Biaya administrasi Rp ${fee.toLocaleString('id-ID')} telah dipotong dari saldo.`
            );

            return res.json({
                success: true,
                message: 'Nama rekening berhasil diperbarui.',
                newName: cleanName,
                newBalance
            });
        } catch (err) {
            console.error('[Change Name Error]', err);
            return res.status(500).json({ success: false, message: 'Gagal memproses perubahan nama.' });
        }
    }

    // Submit Top Up Request
    async requestTopUp(req, res) {
        try {
            const { amount, note } = req.body;
            const parsedAmount = parseInt(amount, 10);

            if (isNaN(parsedAmount) || parsedAmount < 10000) {
                return res.status(400).json({ success: false, message: 'Nominal top up minimal Rp 10.000.' });
            }

            const reqId = 'REQ-' + Date.now();
            const topUpData = {
                id: reqId,
                username: req.user.username,
                name: req.user.name,
                accountNumber: req.user.accountNumber,
                amount: parsedAmount,
                note: note ? note.trim().slice(0, 100) : 'Pengajuan Top Up Saldo',
                status: 'PENDING',
                timestamp: Date.now()
            };

            await db.set(`paymentRequests/${reqId}`, topUpData);
            await db.logAudit(req.user.username, 'REQUEST_TOPUP', `Pengajuan Top Up ${reqId} sebesar Rp ${parsedAmount}`);

            return res.json({
                success: true,
                message: 'Pengajuan Top Up berhasil dikirim. Menunggu persetujuan Admin.',
                request: topUpData
            });
        } catch (err) {
            console.error('[TopUp Request Error]', err);
            return res.status(500).json({ success: false, message: 'Gagal mengirim pengajuan top up.' });
        }
    }

    // Get notifications
    async getNotifications(req, res) {
        try {
            const notifsMap = await db.get(`notifications/${req.user.username}`);
            if (!notifsMap) {
                return res.json({ success: true, notifications: [], unreadCount: 0 });
            }

            const notifications = Object.values(notifsMap);
            notifications.sort((a, b) => b.timestamp - a.timestamp);
            const unreadCount = notifications.filter(n => !n.read).length;

            return res.json({
                success: true,
                notifications,
                unreadCount
            });
        } catch (err) {
            console.error('[Get Notifications Error]', err);
            return res.status(500).json({ success: false, message: 'Gagal mengambil notifikasi.' });
        }
    }

    // Mark notifications as read (Fixes the red dot unread bug!)
    async markNotificationsAsRead(req, res) {
        try {
            const notifsMap = await db.get(`notifications/${req.user.username}`);
            if (notifsMap) {
                const updates = {};
                for (const [key, notif] of Object.entries(notifsMap)) {
                    if (!notif.read) {
                        updates[`${key}/read`] = true;
                    }
                }
                if (Object.keys(updates).length > 0) {
                    await db.update(`notifications/${req.user.username}`, updates);
                }
            }

            return res.json({
                success: true,
                message: 'Semua notifikasi telah ditandai dibaca.'
            });
        } catch (err) {
            console.error('[Mark Read Error]', err);
            return res.status(500).json({ success: false, message: 'Gagal memperbarui status notifikasi.' });
        }
    }

    // Upload / update profile avatar
    async uploadAvatar(req, res) {
        try {
            const { avatar } = req.body;
            if (!avatar || typeof avatar !== 'string') {
                return res.status(400).json({ success: false, message: 'Data foto profil wajib disertakan.' });
            }

            // Verify base64 image data URL (PNG, JPG/JPEG, WEBP)
            const matches = avatar.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
            if (!matches) {
                return res.status(400).json({ success: false, message: 'Format foto harus berupa PNG, JPG, atau WebP.' });
            }

            const rawExt = matches[1].toLowerCase();
            const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
            const buffer = Buffer.from(matches[2], 'base64');

            // Maximum limit 4MB
            if (buffer.length > 4 * 1024 * 1024) {
                return res.status(400).json({ success: false, message: 'Ukuran foto maksimal 4MB.' });
            }

            const username = req.user.username;
            const fileName = `avatar_${username}_${Date.now()}.${ext}`;
            const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'avatars');

            let finalAvatarUrl = avatar; // fallback: data URI for serverless/read-only environments

            try {
                if (!fs.existsSync(uploadsDir)) {
                    fs.mkdirSync(uploadsDir, { recursive: true });
                }
                const filePath = path.join(uploadsDir, fileName);
                fs.writeFileSync(filePath, buffer);
                finalAvatarUrl = `/uploads/avatars/${fileName}`;
            } catch (fsErr) {
                console.warn('[Avatar FS Save Warning]', fsErr.message);
                // Keep finalAvatarUrl as data URI if filesystem cannot be written
            }

            // Save to Firebase database under user profile
            await db.update(`users/${username}`, { avatarUrl: finalAvatarUrl });

            // Audit Log
            await db.logAudit(username, 'UPDATE_AVATAR', 'Memperbarui foto profil akun');

            return res.json({
                success: true,
                message: 'Foto profil berhasil diperbarui.',
                avatarUrl: finalAvatarUrl
            });
        } catch (err) {
            console.error('[Upload Avatar Error]', err);
            return res.status(500).json({ success: false, message: 'Gagal mengunggah foto profil.' });
        }
    }

    // Remove custom profile avatar and revert to default initials
    async removeAvatar(req, res) {
        try {
            const username = req.user.username;
            await db.update(`users/${username}`, { avatarUrl: null });
            await db.logAudit(username, 'REMOVE_AVATAR', 'Menghapus foto profil (kembali ke inisial nama)');

            return res.json({
                success: true,
                message: 'Foto profil berhasil dihapus. Kembali menggunakan inisial nama.',
                avatarUrl: null
            });
        } catch (err) {
            console.error('[Remove Avatar Error]', err);
            return res.status(500).json({ success: false, message: 'Gagal menghapus foto profil.' });
        }
    }
}

module.exports = new AccountController();
