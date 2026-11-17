/**
 * Discord Notification Service (Server-side Only)
 * Restored to original authentic plain text markdown format.
 * Uses dedicated webhook URL for Audit Logs (Login & Logout) from .env.
 */
const config = require('../../config');

class DiscordService {
    // 1. Transaction Webhook (Original Plain Text Format)
    async sendTransactionLog({ senderName, senderAccount, receiverName, receiverAccount, amount, txId, note }) {
        const webhookUrl = config.discord.webhookUrl;
        if (!webhookUrl || webhookUrl.includes('YOUR_DISCORD_WEBHOOK_URL')) {
            return;
        }

        const formatCurrency = (val) => {
            return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
        };

        const maskAccount = (accNo) => {
            if (!accNo || accNo.length < 4) return '••••';
            return accNo.substring(0, 3) + '••••' + accNo.substring(7);
        };

        // Format asli persis dari script.js BNR (Waktu WIB)
        const waktuWIB = `${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`;
        const payload = {
            content: `**BNR | TRANSACTION LOG**\n\`\`\`BNR | TRANSFER BERHASIL\n\nPengirim: ${senderName}\nRekening: ${maskAccount(senderAccount)}\n\nPenerima: ${receiverName}\nRekening: ${maskAccount(receiverAccount)}\n\nNominal: ${formatCurrency(amount)}\nTransaction ID: ${txId}\nWaktu: ${waktuWIB}\`\`\``
        };

        try {
            const resp = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!resp.ok) {
                const errText = await resp.text();
                console.error(`[Discord Transaction Log Failed] HTTP ${resp.status}: ${errText}`);
            } else {
                console.log(`[Discord Transaction Log] Successfully sent for ${txId}`);
            }
        } catch (err) {
            console.error('[Discord Transaction Log Error]', err.message);
        }
    }

    // 2. Audit Webhook - Login Detection (Plain Text Format, Waktu WIB)
    async sendAuditLoginLog({ username, name, role, accountNumber, ip, browser, os }) {
        const auditWebhookUrl = config.discord.auditWebhookUrl;
        if (!auditWebhookUrl || auditWebhookUrl.includes('YOUR_DISCORD_WEBHOOK_URL')) {
            return;
        }

        const waktuWIB = `${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`;
        const payload = {
            content: `**BNR | AUDIT LOG - LOGIN DETECTED**\n\`\`\`BNR | AUTENTIKASI PENGGUNA\n\nUsername: @${username}\nNama: ${name || '-'}\nRole: ${role || 'CUSTOMER'}\nRekening: ${accountNumber || '-'}\n\nIP Address: ${ip || '127.0.0.1'}\nBrowser: ${browser || 'Unknown'}\nOperating System: ${os || 'Unknown'}\nTimezone: Asia/Jakarta (WIB)\nWaktu: ${waktuWIB}\`\`\``
        };

        try {
            const resp = await fetch(auditWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!resp.ok) {
                const errText = await resp.text();
                console.error(`[Discord Audit Login Failed] HTTP ${resp.status}: ${errText}`);
            } else {
                console.log(`[Discord Audit Login] Successfully sent for @${username}`);
            }
        } catch (err) {
            console.error('[Discord Audit Login Error]', err.message);
        }
    }

    // 3. Audit Webhook - Logout Detection (Plain Text Format, Waktu WIB)
    async sendAuditLogoutLog({ username, name, role, accountNumber, ip, browser, os }) {
        const auditWebhookUrl = config.discord.auditWebhookUrl;
        if (!auditWebhookUrl || auditWebhookUrl.includes('YOUR_DISCORD_WEBHOOK_URL')) {
            return;
        }

        const waktuWIB = `${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`;
        const payload = {
            content: `**BNR | AUDIT LOG - LOGOUT DETECTED**\n\`\`\`BNR | PENGGUNA KELUAR SISTEM\n\nUsername: @${username}\nNama: ${name || '-'}\nRole: ${role || 'CUSTOMER'}\nRekening: ${accountNumber || '-'}\n\nIP Address: ${ip || '127.0.0.1'}\nBrowser: ${browser || 'Unknown'}\nOperating System: ${os || 'Unknown'}\nTimezone: Asia/Jakarta (WIB)\nWaktu: ${waktuWIB}\`\`\``
        };

        try {
            const resp = await fetch(auditWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!resp.ok) {
                const errText = await resp.text();
                console.error(`[Discord Audit Logout Failed] HTTP ${resp.status}: ${errText}`);
            } else {
                console.log(`[Discord Audit Logout] Successfully sent for @${username}`);
            }
        } catch (err) {
            console.error('[Discord Audit Logout Error]', err.message);
        }
    }

    // 4. Verify Discord Username via Discord Official API
    async verifyDiscordUsername(discordUsername) {
        if (!discordUsername || typeof discordUsername !== 'string') {
            return { valid: false, message: 'Username Discord wajib diisi.' };
        }

        const clean = discordUsername.trim().replace(/^@/, '');
        if (clean.length < 2 || clean.length > 32) {
            return { valid: false, message: 'Panjang username Discord harus antara 2 hingga 32 karakter.' };
        }

        try {
            const resp = await fetch('https://discord.com/api/v9/unique-username/username-attempt-unauthed', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                body: JSON.stringify({ username: clean })
            });

            const data = await resp.json().catch(() => ({}));

            // taken: true means the username is already registered and taken by an existing Discord user
            if (data && data.taken === true) {
                return { valid: true, username: clean, message: 'Username Discord valid dan terdaftar.' };
            }

            // taken: false means username does not exist on Discord
            if (data && data.taken === false) {
                return { valid: false, message: `Akun Discord @${clean} tidak ditemukan atau belum terdaftar.` };
            }

            // Discord returned validation errors
            if (data && data.errors && data.errors.username) {
                const errMsg = data.errors.username._errors?.[0]?.message || 'Format username Discord tidak valid.';
                return { valid: false, message: `Discord: ${errMsg}` };
            }

            return { valid: false, message: 'Tidak dapat memverifikasi username Discord saat ini.' };
        } catch (err) {
            console.error('[Discord Verify Error]', err);
            return { valid: false, message: 'Gagal menghubungi server Discord untuk verifikasi.' };
        }
    }

    // 5. Audit Webhook - Account Creation Log (Plain Text Format, Waktu WIB)
    async sendAuditAccountCreatedLog({ adminUsername, username, accountNumber, name, discordUsername }) {
        const auditWebhookUrl = config.discord.auditWebhookUrl;
        if (!auditWebhookUrl || auditWebhookUrl.includes('YOUR_DISCORD_WEBHOOK_URL')) {
            return;
        }

        const waktuWIB = `${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`;
        const payload = {
            content: `**BNR | AUDIT LOG - PEMBUATAN AKUN**\n\`\`\`BNR | NASABAH BARU DIBUAT\n\nPembuat : ${adminUsername}\nWaktu : ${waktuWIB}\n\ndetail akun\n\nusername : @${username}\nno. rekening : ${accountNumber}\natas nama : ${name}\ndiscord : @${discordUsername}\`\`\``
        };

        try {
            const resp = await fetch(auditWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!resp.ok) {
                const errText = await resp.text();
                console.error(`[Discord Audit Account Created Failed] HTTP ${resp.status}: ${errText}`);
            } else {
                console.log(`[Discord Audit Account Created] Successfully sent for @${username}`);
            }
        } catch (err) {
            console.error('[Discord Audit Account Created Error]', err.message);
        }
    }

    // 6. Audit Webhook - Account Status Log (Suspended / Diaktifkan Kembali)
    async sendAuditAccountStatusLog({ adminUsername, username, accountNumber, name, status }) {
        const auditWebhookUrl = config.discord.auditWebhookUrl;
        if (!auditWebhookUrl || auditWebhookUrl.includes('YOUR_DISCORD_WEBHOOK_URL')) {
            return;
        }

        const actionName = status === 'SUSPENDED' ? 'SUSPENDED' : 'DIAKTIFKAN KEMBALI';
        const waktuWIB = `${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`;
        const payload = {
            content: `**BNR | AUDIT LOG - AKUN ${actionName}**\n\`\`\`BNR | PERUBAHAN STATUS AKUN\n\nPembuat : ${adminUsername}\nWaktu : ${waktuWIB}\n\ndetail akun\n\nusername : @${username}\nno. rekening : ${accountNumber}\natas nama : ${name}\nstatus : ${status}\`\`\``
        };

        try {
            const resp = await fetch(auditWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!resp.ok) {
                const errText = await resp.text();
                console.error(`[Discord Audit Status Change Failed] HTTP ${resp.status}: ${errText}`);
            } else {
                console.log(`[Discord Audit Status Change] Successfully sent for @${username} (${status})`);
            }
        } catch (err) {
            console.error('[Discord Audit Status Change Error]', err.message);
        }
    }
}

module.exports = new DiscordService();
