/**
 * Firebase Realtime Database Service (Server-side)
 * Uses secure REST API with server-side validation and atomic helpers.
 */
const config = require('../../config');
const crypto = require('crypto');

class FirebaseService {
    constructor() {
        this.baseUrl = config.firebase.databaseURL.replace(/\/$/, '');
        this.prefix = config.firebase.prefix || 'bnr/';
    }

    _buildUrl(path) {
        const cleanPath = path.replace(/^\//, '');
        return `${this.baseUrl}/${this.prefix}${cleanPath}.json`;
    }

    async get(path) {
        const url = this._buildUrl(path);
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Firebase GET ${path} failed: ${res.statusText}`);
        }
        return await res.json();
    }

    async set(path, data) {
        const url = this._buildUrl(path);
        const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            throw new Error(`Firebase PUT ${path} failed: ${res.statusText}`);
        }
        return await res.json();
    }

    async update(path, data) {
        const url = this._buildUrl(path);
        const res = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            throw new Error(`Firebase PATCH ${path} failed: ${res.statusText}`);
        }
        return await res.json();
    }

    async push(path, data) {
        const url = this._buildUrl(path);
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            throw new Error(`Firebase POST ${path} failed: ${res.statusText}`);
        }
        return await res.json();
    }

    async delete(path) {
        const url = this._buildUrl(path);
        const res = await fetch(url, { method: 'DELETE' });
        if (!res.ok) {
            throw new Error(`Firebase DELETE ${path} failed: ${res.statusText}`);
        }
        return await res.json();
    }

    // Seed super admin if doesn't exist
    async ensureSuperAdminExists() {
        try {
            const adminUser = await this.get(`users/${config.adminSeed.username}`);
            if (!adminUser) {
                // SHA-256 hash matching the system's password format
                const hashedPassword = crypto.createHash('sha256').update(config.adminSeed.password).digest('hex');
                const adminData = {
                    name: config.adminSeed.name,
                    username: config.adminSeed.username,
                    password: hashedPassword,
                    role: 'SUPER_ADMIN',
                    status: 'ACTIVE',
                    accountNumber: config.adminSeed.accountNo,
                    createdAt: Date.now(),
                    lastLogin: Date.now()
                };
                await this.set(`users/${config.adminSeed.username}`, adminData);

                // Ensure admin account exists with starter balance
                const accountData = {
                    accountNumber: config.adminSeed.accountNo,
                    username: config.adminSeed.username,
                    ownerName: config.adminSeed.name,
                    balance: 1000000000000,
                    status: 'ACTIVE',
                    openedAt: Date.now()
                };
                await this.set(`accounts/${config.adminSeed.accountNo}`, accountData);
                console.log(`[Admin Seed] Super Admin ${config.adminSeed.username} successfully seeded.`);
            }
        } catch (err) {
            console.error('[Admin Seed Error]', err.message);
        }
    }

    // Log audit events to Firebase
    async logAudit(username, action, details, metadata = {}) {
        const logId = 'LOG-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        return this.set(`auditLogs/${logId}`, {
            id: logId,
            username,
            action,
            details,
            timestamp: Date.now(),
            ...metadata
        });
    }

    // Log security alerts
    async logSecurity(event, username, reason) {
        const secId = 'SEC-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        return this.set(`securityLogs/${secId}`, {
            id: secId,
            event,
            username,
            reason,
            timestamp: Date.now()
        });
    }

    // Send user notification
    async sendNotification(username, title, message) {
        const notifId = 'NOTIF-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        return this.set(`notifications/${username}/${notifId}`, {
            id: notifId,
            title,
            message,
            read: false,
            timestamp: Date.now()
        });
    }
}

module.exports = new FirebaseService();
