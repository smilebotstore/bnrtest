/**
 * Express Application Setup
 */
const express = require('express');
const cors = require('cors');
const path = require('path');

const authController = require('./controllers/authController');
const accountController = require('./controllers/accountController');
const transactionController = require('./controllers/transactionController');
const adminController = require('./controllers/adminController');
const { verifyToken, requireAdmin } = require('./middleware/auth');
const db = require('./database/firebaseService');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure Super Admin exists in the database on startup
db.ensureSuperAdminExists().catch(err => console.error('[Init Admin Error]', err));

// ==================== PUBLIC API ROUTES ====================
app.post('/api/auth/login', (req, res) => authController.login(req, res));
app.get('/api/config/public', (req, res) => authController.getPublicConfig(req, res));

// ==================== PROTECTED USER ROUTES ====================
app.get('/api/auth/me', verifyToken, (req, res) => authController.getMe(req, res));
app.get('/api/account/details', verifyToken, (req, res) => accountController.getDetails(req, res));
app.post('/api/account/change-name', verifyToken, (req, res) => accountController.changeName(req, res));
app.post('/api/account/topup-request', verifyToken, (req, res) => accountController.requestTopUp(req, res));
app.get('/api/notifications', verifyToken, (req, res) => accountController.getNotifications(req, res));
app.post('/api/notifications/mark-read', verifyToken, (req, res) => accountController.markNotificationsAsRead(req, res));

app.get('/api/transactions/lookup/:accountNumber', verifyToken, (req, res) => transactionController.lookupAccount(req, res));
app.post('/api/transactions/transfer', verifyToken, (req, res) => transactionController.transfer(req, res));
app.get('/api/transactions/history', verifyToken, (req, res) => transactionController.getHistory(req, res));

// ==================== SUPER ADMIN PROTECTED ROUTES ====================
app.get('/api/admin/overview', verifyToken, requireAdmin, (req, res) => adminController.getOverview(req, res));
app.get('/api/admin/users', verifyToken, requireAdmin, (req, res) => adminController.getUsers(req, res));
app.post('/api/admin/users/create', verifyToken, requireAdmin, (req, res) => adminController.createUser(req, res));
app.post('/api/admin/users/toggle-status', verifyToken, requireAdmin, (req, res) => adminController.toggleUserStatus(req, res));
app.post('/api/admin/users/adjust-balance', verifyToken, requireAdmin, (req, res) => adminController.adjustBalance(req, res));
app.get('/api/admin/topups', verifyToken, requireAdmin, (req, res) => adminController.getTopUps(req, res));
app.post('/api/admin/topups/approve', verifyToken, requireAdmin, (req, res) => adminController.approveTopUp(req, res));
app.get('/api/admin/audit-logs', verifyToken, requireAdmin, (req, res) => adminController.getAuditLogs(req, res));
app.post('/api/admin/settings/maintenance', verifyToken, requireAdmin, (req, res) => adminController.toggleMaintenance(req, res));

// Serve Frontend Static Files
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// Clean URL routing for pages
app.get('/login', (req, res) => res.sendFile(path.join(publicPath, 'pages', 'login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(publicPath, 'pages', 'dashboard.html')));
app.get('/transfer', (req, res) => res.sendFile(path.join(publicPath, 'pages', 'transfer.html')));
app.get('/mutasi', (req, res) => res.sendFile(path.join(publicPath, 'pages', 'mutasi.html')));
app.get('/qris', (req, res) => res.sendFile(path.join(publicPath, 'pages', 'qris.html')));
app.get('/topup', (req, res) => res.sendFile(path.join(publicPath, 'pages', 'topup.html')));
app.get('/kartu', (req, res) => res.sendFile(path.join(publicPath, 'pages', 'kartu.html')));
app.get('/notifikasi', (req, res) => res.sendFile(path.join(publicPath, 'pages', 'notifikasi.html')));
app.get('/profil', (req, res) => res.sendFile(path.join(publicPath, 'pages', 'profil.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(publicPath, 'pages', 'admin.html')));

// Fallback route
app.get('*', (req, res) => {
    // If request asks for an API that doesn't exist
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, message: 'Endpoint API tidak ditemukan.' });
    }
    res.sendFile(path.join(publicPath, 'index.html'));
});

module.exports = app;
