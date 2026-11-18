/* ==========================================================================
   KONFIGURASI RESMI FRONTEND BNR (UBAH FAVICON, LOGO, NAMA & JUDUL DI SINI)
   ========================================================================== */
window.BNR_CONFIG = {
    appName: "BNR",
    bankName: "Bank Nusantara Roblox",
    tagline: "Virtual Banking System",
    
    // 1. Konfigurasi Branding, Logo & Favicon
    branding: {
        // Favicon / Icon Tab Browser (Bisa path lokal atau link URL eksternal)
        faviconUrl: "/assets/images/favicon.ico",

        // Logo utama di navbar, splash screen & login
        logoUrl: "https://i.ibb.co/WN4MtGnZ/Screenshot-20261108-072739-1.jpg",
        
        // Cadangan lokal jika link logo eksternal gagal dimuat
        fallbackLogo: "https://i.ibb.co/WN4MtGnZ/Screenshot-20261108-072739-1.jpg",

        // Ikon aplikasi PWA / Home Screen
        pwaIcon192: "https://i.ibb.co/WN4MtGnZ/Screenshot-20261108-072739-1.jpg",
        pwaIcon512: "https://i.ibb.co/WN4MtGnZ/Screenshot-20261108-072739-1.jpg"
    },

    // 2. Judul (Title) di Setiap Halaman Tab Browser
    pageTitles: {
        login: "Masuk ke Layanan — BNR",
        dashboard: "Beranda Nasabah — BNR",
        transfer: "Transfer Saldo — BNR",
        mutation: "Mutasi Rekening — BNR",
        qr: "Pembayaran QRIS — BNR",
        topup: "Pengajuan Top Up — BNR",
        virtualCard: "Kartu Virtual Debit — BNR",
        notifications: "Pusat Notifikasi — BNR",
        profile: "Profil Pengguna — BNR",
        admin: "Super Admin Portal — BNR"
    },

    // 3. Pengaturan Tampilan & Tema Default
    theme: {
        defaultMode: "light", // "dark" atau "light"
        brandColor: "#CC0000",
        darkColor: "#0F172A"
    }
};

/**
 * BNR — Bank Nusantara Roblox
 * Core Application Engine & Clean Router
 * Preserves 100% of the authentic BNR UI with secure backend integration.
 */

// App State
let currentUser = null;
let currentAccount = null;
let currentView = 'dashboard';
let systemSettings = {
    profileChangeFee: 5000000,
    transferFee: 10000,
    topUpFee: 5000,
    minimumTransfer: 10000,
    maximumTransfer: 100000000000000000,
    dailyTransferLimit: 100000000000000000,
    maintenanceMode: false
};
let isBalanceHidden = false;

// Route mapping: clean URL path <-> view ID
const ROUTE_MAP = {
    '/': 'dashboard',
    '/dashboard': 'dashboard',
    '/transfer': 'transfer',
    '/mutasi': 'mutation',
    '/mutation': 'mutation',
    '/qris': 'qr',
    '/qr': 'qr',
    '/topup': 'topup',
    '/kartu': 'virtualCard',
    '/virtualcard': 'virtualCard',
    '/notifikasi': 'notifications',
    '/notifications': 'notifications',
    '/profil': 'profile',
    '/profile': 'profile',
    '/admin': 'admin',
    '/login': 'login'
};

const VIEW_TO_PATH = {
    'dashboard': '/dashboard',
    'transfer': '/transfer',
    'mutation': '/mutasi',
    'qr': '/qris',
    'topup': '/topup',
    'virtualCard': '/kartu',
    'notifications': '/notifikasi',
    'profile': '/profil',
    'admin': '/admin',
    'login': '/login'
};

// 1. INITIALIZATION & LOADING SEQUENCE
document.addEventListener('DOMContentLoaded', () => {
    applyBrandingLogos();
    lucide.createIcons();
    runLoadingSequence();

    // Listen to browser Back/Forward buttons for clean SPA routing
    window.addEventListener('popstate', () => {
        handleUrlRouting();
    });
});

function applyBrandingLogos() {
    const cfg = window.BNR_CONFIG || {};
    const branding = cfg.branding || {};
    const logoUrl = branding.logoUrl || '/assets/images/bnr-logo.svg';
    const fallbackLogo = branding.fallbackLogo || '/assets/images/bnr-logo.svg';

    // Apply favicon if defined in config.js
    if (branding.faviconUrl) {
        let faviconLink = document.querySelector("link[rel~='icon']");
        if (faviconLink) {
            faviconLink.href = branding.faviconUrl;
        }
    }

    document.querySelectorAll('.bnr-brand-logo, #splashLogo').forEach(img => {
        img.src = logoUrl;
        img.onerror = () => {
            if (img.src !== fallbackLogo) img.src = fallbackLogo;
        };
    });
}

function runLoadingSequence() {
    const progressBar = document.getElementById('progressBar');
    const loadingPercent = document.getElementById('loadingPercent');
    const loadingStatus = document.getElementById('loadingStatus');

    const steps = [
        { percent: 20, status: 'Menghubungkan sistem...' },
        { percent: 45, status: 'Memuat database...' },
        { percent: 70, status: 'Memverifikasi sesi...' },
        { percent: 90, status: 'Menyiapkan aplikasi...' },
        { percent: 100, status: 'Sistem siap.' }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
        if (currentStep < steps.length) {
            const step = steps[currentStep];
            if (progressBar) progressBar.style.width = `${step.percent}%`;
            if (loadingPercent) loadingPercent.textContent = `${step.percent}%`;
            if (loadingStatus) loadingStatus.textContent = step.status;
            currentStep++;
        } else {
            clearInterval(interval);
            setTimeout(() => {
                initAppSystem();
            }, 300);
        }
    }, 200);
}

async function initAppSystem() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) loadingScreen.classList.add('hidden');

    try {
        // Fetch public settings from backend
        const pubConfig = await window.bnrApi.getPublicConfig().catch(() => ({}));
        if (pubConfig.success) {
            systemSettings.maintenanceMode = pubConfig.maintenanceMode;
            if (pubConfig.fees) {
                systemSettings = { ...systemSettings, ...pubConfig.fees };
            }
        }

        // Check active session with backend
        if (window.bnrApi.isAuthenticated()) {
            const meRes = await window.bnrApi.getMe().catch(() => null);
            if (meRes && meRes.success && meRes.user) {
                currentUser = meRes.user;
                currentAccount = meRes.account;

                if (systemSettings.maintenanceMode && currentUser.role !== 'SUPER_ADMIN') {
                    showMaintenanceScreen();
                    return;
                }

                showMainApp();
                handleUrlRouting();
                startBackgroundPolling();
                return;
            }
        }

        // Unauthenticated -> Show Auth
        showAuthView();
    } catch (err) {
        console.error('App init error:', err);
        showAuthView();
    }
}

// 2. AUTHENTICATION & VIEWS CONTROL
function showAuthView() {
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('maintenanceScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('authScreen').classList.remove('hidden');

    // Prefill username if "remember me" was saved
    const savedUser = localStorage.getItem('bnr_remember_username');
    const uInput = document.getElementById('loginUsername');
    const remCheck = document.getElementById('rememberMe');
    if (savedUser && uInput) {
        uInput.value = savedUser;
        if (remCheck) remCheck.checked = true;
    } else if (remCheck) {
        remCheck.checked = false;
    }

    if (window.location.pathname !== '/login') {
        window.history.pushState(null, '', '/login');
    }
    const cfgTitles = (window.BNR_CONFIG && window.BNR_CONFIG.pageTitles) || {};
    document.title = cfgTitles.login || 'Masuk ke Layanan — BNR';
    lucide.createIcons();
}

function showMaintenanceScreen() {
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('maintenanceScreen').classList.remove('hidden');
    document.getElementById('maintenanceAdminLink').classList.remove('hidden');
    lucide.createIcons();
}

function checkMaintenanceStatus() {
    window.location.reload();
}

function showMainApp() {
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('maintenanceScreen').classList.add('hidden');
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    lucide.createIcons();
}

function togglePasswordVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (input.type === 'password') {
        input.type = 'text';
        icon.setAttribute('data-lucide', 'eye-off');
    } else {
        input.type = 'password';
        icon.setAttribute('data-lucide', 'eye');
    }
    lucide.createIcons();
}

let isLoggingIn = false;
async function handleLogin(e) {
    e.preventDefault();
    if (isLoggingIn) return;
    isLoggingIn = true;

    const btn = document.getElementById('btnLoginSubmit');
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Memverifikasi...</span>`;
    lucide.createIcons();

    try {
        const rememberMe = document.getElementById('rememberMe')?.checked === true;
        const res = await window.bnrApi.login(username, password, rememberMe);
        currentUser = res.user;

        // Handle remember me username persistence
        if (rememberMe) {
            localStorage.setItem('bnr_remember_username', username);
        } else {
            localStorage.removeItem('bnr_remember_username');
        }
        
        // Fetch full account details
        const accRes = await window.bnrApi.getAccountDetails();
        currentAccount = accRes.account;

        Swal.fire({
            icon: 'success',
            title: 'Login Berhasil',
            text: `Selamat datang, ${currentUser.name}!`,
            timer: 1000,
            showConfirmButton: false
        }).then(() => {
            showMainApp();
            navigateTo('dashboard');
            startBackgroundPolling();
        });
    } catch (err) {
        Swal.fire('Gagal Masuk', err.message || 'Username atau password salah.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<span>Masuk ke Layanan</span><i data-lucide="arrow-right" class="w-4 h-4"></i>`;
        lucide.createIcons();
        setTimeout(() => { isLoggingIn = false; }, 2000);
    }
}

function confirmLogout() {
    Swal.fire({
        title: 'Konfirmasi Keluar',
        text: 'Apakah Anda yakin ingin keluar dari sistem perbankan BNR?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#CC0000',
        cancelButtonColor: '#64748B',
        confirmButtonText: 'Ya, Keluar',
        cancelButtonText: 'Batal'
    }).then(async (res) => {
        if (res.isConfirmed) {
            await window.bnrApi.logout();
            currentUser = null;
            currentAccount = null;
            showAuthView();
        }
    });
}

// 3. NAVIGATION & CLEAN URL ROUTING
function handleUrlRouting() {
    const path = window.location.pathname.toLowerCase();
    const view = ROUTE_MAP[path] || 'dashboard';
    navigateTo(view, false); // false = do not push duplicate state
}

function navigateTo(viewId, pushState = true) {
    currentView = viewId;

    // Update Clean URL in browser address bar (WITHOUT .html)
    if (pushState) {
        const cleanPath = VIEW_TO_PATH[viewId] || '/dashboard';
        window.history.pushState(null, '', cleanPath);
    }

    renderSidebarAndNav();

    // Close mobile drawer if open
    const drawer = document.getElementById('mobileDrawer');
    if (drawer && !drawer.classList.contains('hidden')) {
        drawer.classList.add('hidden');
    }

    const titleEl = document.getElementById('pageTitle');
    const cfgTitles = (window.BNR_CONFIG && window.BNR_CONFIG.pageTitles) || {};
    const titles = {
        dashboard: 'Beranda',
        transfer: 'Transfer Saldo',
        mutation: 'Mutasi Rekening',
        qr: 'Pembayaran QR',
        topup: 'Pengajuan Top Up',
        virtualCard: 'Kartu Virtual',
        notifications: 'Notifikasi',
        profile: 'Profil Saya',
        admin: 'Admin Panel'
    };
    if (titleEl) titleEl.textContent = titles[viewId] || 'Beranda';
    document.title = cfgTitles[viewId] || `${titles[viewId] || 'Beranda'} — BNR`;

    // Render corresponding view
    switch (viewId) {
        case 'dashboard':
            renderDashboardView();
            break;
        case 'transfer':
            renderTransferView();
            break;
        case 'mutation':
            renderMutationView();
            break;
        case 'qr':
            renderQRView();
            break;
        case 'topup':
            renderTopUpView();
            break;
        case 'virtualCard':
            renderVirtualCardView();
            break;
        case 'notifications':
            renderNotificationsView();
            break;
        case 'profile':
            renderProfileView();
            break;
        case 'admin':
            renderAdminPanelView();
            break;
        default:
            renderDashboardView();
            break;
    }
}

function toggleMobileDrawer(forceState) {
    const drawer = document.getElementById('mobileDrawer');
    if (!drawer) return;
    if (typeof forceState === 'boolean') {
        if (forceState) {
            drawer.classList.remove('hidden');
        } else {
            drawer.classList.add('hidden');
        }
    } else {
        drawer.classList.toggle('hidden');
    }
}

function closeMobileDrawer() {
    toggleMobileDrawer(false);
}

function handleDrawerBackdropClick(e) {
    if (e.target === document.getElementById('mobileDrawer')) {
        closeMobileDrawer();
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMobileDrawer();
});

// 4. SIDEBAR & MOBILE NAVIGATION RENDERER
function renderSidebarAndNav() {
    if (!currentUser) return;
    const isSuperAdmin = currentUser && currentUser.role === 'SUPER_ADMIN';

    // Update Profile Info in Sidebar
    const nameEl = document.getElementById('sidebarUserName');
    const roleEl = document.getElementById('sidebarUserRole');
    const avatarEl = document.getElementById('sidebarUserAvatar');
    if (nameEl) nameEl.textContent = currentUser.name;
    if (roleEl) roleEl.textContent = currentUser.role;
    if (avatarEl) {
        if (currentUser.avatarUrl) {
            avatarEl.innerHTML = `<img src="${currentUser.avatarUrl}" class="w-full h-full rounded-full object-cover" alt="Avatar">`;
        } else {
            avatarEl.textContent = (currentUser.name || currentUser.username || 'U').charAt(0).toUpperCase();
        }
    }

    const sidebarMenu = document.getElementById('sidebarMenu');
    const mobileDrawerMenu = document.getElementById('mobileDrawerMenu');
    const mobileBottomNav = document.getElementById('mobileBottomNav');

    const menuItems = [
        { id: 'dashboard', label: 'Beranda', icon: 'home' },
        { id: 'transfer', label: 'Transfer', icon: 'send' },
        { id: 'qr', label: 'Bayar QR', icon: 'qr-code' },
        { id: 'mutation', label: 'Mutasi', icon: 'receipt' },
        { id: 'topup', label: 'Top Up', icon: 'plus-circle' },
        { id: 'virtualCard', label: 'Kartu Virtual', icon: 'credit-card' },
        { id: 'profile', label: 'Profil Saya', icon: 'user' }
    ];

    if (isSuperAdmin) {
        menuItems.push({ id: 'admin', label: 'Admin Panel', icon: 'shield', highlight: true });
    }

    const getThemeToggleHtml = (id, textSizeClass = 'text-xs') => `
        <button id="${id}" onclick="window.bnrTheme.toggleTheme()" class="theme-toggle-btn w-full flex items-center justify-between px-3 py-2.5 rounded-xl ${textSizeClass} transition text-slate-400 hover:text-white hover:bg-slate-800">
            <div class="flex items-center space-x-3">
                <i data-lucide="moon" class="theme-icon w-4 h-4 text-amber-400"></i>
                <span class="theme-label">Mode Tampilan</span>
            </div>
            <span class="text-[10px] bg-slate-800 border border-slate-700/60 px-2 py-0.5 rounded text-slate-400">Ganti</span>
        </button>
    `;

    // Desktop Sidebar Menu (Theme toggle placed directly below "Profil Saya")
    if (sidebarMenu) {
        let html = '';
        menuItems.forEach(item => {
            const isActive = currentView === item.id;
            const activeClass = isActive ? 'bg-bnr-red text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800';
            const badge = item.highlight ? `<span class="ml-auto bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.5 rounded font-mono">ADMIN</span>` : '';
            html += `
                <button onclick="navigateTo('${item.id}')" class="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs transition ${activeClass}">
                    <i data-lucide="${item.icon}" class="w-4 h-4"></i>
                    <span>${item.label}</span>
                    ${badge}
                </button>
            `;
            if (item.id === 'profile') {
                html += getThemeToggleHtml('sidebarThemeToggle', 'text-xs');
            }
        });
        sidebarMenu.innerHTML = html;
    }

    // Mobile Drawer Menu (Theme toggle placed directly below "Profil Saya")
    if (mobileDrawerMenu) {
        let html = '';
        menuItems.forEach(item => {
            const isActive = currentView === item.id;
            const activeClass = isActive ? 'bg-bnr-red text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800';
            const badge = item.highlight ? `<span class="ml-auto bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.5 rounded font-mono">ADMIN</span>` : '';
            html += `
                <button onclick="navigateTo('${item.id}'); closeMobileDrawer();" class="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm transition ${activeClass}">
                    <i data-lucide="${item.icon}" class="w-5 h-5"></i>
                    <span>${item.label}</span>
                    ${badge}
                </button>
            `;
            if (item.id === 'profile') {
                html += getThemeToggleHtml('drawerThemeToggle', 'text-sm');
            }
        });
        mobileDrawerMenu.innerHTML = html;
    }

    ensureThemeToggleButton();

    // Mobile Bottom Navigation (Active item turns RED as requested!)
    if (mobileBottomNav) {
        const bottomNavItems = [
            { id: 'dashboard', label: 'Beranda', icon: 'home' },
            { id: 'transfer', label: 'Transfer', icon: 'send' },
            { id: 'qr', label: 'QRIS', icon: 'qr-code' },
            { id: 'mutation', label: 'Mutasi', icon: 'receipt' },
            { id: 'profile', label: 'Profil', icon: 'user' }
        ];

        mobileBottomNav.innerHTML = bottomNavItems.map(item => {
            const isActive = currentView === item.id;
            // ACTIVE STATE: Changes to red color!
            const activeColorClass = isActive ? 'text-bnr-red font-bold' : 'text-slate-400 hover:text-slate-600';
            const dot = isActive ? '<span class="w-1.5 h-1.5 bg-bnr-red rounded-full mt-0.5"></span>' : '';
            return `
                <button onclick="navigateTo('${item.id}')" class="flex flex-col items-center py-1 transition ${activeColorClass}">
                    <i data-lucide="${item.icon}" class="w-5 h-5"></i>
                    <span class="text-[10px] mt-0.5">${item.label}</span>
                    ${dot}
                </button>
            `;
        }).join('');
    }

    lucide.createIcons();
}

function ensureThemeToggleButton() {
    // Clean up any stray theme toggle buttons from footers
    const oldSidebarBtn = document.querySelector('#desktopSidebar .p-4.border-t #sidebarThemeToggle');
    if (oldSidebarBtn) oldSidebarBtn.remove();
    const oldDrawerBtn = document.querySelector('#mobileDrawer .pt-4.border-t #drawerThemeToggle');
    if (oldDrawerBtn) oldDrawerBtn.remove();

    if (window.bnrTheme) {
        window.bnrTheme.updateThemeButtons(window.bnrTheme.getPreferredTheme());
    }
}

// Helper formats
function maskAccount(accNo) {
    if (!accNo) return '••••';
    return accNo.substring(0, 3) + '••••' + accNo.substring(7);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

// 5. VIEW RENDERERS (EXACT ORIGINAL DESIGN)

// --- DASHBOARD VIEW ---
async function renderDashboardView() {
    const contentArea = document.getElementById('contentArea');
    const balanceDisplay = isBalanceHidden ? '••••••••' : formatCurrency(currentAccount ? currentAccount.balance : 0).replace(/\u00A0/g, ' ');
    const maskedAcc = maskAccount(currentUser.accountNumber);
    const logoSrc = (window.BNR_CONFIG && window.BNR_CONFIG.branding && window.BNR_CONFIG.branding.logoUrl) || '/assets/images/bnr-logo.svg';

    contentArea.innerHTML = `
        <div class="space-y-6 page-fade-enter">
            <!-- Greeting & Quick Status -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                    <h3 class="text-xl font-extrabold text-slate-800 dark:text-white">Selamat datang, ${currentUser.name}</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Layanan Perbankan Virtual Roblox Terpercaya</p>
                </div>
                <div class="inline-flex items-center space-x-2 px-3 py-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 shadow-sm w-fit">
                    <i data-lucide="shield-check" class="w-4 h-4 text-emerald-500"></i>
                    <span>Status Rekening: <strong class="text-emerald-600 dark:text-emerald-400 uppercase">${currentAccount ? currentAccount.status : 'ACTIVE'}</strong></span>
                </div>
            </div>

            <!-- ATM Card Saldo Utama -->
            <div class="relative overflow-hidden bnr-card-gradient rounded-3xl p-5 sm:p-8 text-white shadow-xl">
                <div class="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                <div class="relative z-10 flex flex-col justify-between h-full space-y-6 sm:space-y-8">
                    <div class="flex justify-between items-start">
                        <div>
                            <span class="text-xs font-semibold tracking-widest text-red-100 uppercase">BNR Digital Account</span>
                            <p class="text-xl sm:text-2xl font-mono tracking-widest mt-1">${maskedAcc}</p>
                        </div>
                        <img src="${logoSrc}" class="bnr-brand-logo w-11 h-11 sm:w-12 sm:h-12 object-contain bg-white/10 p-1.5 rounded-xl border border-white/20" alt="Logo">
                    </div>

                    <div>
                        <div class="flex items-center space-x-2 text-red-200 mb-1">
                            <span class="text-xs font-medium">Total Saldo Aktif</span>
                            <button onclick="toggleBalanceVisibility()" class="hover:text-white transition">
                                <i data-lucide="${isBalanceHidden ? 'eye' : 'eye-off'}" class="w-4 h-4"></i>
                            </button>
                        </div>
                        <h2 class="text-xl min-[400px]:text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight break-all sm:break-normal leading-tight">${balanceDisplay}</h2>
                    </div>
                </div>
            </div>

            <!-- Quick Action Grid (4 Buttons) -->
            <div class="grid grid-cols-4 gap-3 sm:gap-4">
                <button onclick="navigateTo('transfer')" class="flex flex-col items-center p-3 sm:p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm transition group">
                    <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-50 dark:bg-red-950/40 text-bnr-red flex items-center justify-center mb-2 group-hover:scale-110 transition">
                        <i data-lucide="send" class="w-5 h-5 sm:w-6 sm:h-6"></i>
                    </div>
                    <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Transfer</span>
                </button>
                <button onclick="navigateTo('qr')" class="flex flex-col items-center p-3 sm:p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm transition group">
                    <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-50 dark:bg-red-950/40 text-bnr-red flex items-center justify-center mb-2 group-hover:scale-110 transition">
                        <i data-lucide="qr-code" class="w-5 h-5 sm:w-6 sm:h-6"></i>
                    </div>
                    <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Bayar QR</span>
                </button>
                <button onclick="navigateTo('topup')" class="flex flex-col items-center p-3 sm:p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm transition group">
                    <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-50 dark:bg-red-950/40 text-bnr-red flex items-center justify-center mb-2 group-hover:scale-110 transition">
                        <i data-lucide="plus-circle" class="w-5 h-5 sm:w-6 sm:h-6"></i>
                    </div>
                    <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Top Up</span>
                </button>
                <button onclick="navigateTo('mutation')" class="flex flex-col items-center p-3 sm:p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm transition group">
                    <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-50 dark:bg-red-950/40 text-bnr-red flex items-center justify-center mb-2 group-hover:scale-110 transition">
                        <i data-lucide="receipt" class="w-5 h-5 sm:w-6 sm:h-6"></i>
                    </div>
                    <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Mutasi</span>
                </button>
            </div>

            <!-- Recent Transactions Widget -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <div class="flex justify-between items-center mb-4">
                    <h4 class="font-bold text-sm text-slate-800 dark:text-white">Aktivitas Transaksi Terkini</h4>
                    <button onclick="navigateTo('mutation')" class="text-xs text-bnr-red font-semibold hover:underline">Semua Mutasi</button>
                </div>
                <div id="recentTxList" class="space-y-3">
                    <div class="text-center py-6 text-slate-400 text-xs">Memuat transaksi...</div>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();
    loadDashboardRecentTransactions();
}

function toggleBalanceVisibility() {
    isBalanceHidden = !isBalanceHidden;
    renderDashboardView();
}

async function loadDashboardRecentTransactions() {
    try {
        const res = await window.bnrApi.getTransactionHistory();
        const txList = res.transactions || [];
        const container = document.getElementById('recentTxList');
        if (!container) return;

        if (txList.length === 0) {
            container.innerHTML = `<div class="text-center py-6 text-slate-400 text-xs">Belum ada riwayat transaksi.</div>`;
            return;
        }

        const recent5 = txList.slice(0, 5);
        container.innerHTML = recent5.map(tx => {
            const isOutgoing = tx.role === 'DEBIT' || tx.direction === 'DEBIT' || tx.type === 'FEE_CHANGE_NAME' || tx.type === 'SERVICE_FEE' || tx.type === 'BBN_PURCHASE';
            const icon = isOutgoing ? 'arrow-up-right' : 'arrow-down-left';
            const iconColor = isOutgoing ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/40' : 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40';
            const amountColor = isOutgoing ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';
            const sign = isOutgoing ? '-' : '+';
            const dateStr = new Date(Number(tx.timestamp) || tx.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
            const title = tx.note || tx.description || (isOutgoing ? 'Transfer Keluar' : 'Transfer Masuk');
            const txCode = tx.id || tx.transactionId || tx.referenceId || '-';

            return `
                <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                    <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 rounded-xl ${iconColor} flex items-center justify-center">
                            <i data-lucide="${icon}" class="w-4 h-4"></i>
                        </div>
                        <div>
                            <p class="font-bold text-slate-800 dark:text-white">${title}</p>
                            <span class="text-[10px] text-slate-400">${dateStr}</span>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="font-extrabold ${amountColor}">${sign}${formatCurrency(tx.amount)}</p>
                        <span class="text-[10px] text-slate-400 font-mono">${txCode}</span>
                    </div>
                </div>
            `;
        }).join('');
        lucide.createIcons();
    } catch (err) {
        console.error('Failed to load recent tx:', err);
    }
}

// --- TRANSFER VIEW ---
function renderTransferView() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <div class="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm page-fade-enter">
            <h3 class="text-lg font-bold text-slate-800 dark:text-white mb-1">Transfer Rekening BNR</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mb-6">Kirim dana ke sesama nasabah Bank Nusantara Roblox secara instan.</p>

            <form onsubmit="handleTransferSubmit(event)" class="space-y-5">
                <div>
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Rekening Tujuan</label>
                    <input type="text" id="transferTarget" required placeholder="Contoh: 1203847291" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-bnr-red transition font-mono">
                </div>

                <div>
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Nominal Transfer (Rp)</label>
                    <input type="number" id="transferAmount" required min="${systemSettings.minimumTransfer}" max="${systemSettings.maximumTransfer}" placeholder="Min Rp ${systemSettings.minimumTransfer.toLocaleString('id-ID')}" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-bnr-red transition">
                    <p class="text-[11px] text-slate-400 mt-1">Batas transaksi: ${formatCurrency(systemSettings.maximumTransfer)}</p>
                </div>

                <div>
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Catatan (Opsional)</label>
                    <input type="text" id="transferNote" placeholder="Keterangan transaksi" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-bnr-red transition">
                </div>

                <div class="pt-2">
                    <button type="submit" id="btnSubmitTransfer" class="w-full bg-bnr-red hover:bg-bnr-darkred text-white font-semibold py-3.5 rounded-xl shadow-md transition flex items-center justify-center space-x-2">
                        <i data-lucide="send" class="w-4 h-4"></i>
                        <span>Lanjutkan Transfer</span>
                    </button>
                </div>
            </form>
        </div>
    `;
    lucide.createIcons();
}

async function handleTransferSubmit(e) {
    e.preventDefault();
    if (systemSettings.maintenanceMode) {
        Swal.fire('Fitur Dibatasi', 'Sistem sedang dalam masa pemeliharaan.', 'warning');
        return;
    }

    const targetAccountNo = document.getElementById('transferTarget').value.trim();
    const amount = parseInt(document.getElementById('transferAmount').value);
    const note = document.getElementById('transferNote').value.trim() || 'Transfer antar nasabah BNR';

    if (targetAccountNo === currentUser.accountNumber) {
        Swal.fire('Transaksi Gagal', 'Tidak dapat melakukan transfer ke rekening sendiri.', 'error');
        return;
    }

    if (amount < systemSettings.minimumTransfer || amount > systemSettings.maximumTransfer) {
        Swal.fire('Nominal Luar Batas', `Minimum Rp ${systemSettings.minimumTransfer.toLocaleString()} dan Maksimum Rp ${systemSettings.maximumTransfer.toLocaleString()}`, 'warning');
        return;
    }

    Swal.fire({
        title: 'Verifikasi Penerima...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const lookupRes = await window.bnrApi.lookupAccount(targetAccountNo);
        const receiverName = lookupRes.ownerName;

        Swal.fire({
            title: 'Konfirmasi Transfer',
            html: `
                <div class="text-left text-xs space-y-2 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div class="flex justify-between">
                        <span class="text-slate-500">Penerima:</span>
                        <strong class="text-slate-800 dark:text-white">${receiverName}</strong>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-500">Nomor Rekening:</span>
                        <strong class="text-slate-800 dark:text-white font-mono">${targetAccountNo}</strong>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-500">Nominal:</span>
                        <strong class="text-emerald-600 dark:text-emerald-400 font-mono">${formatCurrency(amount)}</strong>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-500">Biaya Layanan:</span>
                        <strong class="text-slate-700 dark:text-slate-300 font-mono">${formatCurrency(systemSettings.transferFee)}</strong>
                    </div>
                </div>
            `,
            icon: 'info',
            showCancelButton: true,
            confirmButtonColor: '#CC0000',
            confirmButtonText: 'Kirim Sekarang',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                Swal.showLoading();
                try {
                    const res = await window.bnrApi.transfer(targetAccountNo, amount, note);
                    currentAccount.balance = res.newBalance;
                    openReceiptModal(res.transaction);
                } catch (transferErr) {
                    Swal.fire('Transfer Gagal', transferErr.message, 'error');
                }
            }
        });
    } catch (err) {
        Swal.fire('Rekening Tidak Ditemukan', err.message || 'Nomor rekening tujuan tidak valid.', 'error');
    }
}

function openReceiptModal(tx) {
    Swal.fire({
        title: 'Transfer Berhasil',
        html: `
            <div id="digitalReceiptModal" class="text-left text-xs space-y-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-mono">
                <div class="text-center pb-2 border-b border-slate-200 dark:border-slate-700">
                    <h4 class="font-extrabold text-sm text-slate-800 dark:text-white">BANK NUSANTARA ROBLOX</h4>
                    <p class="text-[10px] text-slate-400">Bukti Transaksi Transfer Elektronik</p>
                </div>
                <div class="flex justify-between">
                    <span class="text-slate-500">ID Transaksi:</span>
                    <strong class="text-slate-800 dark:text-white">${tx.id}</strong>
                </div>
                <div class="flex justify-between">
                    <span class="text-slate-500">Waktu:</span>
                    <span class="text-slate-800 dark:text-white">${new Date(tx.timestamp).toLocaleString('id-ID')}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-slate-500">Pengirim:</span>
                    <span class="text-slate-800 dark:text-white">${tx.senderName}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-slate-500">Penerima:</span>
                    <span class="text-slate-800 dark:text-white">${tx.receiverName}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-slate-500">Nominal:</span>
                    <strong class="text-emerald-600 dark:text-emerald-400">${formatCurrency(tx.amount)}</strong>
                </div>
                <div class="flex justify-between">
                    <span class="text-slate-500">Status:</span>
                    <strong class="text-emerald-600 uppercase">BERHASIL</strong>
                </div>
            </div>
        `,
        icon: 'success',
        confirmButtonColor: '#CC0000',
        confirmButtonText: 'Tutup'
    }).then(() => {
        navigateTo('dashboard');
    });
}

// --- MUTATION VIEW ---
async function renderMutationView() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm page-fade-enter">
            <h3 class="text-lg font-bold text-slate-800 dark:text-white mb-4">Mutasi & Riwayat Transaksi</h3>
            <div id="mutationList" class="space-y-3">
                <div class="text-center py-8 text-slate-400 text-xs">Memuat data mutasi...</div>
            </div>
        </div>
    `;

    try {
        const res = await window.bnrApi.getTransactionHistory();
        const txList = res.transactions || [];
        const container = document.getElementById('mutationList');
        if (!container) return;

        if (txList.length === 0) {
            container.innerHTML = `<div class="text-center py-8 text-slate-400 text-xs">Belum ada mutasi transaksi.</div>`;
            return;
        }

        container.innerHTML = txList.map(tx => {
            const isOutgoing = tx.role === 'DEBIT' || tx.direction === 'DEBIT' || tx.type === 'FEE_CHANGE_NAME' || tx.type === 'SERVICE_FEE' || tx.type === 'BBN_PURCHASE';
            let counterparty = '';
            if (tx.receiverName || tx.senderName) {
                counterparty = isOutgoing ? `Ke: ${tx.receiverName || 'Pengeluaran'}` : `Dari: ${tx.senderName || 'Pemasukan'}`;
            } else if (tx.platform) {
                counterparty = `Platform: ${tx.platform}`;
            } else {
                counterparty = isOutgoing ? 'Pengeluaran' : 'Pemasukan';
            }

            const title = tx.note || tx.description || (isOutgoing ? 'Transfer Keluar' : 'Transfer Masuk');
            const txCode = tx.id || tx.transactionId || tx.referenceId || '-';

            return `
                <div class="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                    <div>
                        <p class="font-bold text-slate-800 dark:text-white">${title}</p>
                        <p class="text-slate-400 text-[11px]">${counterparty}</p>
                        <span class="text-[10px] text-slate-400 font-mono">${new Date(Number(tx.timestamp) || tx.timestamp).toLocaleString('id-ID')}</span>
                    </div>
                    <div class="text-right">
                        <p class="text-xs font-extrabold ${isOutgoing ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}">${isOutgoing ? '-' : '+'}${formatCurrency(tx.amount)}</p>
                        <span class="text-[10px] text-slate-400 font-mono">${txCode}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Failed to load mutations:', err);
    }
}

// --- QR PAYMENT VIEW ---
function renderQRView() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <div class="max-w-md mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center shadow-sm page-fade-enter">
            <h3 class="text-lg font-bold text-slate-800 dark:text-white mb-1">BNR Quick Payment QR</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mb-6">Tunjukkan QR ini untuk menerima saldo atau scan QR nasabah lain.</p>
            
            <div class="p-6 bg-slate-900 dark:bg-white rounded-2xl inline-block mb-6 shadow-inner">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${currentUser.accountNumber}" class="w-48 h-48 block mx-auto object-contain" alt="QR Code">
            </div>

            <p class="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">${maskAccount(currentUser.accountNumber)}</p>
            <p class="text-xs text-slate-400 mb-6">${currentUser.name}</p>

            <button onclick="promptSimulatedQRScan()" class="w-full bg-bnr-red hover:bg-bnr-darkred text-white py-3 rounded-xl font-semibold text-xs transition flex items-center justify-center space-x-2">
                <i data-lucide="scan" class="w-4 h-4"></i>
                <span>Simulasi Bayar via Kode QR</span>
            </button>
        </div>
    `;
    lucide.createIcons();
}

function promptSimulatedQRScan() {
    Swal.fire({
        title: 'Scan QR Payment',
        input: 'text',
        inputLabel: 'Masukkan Nomor Rekening QR Tujuan',
        inputPlaceholder: 'Contoh: 1203847291',
        showCancelButton: true,
        confirmButtonText: 'Lanjutkan Bayar'
    }).then((res) => {
        if (res.isConfirmed && res.value) {
            navigateTo('transfer');
            setTimeout(() => {
                const targetInput = document.getElementById('transferTarget');
                if (targetInput) targetInput.value = res.value;
            }, 100);
        }
    });
}

// --- TOP UP VIEW ---
function renderTopUpView() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <div class="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm page-fade-enter">
            <h3 class="text-lg font-bold text-slate-800 dark:text-white mb-1">Pengajuan Top Up Saldo</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mb-6">Kirim permintaan saldo ke pihak Administrator BNR.</p>

            <form onsubmit="handleTopUpRequest(event)" class="space-y-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Nominal Top Up (Rp)</label>
                    <input type="number" id="topupAmount" required min="10000" placeholder="Minimal Rp 10.000" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-bnr-red">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Alasan / Catatan Pengajuan</label>
                    <input type="text" id="topupNote" required placeholder="Contoh: Pembelian Asset Roleplay" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-bnr-red">
                </div>
                <button type="submit" class="w-full bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-semibold py-3.5 rounded-xl text-xs transition">Kirim Pengajuan Top Up</button>
            </form>
        </div>
    `;
}

async function handleTopUpRequest(e) {
    e.preventDefault();
    const amount = parseInt(document.getElementById('topupAmount').value);
    const note = document.getElementById('topupNote').value.trim();

    try {
        await window.bnrApi.requestTopUp(amount, note);
        Swal.fire('Pengajuan Terkirim', 'Permintaan Top Up Anda menunggu persetujuan Admin BNR.', 'success');
        navigateTo('dashboard');
    } catch (err) {
        Swal.fire('Gagal Mengajukan', err.message, 'error');
    }
}

// --- VIRTUAL CARD VIEW ---
function renderVirtualCardView() {
    const contentArea = document.getElementById('contentArea');
    const logoSrc = (window.BNR_CONFIG && window.BNR_CONFIG.branding && window.BNR_CONFIG.branding.logoUrl) || '/assets/images/bnr-logo.svg';

    contentArea.innerHTML = `
        <div class="max-w-md mx-auto space-y-6 page-fade-enter">
            <div class="bnr-card-gradient rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden border border-red-400/30">
                <div class="flex justify-between items-start mb-8">
                    <div>
                        <h4 class="font-extrabold text-lg tracking-wider">BNR VIRTUAL</h4>
                        <p class="text-[10px] text-red-200 tracking-widest uppercase">Roblox Exclusive Banking</p>
                    </div>
                    <img src="${logoSrc}" class="bnr-brand-logo w-10 h-10 object-contain" alt="Logo">
                </div>

                <div class="mb-6">
                    <p class="text-[10px] text-red-200 uppercase tracking-wider mb-1">Nomor Kartu Virtual</p>
                    <p class="text-xl font-mono tracking-widest">4800 •••• •••• ${currentUser.accountNumber.substring(6)}</p>
                </div>

                <div class="flex justify-between items-end">
                    <div>
                        <p class="text-[9px] text-red-200 uppercase">Pemegang Kartu</p>
                        <p class="text-xs font-bold uppercase tracking-wider">${currentUser.name}</p>
                    </div>
                    <div>
                        <p class="text-[9px] text-red-200 uppercase">Berlaku Hingga</p>
                        <p class="text-xs font-mono font-bold">12/30</p>
                    </div>
                </div>
            </div>
            
            <p class="text-center text-xs text-slate-400">Kartu virtual ini hanya berfungsi sebagai identitas keanggotaan roleplay resmi BNR.</p>
        </div>
    `;
}

// --- NOTIFICATIONS VIEW ---
async function renderNotificationsView() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm page-fade-enter">
            <h3 class="text-lg font-bold text-slate-800 dark:text-white mb-4">Pusat Notifikasi Realtime</h3>
            <div id="notifContainer" class="space-y-3">
                <div class="text-center py-6 text-slate-400 text-xs">Memuat notifikasi...</div>
            </div>
        </div>
    `;

    try {
        // Automatically mark as read to immediately clear red dot badge!
        window.bnrApi.markNotificationsRead().catch(() => {});
        const badge = document.getElementById('unreadNotifBadge');
        if (badge) badge.classList.add('hidden');

        const res = await window.bnrApi.getNotifications();
        const notifs = res.notifications || [];
        const container = document.getElementById('notifContainer');
        if (!container) return;

        if (notifs.length === 0) {
            container.innerHTML = `<div class="text-center py-6 text-slate-400 text-xs">Belum ada notifikasi.</div>`;
            return;
        }

        container.innerHTML = notifs.map(n => `
            <div class="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
                <h5 class="text-xs font-bold text-slate-800 dark:text-white">${n.title}</h5>
                <p class="text-xs text-slate-600 dark:text-slate-300 mt-1">${n.message}</p>
                <span class="text-[10px] text-slate-400 font-mono mt-2 block">${new Date(n.timestamp).toLocaleString('id-ID')}</span>
            </div>
        `).join('');
    } catch (err) {
        console.error('Failed to load notifications:', err);
    }
}

// --- PROFILE & NAME CHANGE VIEW ---
function renderProfileView() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <div class="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 page-fade-enter">
            <div class="flex items-center space-x-5 pb-6 border-b border-slate-200 dark:border-slate-800">
                <!-- Circular Avatar with overlapping bottom-right upload button -->
                <div class="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
                    <div id="profileAvatarDisplay" class="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-bnr-red text-white flex items-center justify-center font-extrabold text-2xl sm:text-3xl uppercase shadow-md border-2 border-white dark:border-slate-800">
                        ${currentUser.avatarUrl 
                            ? `<img src="${currentUser.avatarUrl}" class="w-full h-full object-cover" alt="Foto Profil">` 
                            : (currentUser.name || currentUser.username || 'U').charAt(0).toUpperCase()}
                    </div>
                    <!-- Upload Button on the circular border and slightly outside -->
                    <button type="button" onclick="document.getElementById('profileAvatarInput').click()" title="Unggah Foto Profil" 
                        class="absolute -bottom-1 -right-1 sm:bottom-0 sm:right-0 w-8 h-8 rounded-full bg-slate-900 hover:bg-bnr-red dark:bg-slate-700 dark:hover:bg-bnr-red text-white shadow-lg border-2 border-white dark:border-slate-900 flex items-center justify-center transition cursor-pointer group">
                        <i data-lucide="camera" class="w-4 h-4 group-hover:scale-110 transition-transform"></i>
                    </button>
                    <input type="file" id="profileAvatarInput" accept="image/png, image/jpeg, image/jpg, image/webp" class="hidden" onchange="handleAvatarFileSelected(event)">
                </div>

                <div class="min-w-0">
                    <h3 class="text-xl font-extrabold text-slate-800 dark:text-white truncate">${currentUser.name}</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">@${currentUser.username} • ${currentUser.role}</p>
                    ${currentUser.avatarUrl ? `
                        <button type="button" onclick="handleRemoveAvatar()" class="mt-2.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80 rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5 transition">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            <span>Hapus Foto Profil</span>
                        </button>
                    ` : ''}
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div class="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <span class="text-slate-400 block mb-1">Nomor Rekening Terikat</span>
                    <strong class="font-mono text-slate-800 dark:text-white text-sm">${currentUser.accountNumber}</strong>
                </div>
                <div class="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <span class="text-slate-400 block mb-1">Status Keanggotaan</span>
                    <strong class="text-emerald-600 uppercase">AKTIF TERVERIFIKASI</strong>
                </div>
            </div>

            <div class="border-t border-slate-200 dark:border-slate-800 pt-6">
                <h4 class="font-bold text-sm text-slate-800 dark:text-white mb-2">Layanan Perubahan Identitas</h4>
                <p class="text-xs text-slate-500 mb-4">Penggantian nama terdaftar dikenakan biaya administrasi resmi BNR sebesar <strong>${formatCurrency(systemSettings.profileChangeFee)}</strong>.</p>
                <button onclick="handleChangeNamePrompt()" class="px-5 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition">
                    Ganti Nama Rekening
                </button>
            </div>
        </div>
    `;
    lucide.createIcons();
}

async function handleAvatarFileSelected(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
        Swal.fire('Format Tidak Didukung', 'Silakan pilih file gambar dengan format PNG, JPEG, atau WebP.', 'warning');
        return;
    }

    if (file.size > 4 * 1024 * 1024) {
        Swal.fire('Ukuran Terlalu Besar', 'Maksimal ukuran foto adalah 4MB.', 'warning');
        return;
    }

    try {
        const reader = new FileReader();
        reader.onload = async function(e) {
            const rawDataUrl = e.target.result;
            const resizedDataUrl = await resizeImageToMax(rawDataUrl, 800);

            Swal.fire({
                title: 'Mengunggah Foto...',
                text: 'Menyimpan foto profil baru ke server BNR',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                const res = await window.bnrApi.uploadAvatar(resizedDataUrl);
                currentUser.avatarUrl = res.avatarUrl;
                window.bnrApi.setSavedUser(currentUser);

                Swal.fire({
                    icon: 'success',
                    title: 'Foto Profil Diperbarui',
                    text: res.message,
                    timer: 1800,
                    showConfirmButton: false
                });

                renderProfileView();
                renderSidebarAndNav();
            } catch (apiErr) {
                Swal.fire('Gagal Mengunggah', apiErr.message, 'error');
            }
        };
        reader.readAsDataURL(file);
    } catch (err) {
        Swal.fire('Gagal', err.message, 'error');
    }
}

async function handleRemoveAvatar() {
    if (!currentUser.avatarUrl) {
        Swal.fire({
            icon: 'info',
            title: 'Foto Profil Belum Ada',
            text: 'Akun Anda saat ini belum memiliki foto profil kustom.',
            confirmButtonColor: '#CC0000'
        });
        return;
    }

    const confirm = await Swal.fire({
        title: 'Hapus Foto Profil?',
        text: 'Apakah Anda yakin ingin menghapus foto profil akun Anda?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#CC0000',
        cancelButtonColor: '#64748B',
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal',
        reverseButtons: true
    });

    if (confirm.isConfirmed) {
        Swal.fire({
            title: 'Menghapus Foto...',
            text: 'Sedang memproses penghapusan foto profil...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            const res = await window.bnrApi.removeAvatar();
            currentUser.avatarUrl = null;
            window.bnrApi.setSavedUser(currentUser);

            Swal.fire({
                icon: 'success',
                title: 'Berhasil Dihapus',
                text: res.message || 'Foto profil berhasil dihapus dari akun Anda.',
                confirmButtonColor: '#CC0000',
                timer: 2000
            });

            renderProfileView();
            renderSidebarAndNav();
        } catch (err) {
            Swal.fire('Gagal Menghapus', err.message, 'error');
        }
    }
}

function resizeImageToMax(dataUrl, maxSize) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let width = img.width;
            let height = img.height;
            if (width > maxSize || height > maxSize) {
                if (width > height) {
                    height = Math.round((height * maxSize) / width);
                    width = maxSize;
                } else {
                    width = Math.round((width * maxSize) / height);
                    height = maxSize;
                }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.88));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

async function handleChangeNamePrompt() {
    const { value: newName } = await Swal.fire({
        title: 'Ganti Nama Rekening',
        input: 'text',
        inputLabel: `Biaya: ${formatCurrency(systemSettings.profileChangeFee)} (Dipotong dari Saldo)`,
        inputValue: currentUser.name,
        showCancelButton: true,
        confirmButtonColor: '#CC0000',
        confirmButtonText: 'Konfirmasi Ganti',
        inputValidator: (value) => {
            if (!value) return 'Nama tidak boleh kosong!';
            if (value === currentUser.name) return 'Nama harus berbeda dari nama sekarang!';
        }
    });

    if (newName) {
        try {
            const res = await window.bnrApi.changeName(newName.trim());
            currentUser.name = res.newName;
            currentAccount.balance = res.newBalance;
            Swal.fire('Berhasil Diperbarui', res.message, 'success');
            renderSidebarAndNav();
            renderProfileView();
        } catch (err) {
            Swal.fire('Gagal Ganti Nama', err.message, 'error');
        }
    }
}

// --- SUPER ADMIN PANEL VIEW ---
function renderAdminPanelView() {
    const contentArea = document.getElementById('contentArea');

    contentArea.innerHTML = `
        <div class="space-y-6 page-fade-enter">
            <!-- Header Status Admin -->
            <div class="bg-slate-900 text-white p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <span class="text-xs font-bold text-red-400 tracking-wider uppercase">Hak Akses Super Admin</span>
                    <h3 class="text-2xl font-extrabold mt-0.5">Kontrol Penuh Sistem BNR</h3>
                </div>
                <div class="flex items-center space-x-2">
                    <button onclick="toggleMaintenanceMode()" class="px-4 py-2 rounded-xl text-xs font-bold transition ${systemSettings.maintenanceMode ? 'bg-rose-600' : 'bg-emerald-600'}">
                        Mode Maintenance: ${systemSettings.maintenanceMode ? 'AKTIF' : 'NONAKTIF'}
                    </button>
                </div>
            </div>

            <!-- Tab Navigasi Admin -->
            <div class="flex space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-bold">
                <button onclick="renderAdminOverview()" class="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">Overview</button>
                <button onclick="renderAdminUsers()" class="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">Kelola User</button>
                <button onclick="renderAdminTopUps()" class="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">Persetujuan Top Up</button>
                <button onclick="renderAdminLogs()" class="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">Audit Log</button>
            </div>

            <!-- Workspace Konten Dinamis Admin -->
            <div id="adminWorkspace">
                <!-- Dimuat oleh sub-fungsi admin -->
            </div>
        </div>
    `;
    renderAdminOverview();
}

async function renderAdminOverview() {
    const ws = document.getElementById('adminWorkspace');
    ws.innerHTML = `<div class="text-center py-8 text-xs text-slate-400">Memuat overview sistem...</div>`;

    try {
        const res = await window.bnrApi.adminGetOverview();
        const stats = res.stats;
        const formattedBalance = formatCurrency(stats.totalBalance).replace(/\u00A0/g, ' ');

        ws.innerHTML = `
            <div class="space-y-4">
                <!-- 2 Kartu Statistik Atas (Total Nasabah & Total Transaksi) -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                        <span class="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Nasabah</span>
                        <h3 class="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">${stats.totalUsers}</h3>
                        <p class="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">${stats.activeUsers} Akun Aktif</p>
                    </div>
                    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                        <span class="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Transaksi</span>
                        <h3 class="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">${stats.totalTransactions}</h3>
                        <p class="text-[11px] text-slate-400 mt-1 font-semibold">Diproses Server</p>
                    </div>
                </div>

                <!-- Kartu Bawah: Total Peredaran Saldo (Memanjang Penuh & Responsif Mobile) -->
                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm">
                    <span class="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Peredaran Saldo</span>
                    <h3 class="text-2xl sm:text-3xl md:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2 break-all sm:break-normal leading-tight tracking-tight">
                        ${formattedBalance}
                    </h3>
                    <p class="text-[11px] sm:text-xs text-slate-400 mt-2 font-medium">Saldo Nasabah Terdaftar</p>
                </div>
            </div>
        `;
        lucide.createIcons();
    } catch (err) {
        ws.innerHTML = `<div class="text-center py-6 text-rose-500 text-xs">${err.message}</div>`;
    }
}

async function renderAdminUsers() {
    const ws = document.getElementById('adminWorkspace');
    ws.innerHTML = `
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
            <div class="flex justify-between items-center">
                <div>
                    <h4 class="font-bold text-sm text-slate-800 dark:text-white">Daftar Nasabah BNR</h4>
                    <p class="text-xs text-slate-400">Kelola akun, saldo, dan status nasabah terdaftar.</p>
                </div>
                <button onclick="openCreateCustomerModal()" class="px-3.5 py-2 bg-bnr-red hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-red-600/20">
                    <i data-lucide="user-plus" class="w-3.5 h-3.5"></i>
                    <span>+ Buat Nasabah Baru</span>
                </button>
            </div>
            <div id="adminUserTable" class="overflow-x-auto text-xs">Memuat nasabah...</div>
        </div>
    `;
    lucide.createIcons();

    try {
        const res = await window.bnrApi.adminGetUsers();
        const users = res.users || [];
        const container = document.getElementById('adminUserTable');

        container.innerHTML = `
            <table class="w-full text-left">
                <thead class="border-b border-slate-200 dark:border-slate-800 text-slate-400">
                    <tr>
                        <th class="pb-2.5">Nasabah</th>
                        <th class="pb-2.5">Discord</th>
                        <th class="pb-2.5">Rekening</th>
                        <th class="pb-2.5">Saldo</th>
                        <th class="pb-2.5">Status</th>
                        <th class="pb-2.5 text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                    ${users.map(u => `
                        <tr>
                            <td class="py-3">
                                <div class="flex items-center space-x-2.5">
                                    <div class="w-7 h-7 rounded-full overflow-hidden bg-bnr-red text-white flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                                        ${u.avatarUrl ? `<img src="${u.avatarUrl}" class="w-full h-full object-cover">` : (u.name || u.username || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <span class="font-bold text-slate-800 dark:text-white block leading-tight">${u.name || u.username}</span>
                                        <span class="text-[10px] text-slate-400 font-mono">@${u.username}</span>
                                    </div>
                                </div>
                            </td>
                            <td class="py-3 font-mono text-slate-600 dark:text-slate-300 text-xs">
                                ${u.discordUsername && u.discordUsername !== '-' ? `@${u.discordUsername}` : '-'}
                            </td>
                            <td class="py-3 font-mono text-slate-500 text-xs">${u.accountNumber}</td>
                            <td class="py-3 font-mono text-emerald-600 font-bold text-xs">${formatCurrency(u.balance)}</td>
                            <td class="py-3">
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${u.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800'}">
                                    ${u.status}
                                </span>
                            </td>
                            <td class="py-3 text-right space-x-1 whitespace-nowrap">
                                <button onclick="promptEditBalance('${u.accountNumber}')" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-semibold transition">Edit Saldo</button>
                                <button onclick="toggleUserStatus('${u.username}', '${u.status}')" class="px-2.5 py-1 ${u.status === 'ACTIVE' ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-400' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-400'} rounded-lg text-[10px] font-semibold transition">
                                    ${u.status === 'ACTIVE' ? 'Suspend' : 'Aktifkan'}
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        console.error(err);
    }
}

function openCreateCustomerModal() {
    const container = document.getElementById('appModalContainer');
    if (!container) return;

    container.innerHTML = `
        <div id="createCustomerModalBackdrop" onclick="handleCustomerModalBackdrop(event)" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div onclick="event.stopPropagation()" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto">
                <!-- Close Button -->
                <button onclick="closeCreateCustomerModal()" type="button" class="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl transition">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>

                <!-- Header -->
                <div class="mb-5">
                    <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-bnr-red dark:bg-rose-950/50 dark:text-rose-400 uppercase tracking-wider mb-1.5">Administrasi Nasabah</span>
                    <h3 class="text-xl font-extrabold text-slate-900 dark:text-white">Buka Rekening Nasabah Baru</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Daftarkan akun nasabah baru ke sistem perbankan virtual BNR.</p>
                </div>

                <!-- Alert Box -->
                <div id="modalAlertBox" class="hidden mb-4 p-3 rounded-2xl text-xs font-medium"></div>

                <!-- Form -->
                <form id="createCustomerForm" onsubmit="handleCreateCustomerSubmit(event)" class="space-y-4">
                    <!-- Nama Lengkap -->
                    <div>
                        <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Nama Lengkap Nasabah <span class="text-rose-500">*</span>
                        </label>
                        <div class="relative">
                            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                <i data-lucide="user" class="w-4 h-4"></i>
                            </span>
                            <input type="text" id="custName" required placeholder="cth. Haruukii Dharmawijaya"
                                class="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-bnr-red transition">
                        </div>
                    </div>

                    <!-- Username Roblox -->
                    <div>
                        <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Username Roblox <span class="text-rose-500">*</span>
                        </label>
                        <div class="relative">
                            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                                @
                            </span>
                            <input type="text" id="custUsername" required placeholder="username_roblox"
                                class="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-bnr-red transition">
                        </div>
                    </div>

                    <!-- Username Discord -->
                    <div>
                        <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Username Discord <span class="text-rose-500">*</span>
                        </label>
                        <div class="relative flex items-center">
                            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                <i data-lucide="message-square" class="w-4 h-4"></i>
                            </span>
                            <input type="text" id="custDiscord" required placeholder="cth. haruukii"
                                class="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-bnr-red transition">
                        </div>
                    </div>

                    <!-- Password Akun -->
                    <div>
                        <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Password Akun <span class="text-rose-500">*</span>
                        </label>
                        <div class="relative">
                            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                <i data-lucide="lock" class="w-4 h-4"></i>
                            </span>
                            <input type="password" id="custPassword" required placeholder="Minimal 6 karakter"
                                class="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-bnr-red transition">
                            <button type="button" onclick="togglePasswordModalVisibility()" class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                <i data-lucide="eye" id="custEyeIcon" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Saldo Awal -->
                    <div>
                        <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Saldo Awal Pembukaan Rekening
                        </label>
                        <div class="relative">
                            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                                Rp
                            </span>
                            <input type="number" id="custBalance" min="0" value="0" placeholder="0"
                                class="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-bnr-red transition">
                        </div>
                        <div class="flex flex-wrap gap-1.5 mt-2">
                            <button type="button" onclick="document.getElementById('custBalance').value = 0" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-medium transition">Rp 0</button>
                            <button type="button" onclick="document.getElementById('custBalance').value = 50000" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-medium transition">Rp 50.000</button>
                            <button type="button" onclick="document.getElementById('custBalance').value = 100000" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-medium transition">Rp 100.000</button>
                            <button type="button" onclick="document.getElementById('custBalance').value = 500000" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-medium transition">Rp 500.000</button>
                            <button type="button" onclick="document.getElementById('custBalance').value = 1000000" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-medium transition">Rp 1.000.000</button>
                        </div>
                    </div>

                    <!-- Footer Actions -->
                    <div class="pt-3 flex items-center justify-end space-x-3 border-t border-slate-100 dark:border-slate-800">
                        <button type="button" onclick="closeCreateCustomerModal()" class="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-xs font-bold transition">
                            Batal
                        </button>
                        <button type="submit" id="btnSubmitCustomer" class="px-5 py-2.5 bg-bnr-red hover:bg-red-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-red-600/20 transition flex items-center space-x-1.5">
                            <i data-lucide="user-plus" class="w-4 h-4"></i>
                            <span id="btnSubmitText">Daftarkan Nasabah</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    lucide.createIcons();
}

function closeCreateCustomerModal() {
    const container = document.getElementById('appModalContainer');
    if (container) container.innerHTML = '';
}

function handleCustomerModalBackdrop(e) {
    if (e.target.id === 'createCustomerModalBackdrop') {
        closeCreateCustomerModal();
    }
}

function togglePasswordModalVisibility() {
    const pwd = document.getElementById('custPassword');
    const icon = document.getElementById('custEyeIcon');
    if (!pwd) return;
    if (pwd.type === 'password') {
        pwd.type = 'text';
        if (icon) icon.setAttribute('data-lucide', 'eye-off');
    } else {
        pwd.type = 'password';
        if (icon) icon.setAttribute('data-lucide', 'eye');
    }
    lucide.createIcons();
}

async function handleCreateCustomerSubmit(event) {
    event.preventDefault();
    const alertBox = document.getElementById('modalAlertBox');
    const submitBtn = document.getElementById('btnSubmitCustomer');
    const btnSubmitText = document.getElementById('btnSubmitText');

    const name = document.getElementById('custName').value.trim();
    const username = document.getElementById('custUsername').value.trim();
    const discordUsername = document.getElementById('custDiscord').value.trim().replace(/^@/, '');
    const password = document.getElementById('custPassword').value;
    const initialBalance = document.getElementById('custBalance').value;

    if (!name || !username || !discordUsername || !password) {
        if (alertBox) {
            alertBox.className = 'mb-4 p-3 rounded-2xl text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900 block';
            alertBox.textContent = 'Semua bidang bertanda bintang (*) wajib diisi.';
        }
        return;
    }

    // Set loading state on submit button only when creating
    if (submitBtn) submitBtn.disabled = true;
    if (btnSubmitText) btnSubmitText.textContent = 'Mendaftarkan...';
    if (alertBox) alertBox.className = 'hidden';

    try {
        const res = await window.bnrApi.adminCreateUser({
            name,
            username,
            discordUsername,
            password,
            initialBalance: parseInt(initialBalance, 10) || 0
        });

        closeCreateCustomerModal();

        Swal.fire({
            icon: 'success',
            title: 'Nasabah Berhasil Dibuat!',
            html: `
                <div class="text-xs text-left space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl mt-2 font-mono border border-slate-200 dark:border-slate-700">
                    <p><strong class="text-slate-400 font-sans">Nama:</strong> ${res.user.name}</p>
                    <p><strong class="text-slate-400 font-sans">Username:</strong> @${res.user.username}</p>
                    <p><strong class="text-slate-400 font-sans">Username Discord:</strong> @${res.user.discordUsername}</p>
                    <p><strong class="text-slate-400 font-sans">No. Rekening:</strong> ${res.user.accountNumber}</p>
                    <p><strong class="text-slate-400 font-sans">Saldo Awal:</strong> ${formatCurrency(res.user.balance)}</p>
                </div>
            `,
            confirmButtonColor: '#CC0000',
            confirmButtonText: 'Selesai'
        });

        renderAdminUsers();
    } catch (err) {
        if (submitBtn) submitBtn.disabled = false;
        if (btnSubmitText) btnSubmitText.textContent = 'Daftarkan Nasabah';
        if (alertBox) {
            alertBox.className = 'mb-4 p-3 rounded-2xl text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900 block';
            alertBox.textContent = err.message || 'Gagal membuat akun nasabah.';
        }
    }
}

async function promptEditBalance(accountNo) {
    const { value: amount } = await Swal.fire({
        title: 'Penyesuaian Saldo Admin',
        input: 'number',
        inputPlaceholder: 'Masukkan saldo baru (Rp)',
        showCancelButton: true,
        confirmButtonColor: '#CC0000',
        confirmButtonText: 'Simpan Saldo'
    });

    if (amount !== undefined && amount !== '') {
        try {
            const res = await window.bnrApi.adminAdjustBalance(accountNo, amount, 'Penyesuaian Manual Admin');
            Swal.fire('Saldo Diperbarui', res.message, 'success');
            renderAdminUsers();
        } catch (err) {
            Swal.fire('Gagal Update Saldo', err.message, 'error');
        }
    }
}

async function toggleUserStatus(username, currentStatus) {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
        const res = await window.bnrApi.adminToggleUserStatus(username, nextStatus);
        Swal.fire('Status Diperbarui', res.message, 'success');
        renderAdminUsers();
    } catch (err) {
        Swal.fire('Gagal', err.message, 'error');
    }
}

async function renderAdminTopUps() {
    const ws = document.getElementById('adminWorkspace');
    ws.innerHTML = `<div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6"><h4 class="font-bold text-sm text-slate-800 dark:text-white mb-4">Persetujuan Top Up</h4><div id="topupRequestsList">Memuat...</div></div>`;

    try {
        const res = await window.bnrApi.adminGetTopUps();
        const reqs = res.requests || [];
        const container = document.getElementById('topupRequestsList');

        if (reqs.length === 0) {
            container.innerHTML = `<p class="text-xs text-slate-400">Tidak ada pengajuan pending.</p>`;
            return;
        }

        container.innerHTML = reqs.map(r => `
            <div class="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-800 text-xs">
                <div>
                    <p class="font-bold text-slate-800 dark:text-white">${r.name} (@${r.username})</p>
                    <p class="text-slate-500">${r.note} — <strong class="text-emerald-600">${formatCurrency(r.amount)}</strong></p>
                </div>
                <div class="space-x-1">
                    <button onclick="approveTopUp('${r.id}')" class="px-3 py-1 bg-emerald-600 text-white rounded">Setujui</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

async function approveTopUp(requestId) {
    try {
        const res = await window.bnrApi.adminApproveTopUp(requestId);
        Swal.fire('Disetujui', res.message, 'success');
        renderAdminTopUps();
    } catch (err) {
        Swal.fire('Gagal', err.message, 'error');
    }
}

async function renderAdminLogs() {
    const ws = document.getElementById('adminWorkspace');
    ws.innerHTML = `
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
            <div class="flex items-center justify-between mb-4">
                <div>
                    <h4 class="font-bold text-sm text-slate-800 dark:text-white">Audit Trail & Log Keamanan Sistem</h4>
                    <p class="text-xs text-slate-400">Mencatat riwayat login, IP address, OS, browser, timezone, dan aktivitas user & admin secara real-time.</p>
                </div>
                <button onclick="renderAdminLogs()" class="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs rounded-xl font-semibold text-slate-700 dark:text-slate-300 transition">
                    Refresh Log
                </button>
            </div>
            <div id="auditLogsContainer" class="overflow-x-auto text-xs">Memuat data log...</div>
        </div>
    `;

    try {
        const res = await window.bnrApi.adminGetAuditLogs();
        const logs = res.logs || [];
        const container = document.getElementById('auditLogsContainer');

        if (logs.length === 0) {
            container.innerHTML = `<p class="text-slate-400 py-4">Belum ada riwayat audit log.</p>`;
            return;
        }

        container.innerHTML = `
            <div class="space-y-3">
                ${logs.map(l => {
                    const isLogin = l.action === 'USER_LOGIN' || l.action === 'LOGIN';
                    const timeStr = l.loginTime || l.logoutTime || `${new Date(l.timestamp).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`;
                    const tzStr = l.timezone || 'Asia/Jakarta (WIB)';
                    const ipStr = l.ip || '-';
                    const deviceStr = l.browser ? `${l.browser} &bull; ${l.os || 'Unknown OS'}` : (l.os || '-');

                    return `
                        <div class="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                            <div class="flex flex-wrap items-center justify-between gap-2">
                                <div class="flex items-center space-x-2">
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isLogin ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'}">
                                        ${l.action}
                                    </span>
                                    <strong class="text-slate-900 dark:text-white font-mono text-xs">@${l.username}</strong>
                                    ${l.role ? `<span class="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[9px] font-bold">${l.role}</span>` : ''}
                                </div>
                                <div class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                    <span>${timeStr}</span>
                                    <span class="text-[10px] text-slate-400 font-mono ml-1">(${tzStr})</span>
                                </div>
                            </div>
                            
                            <p class="text-xs text-slate-700 dark:text-slate-300">${l.details}</p>

                            <div class="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 text-[10px] text-slate-500">
                                <div class="flex items-center space-x-1">
                                    <span class="text-slate-400">IP:</span>
                                    <span class="font-mono font-bold text-slate-700 dark:text-slate-300">${ipStr}</span>
                                </div>
                                <div class="flex items-center space-x-1">
                                    <span class="text-slate-400">Device/Browser:</span>
                                    <span class="font-medium text-slate-700 dark:text-slate-300">${deviceStr}</span>
                                </div>
                                <div class="flex items-center space-x-1">
                                    <span class="text-slate-400">Zona Waktu:</span>
                                    <span class="text-slate-700 dark:text-slate-300">${tzStr}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } catch (err) {
        console.error(err);
        const container = document.getElementById('auditLogsContainer');
        if (container) container.innerHTML = `<p class="text-rose-500 py-2">Gagal memuat log audit: ${err.message}</p>`;
    }
}

async function toggleMaintenanceMode() {
    const nextMode = !systemSettings.maintenanceMode;
    try {
        const res = await window.bnrApi.adminToggleMaintenance(nextMode);
        systemSettings.maintenanceMode = nextMode;
        Swal.fire('Mode Diubah', res.message, 'success');
        renderAdminPanelView();
    } catch (err) {
        Swal.fire('Gagal Mengubah Mode', err.message, 'error');
    }
}

// 6. BACKGROUND POLLING FOR NOTIFICATIONS
function startBackgroundPolling() {
    checkNotifications();
    setInterval(checkNotifications, 25000);
}

async function checkNotifications() {
    if (!window.bnrApi.isAuthenticated()) return;
    try {
        const res = await window.bnrApi.getNotifications();
        const badge = document.getElementById('unreadNotifBadge');
        if (badge) {
            if (res.unreadCount > 0) {
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    } catch {
        // Silent fail
    }
}
