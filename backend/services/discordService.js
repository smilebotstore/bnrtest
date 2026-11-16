/**
 * Discord Notification Service (Server-side Only)
 * Webhook URL is securely kept in environment variables and never exposed to the client.
 */
const config = require('../../config');

class DiscordService {
    async sendTransactionLog({ senderName, senderAccount, receiverName, receiverAccount, amount, txId, note }) {
        const webhookUrl = config.discord.webhookUrl;
        if (!webhookUrl || webhookUrl.includes('YOUR_DISCORD_WEBHOOK_URL')) {
            return;
        }

        const formatCurrency = (val) => {
            return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
        };

        const maskAccount = (accNo) => {
            if (!accNo || accNo.length < 4) return '****';
            return accNo.slice(0, 3) + '****' + accNo.slice(-3);
        };

        const payload = {
            embeds: [
                {
                    title: "BNR | TRANSFER BERHASIL",
                    color: 13369344, // #CC0000 Crimson Red
                    description: `Transaksi antar rekening Bank Nusantara Roblox telah berhasil diproses oleh sistem.`,
                    fields: [
                        { name: "Pengirim", value: `${senderName}\n\`${maskAccount(senderAccount)}\``, inline: true },
                        { name: "Penerima", value: `${receiverName}\n\`${maskAccount(receiverAccount)}\``, inline: true },
                        { name: "Nominal Transfer", value: `**${formatCurrency(amount)}**`, inline: false },
                        { name: "Catatan", value: note || "-", inline: true },
                        { name: "Transaction ID", value: `\`${txId}\``, inline: true }
                    ],
                    footer: { text: "Bank Nusantara Roblox — Virtual Banking Security" },
                    timestamp: new Date().toISOString()
                }
            ]
        };

        try {
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (err) {
            console.error('[Discord Log Error]', err.message);
        }
    }

    async sendLoginLog({ username, name, role, accountNumber, ip, browser, os, timezone, loginTime }) {
        const webhookUrl = config.discord.webhookUrl;
        if (!webhookUrl || webhookUrl.includes('YOUR_DISCORD_WEBHOOK_URL')) {
            return;
        }

        const isSuperAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
        const embedColor = isSuperAdmin ? 13369344 : 3447003; // Red for Admin (#CC0000), Blue for Customer (#3498DB)
        const titleText = isSuperAdmin ? '🚨 [SECURITY AUDIT] LOGIN ADMINISTRATOR TERDETEKSI' : '👤 [AUDIT LOG] LOGIN NASABAH TERDETEKSI';

        const payload = {
            embeds: [
                {
                    title: titleText,
                    color: embedColor,
                    description: `Aktivitas autentikasi berhasil tercatat ke sistem **Bank Nusantara Roblox (BNR)**.`,
                    fields: [
                        { name: "👤 Pengguna / Akun", value: `**@${username}**\n${name || '-'} (\`${accountNumber || '-'}\`)`, inline: true },
                        { name: "🛡️ Role Hak Akses", value: `\`${role || 'CUSTOMER'}\``, inline: true },
                        { name: "🌐 IP Address", value: `\`${ip || '127.0.0.1'}\``, inline: true },
                        { name: "💻 Operating System", value: `${os || 'Unknown OS'}`, inline: true },
                        { name: "🌍 Web Browser", value: `${browser || 'Unknown Browser'}`, inline: true },
                        { name: "🕒 Zona Waktu (Timezone)", value: `${timezone || 'Asia/Jakarta (WIB)'}`, inline: true },
                        { name: "📅 Tanggal & Waktu Login", value: `**${loginTime}**`, inline: false }
                    ],
                    footer: { text: "BNR Virtual Security & Audit System • Zero Leak Architecture" },
                    timestamp: new Date().toISOString()
                }
            ]
        };

        try {
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (err) {
            console.error('[Discord Login Log Error]', err.message);
        }
    }
}

module.exports = new DiscordService();
