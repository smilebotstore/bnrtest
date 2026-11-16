/**
 * BNR Frontend API Client
 * Secure wrapper for communicating with BNR Backend API.
 */
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
                    window.location.href = '/pages/login.html';
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
        const data = await this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        if (data.token) {
            this.setToken(data.token);
            this.setSavedUser(data.user);
        }
        return data;
    }

    logout() {
        this.clearSession();
        window.location.href = '/pages/login.html';
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
