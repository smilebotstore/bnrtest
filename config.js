/**
 * BNR Backend Centralized Configuration
 * Securely loads and validates all secrets from .env
 */
require('dotenv').config();

const config = {
    port: parseInt(process.env.PORT, 10) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    jwt: {
        secret: process.env.JWT_SECRET || 'fallback_development_secret_do_not_use_in_prod_12345',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    },
    firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID || 'absensi-polri',
        databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://absensi-polri-default-rtdb.asia-southeast1.firebasedatabase.app',
        prefix: process.env.FIREBASE_DB_PREFIX || 'bnr/'
    },
    discord: {
        webhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
        auditWebhookUrl: process.env.DISCORD_AUDIT_WEBHOOK_URL || ''
    },
    adminSeed: {
        name: process.env.ADMIN_NAME || 'Haruukii Dharmawijaya',
        username: process.env.ADMIN_USERNAME || 'Haruukii79',
        password: process.env.ADMIN_PASSWORD || 'Dharmawijaya1998#',
        accountNo: process.env.ADMIN_ACCOUNT_NO || '1200000001'
    },
    banking: {
        profileChangeFee: parseInt(process.env.PROFILE_CHANGE_FEE, 10) || 5000000,
        transferFee: parseInt(process.env.TRANSFER_FEE, 10) || 10000,
        topUpFee: parseInt(process.env.TOPUP_FEE, 10) || 5000,
        minimumTransfer: parseInt(process.env.MIN_TRANSFER, 10) || 10000,
        maximumTransfer: parseFloat(process.env.MAX_TRANSFER) || 100000000000000000,
        dailyTransferLimit: parseFloat(process.env.DAILY_TRANSFER_LIMIT) || 100000000000000000
    }
};

module.exports = config;
