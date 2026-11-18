/**
 * BNR Frontend API Client
 * Secure wrapper for communicating with BNR Backend API.
 */

// IPv4 Client Detection Cache & Helper
let cachedClientIpv4 = null;

async function fetchClientIpv4() {
    if (cachedClientIpv4) return cachedClientIpv4;
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const res = await fetch('https://api4.ipify.org?format=json', { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
            const data = await res.json();
            if (data && data.ip && /^(\d{1,3}\.){3}\d{1,3}$/.test(data.ip)) {
                cachedClientIpv4 = data.ip;
                return cachedClientIpv4;
            }
        }
    } catch {}

    // Fallback IPv4 lookup
    try {
        const res2 = await fetch('https://api.ipify.org?format=json');
        if (res2.ok) {
            const data2 = await res2.json();
            if (data2 && data2.ip && /^(\d{1,3}\.){3}\d{1,3}$/.test(data2.ip)) {
                cachedClientIpv4 = data2.ip;
                return cachedClientIpv4;
            }
        }
    } catch {}

    return cachedClientIpv4;
}

// Prefetch IPv4 in background
if (typeof window !== 'undefined') {
    setTimeout(() => fetchClientIpv4().catch(() => {}), 200);
}

// Device Environment & OS Detection Helper
async function getClientDeviceInfo() {
    // 1. Device Timezone
    let timezone = 'Asia/Jakarta';
    try {
        timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
    } catch {}

    // 2. Device OS Detection (with high-entropy Client Hints where supported)
    let os = 'Unknown OS';
    try {
        if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
            const hints = await navigator.userAgentData.getHighEntropyValues(['platform', 'platformVersion', 'model']);
            const p = hints.platform || navigator.userAgentData.platform;
            if (p === 'Windows') {
                const major = parseInt(hints.platformVersion?.split('.')[0] || '0', 10);
                os = major >= 13 ? 'Windows 11' : 'Windows 10';
            } else if (p === 'Android') {
                os = hints.model ? `Android (${hints.model})` : 'Android';
            } else if (p === 'macOS') {
                os = 'macOS';
            } else if (p === 'Linux') {
                os = 'Linux';
            }
        }
    } catch {}

    if (os === 'Unknown OS') {
        const ua = navigator.userAgent;
        if (/Windows NT 10.0/i.test(ua)) os = 'Windows 10 / 11';
        else if (/Windows NT 6.3/i.test(ua)) os = 'Windows 8.1';
        else if (/Windows NT 6.2/i.test(ua)) os = 'Windows 8';
        else if (/Windows NT 6.1/i.test(ua)) os = 'Windows 7';
        else if (/Android/i.test(ua)) {
            const m = ua.match(/Android\s([0-9.]+)/i);
            os = m ? `Android ${m[1]}` : 'Android';
        } else if (/iPhone/i.test(ua)) {
            const m = ua.match(/OS\s([0-9_]+)/i);
            os = m ? `iOS ${m[1].replace(/_/g, '.')}` : 'iOS (iPhone)';
        } else if (/iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
            os = 'iPadOS';
        } else if (/Macintosh|Mac OS X/i.test(ua)) {
            os = 'macOS';
        } else if (/Linux/i.test(ua)) {
            os = 'Linux';
        } else if (/CrOS/i.test(ua)) {
            os = 'ChromeOS';
        }
    }

    // 3. Browser Detection
    let browser = 'Unknown Browser';
    const ua = navigator.userAgent;
    if (/Edg\/([0-9.]+)/i.test(ua)) browser = 'Microsoft Edge';
    else if (/OPR\/([0-9.]+)/i.test(ua)) browser = 'Opera';
    else if (/Chrome\/([0-9.]+)/i.test(ua)) browser = 'Google Chrome';
    else if (/Firefox\/([0-9.]+)/i.test(ua)) browser = 'Mozilla Firefox';
    else if (/Safari\/([0-9.]+)/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';

    return { timezone, os, browser };
}

class BnrApiClient {
    constructor() {
        this.tokenKey = 'bnr_auth_token';
        this.userKey = 'bnr_auth_user';
    }

    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    setToken(token) {
        localStorage.setItem(this.tokenKey, token);
    }

    getSavedUser() {
        try {
            const raw = localStorage.getItem(this.userKey);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    setSavedUser(user) {
        localStorage.setItem(this.userKey, JSON.stringify(user));
    }

    clearSession() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
    }

    isAuthenticated() {
        return !!this.getToken();
    }

    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        if (cachedClientIpv4) {
            headers['X-Client-IPv4'] = cachedClientIpv4;
        }
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (tz) headers['X-Client-Timezone'] = tz;
        } catch {}

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(endpoint, config);
            const data = await response.json().catch(() => ({}));

            if (response.status === 401) {
                // If token expired or invalid, clear session and redirect to login
                this.clearSession();
                const currentPath = window.location.pathname;
                if (!currentPath.includes('login') && !currentPath.endsWith('/index.html') && currentPath !== '/') {
                    window.location.href = '/login';
                }
                throw new Error(data.message || 'Sesi login telah berakhir.');
            }

            if (!response.ok) {
                throw new Error(data.message || `HTTP Error ${response.status}`);
            }

            return data;
        } catch (err) {
            throw err;
        }
    }

    // Public / Auth
    async login(username, password) {
        const clientIpv4 = await fetchClientIpv4().catch(() => null);
        const { timezone, os, browser } = await getClientDeviceInfo();

        const data = await this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                username,
                password,
                timezone,
                clientIpv4,
                clientOs: os,
                clientBrowser: browser
            })
        });
        if (data.token) {
            this.setToken(data.token);
            this.setSavedUser(data.user);
        }
        return data;
    }

    async logout() {
        try {
            const user = this.getSavedUser();
            const clientIpv4 = await fetchClientIpv4().catch(() => null);
            const { timezone, os, browser } = await getClientDeviceInfo();
            await this.request('/api/auth/logout', {
                method: 'POST',
                body: JSON.stringify({
                    username: user?.username,
                    clientIpv4,
                    timezone,
                    clientOs: os,
                    clientBrowser: browser
                })
            });
        } catch (e) {
            console.warn('Logout notification omitted:', e);
        } finally {
            this.clearSession();
        }
    }

    async getMe() {
        return await this.request('/api/auth/me');
    }

    async getPublicConfig() {
        return await this.request('/api/config/public');
    }

    // Account & Transactions
    async getAccountDetails() {
        return await this.request('/api/account/details');
    }

    async lookupAccount(accountNumber) {
        return await this.request(`/api/transactions/lookup/${encodeURIComponent(accountNumber)}`);
    }

    async transfer(receiverAccountNumber, amount, note) {
        return await this.request('/api/transactions/transfer', {
            method: 'POST',
            body: JSON.stringify({ receiverAccountNumber, amount, note })
        });
    }

    async getTransactionHistory() {
        return await this.request('/api/transactions/history');
    }

    async changeName(newName) {
        return await this.request('/api/account/change-name', {
            method: 'POST',
            body: JSON.stringify({ newName })
        });
    }

    async uploadAvatar(avatar) {
        return await this.request('/api/account/avatar', {
            method: 'POST',
            body: JSON.stringify({ avatar })
        });
    }

    async removeAvatar() {
        return await this.request('/api/account/avatar', {
            method: 'DELETE'
        });
    }

    async requestTopUp(amount, note) {
        return await this.request('/api/account/topup-request', {
            method: 'POST',
            body: JSON.stringify({ amount, note })
        });
    }

    async getNotifications() {
        return await this.request('/api/notifications');
    }

    async markNotificationsRead() {
        return await this.request('/api/notifications/mark-read', {
            method: 'POST'
        });
    }

    // Admin Endpoints
    async adminGetOverview() {
        return await this.request('/api/admin/overview');
    }

    async adminGetUsers() {
        return await this.request('/api/admin/users');
    }

    async adminCreateUser(userData) {
        return await this.request('/api/admin/users/create', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async adminVerifyDiscord(discordUsername) {
        return await this.request('/api/admin/verify-discord', {
            method: 'POST',
            body: JSON.stringify({ discordUsername })
        });
    }

    async adminToggleUserStatus(username, status) {
        return await this.request('/api/admin/users/toggle-status', {
            method: 'POST',
            body: JSON.stringify({ username, status })
        });
    }

    async adminAdjustBalance(accountNumber, newBalance, reason) {
        return await this.request('/api/admin/users/adjust-balance', {
            method: 'POST',
            body: JSON.stringify({ accountNumber, newBalance, reason })
        });
    }

    async adminGetTopUps() {
        return await this.request('/api/admin/topups');
    }

    async adminApproveTopUp(requestId) {
        return await this.request('/api/admin/topups/approve', {
            method: 'POST',
            body: JSON.stringify({ requestId })
        });
    }

    async adminGetAuditLogs() {
        return await this.request('/api/admin/audit-logs');
    }

    async adminToggleMaintenance(enabled) {
        return await this.request('/api/admin/settings/maintenance', {
            method: 'POST',
            body: JSON.stringify({ enabled })
        });
    }
}

window.bnrApi = new BnrApiClient();
