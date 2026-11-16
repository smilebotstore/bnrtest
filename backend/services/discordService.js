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

        // Format asli persis dari script.js BNR
        const payload = {
            content: `**BNR | TRANSACTION LOG**\n\`\`\`BNR | TRANSFER BERHASIL\n\nPengirim: ${senderName}\nRekening: ${maskAccount(senderAccount)}\n\nPenerima: ${receiverName}\nRekening: ${maskAccount(receiverAccount)}\n\nNominal: ${formatCurrency(amount)}\nTransaction ID: ${txId}\nWaktu: ${new Date().toLocaleString('id-ID')} WIB\`\`\``
        };

        try {
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (err) {
            console.error('[Discord Transaction Log Error]', err.message);
        }
    }

    // 2. Audit Webhook - Login Detection (Plain Text Format)
    async sendAuditLoginLog({ username, name, role, accountNumber, ip, browser, os, timezone, loginTime }) {
        const auditWebhookUrl = config.discord.auditWebhookUrl;
        if (!auditWebhookUrl || auditWebhookUrl.includes('YOUR_DISCORD_WEBHOOK_URL')) {
            return;
        }

        const payload = {
            content: `**BNR | AUDIT LOG - LOGIN DETECTED**\n\`\`\`BNR | AUTENTIKASI PENGGUNA\n\nUsername: @${username}\nNama: ${name || '-'}\nRole: ${role || 'CUSTOMER'}\nRekening: ${accountNumber || '-'}\n\nIP Address: ${ip || '127.0.0.1'}\nBrowser: ${browser || 'Unknown'}\nOperating System: ${os || 'Unknown'}\nTimezone: ${timezone || 'Asia/Jakarta (WIB)'}\nWaktu: ${loginTime}\`\`\``
        };

        try {
            await fetch(auditWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (err) {
            console.error('[Discord Audit Login Error]', err.message);
        }
    }

    // 3. Audit Webhook - Logout Detection (Plain Text Format)
    async sendAuditLogoutLog({ username, name, role, accountNumber, ip, browser, os, timezone, logoutTime }) {
        const auditWebhookUrl = config.discord.auditWebhookUrl;
        if (!auditWebhookUrl || auditWebhookUrl.includes('YOUR_DISCORD_WEBHOOK_URL')) {
            return;
        }

        const payload = {
            content: `**BNR | AUDIT LOG - LOGOUT DETECTED**\n\`\`\`BNR | PENGGUNA KELUAR SISTEM\n\nUsername: @${username}\nNama: ${name || '-'}\nRole: ${role || 'CUSTOMER'}\nRekening: ${accountNumber || '-'}\n\nIP Address: ${ip || '127.0.0.1'}\nBrowser: ${browser || 'Unknown'}\nOperating System: ${os || 'Unknown'}\nTimezone: ${timezone || 'Asia/Jakarta (WIB)'}\nWaktu: ${logoutTime}\`\`\``
        };

        try {
            await fetch(auditWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (err) {
            console.error('[Discord Audit Logout Error]', err.message);
        }
    }
}

module.exports = new DiscordService();
