/**
 * BNR Shared Components & Navigation
 * Manages layout, sidebar, topbar, mobile navigation, dark mode toggle, and active page styling.
 */
class BnrComponents {
    constructor() {
        this.currentUser = window.bnrApi ? window.bnrApi.getSavedUser() : null;
        this.currentPage = this.detectCurrentPage();
    }

    detectCurrentPage() {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('dashboard')) return 'dashboard';
        if (path.includes('transfer')) return 'transfer';
        if (path.includes('mutasi')) return 'mutasi';
        if (path.includes('qris')) return 'qris';
        if (path.includes('topup')) return 'topup';
        if (path.includes('kartu')) return 'kartu';
        if (path.includes('notifikasi')) return 'notifikasi';
        if (path.includes('profil')) return 'profil';
        if (path.includes('admin')) return 'admin';
        return 'dashboard';
    }

    init() {
        this.applyBranding();
        this.renderLayout();
        this.attachEventListeners();
        this.checkUnreadNotifications();
    }

    applyBranding() {
        const cfg = window.BNR_CONFIG || {};
        const branding = cfg.branding || {};
        const titles = cfg.pageTitles || {};

        // 1. Set Favicon dynamically
        const faviconUrl = branding.faviconUrl || '/assets/images/favicon.svg';
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = faviconUrl;

        // 2. Set Page Title dynamically
        if (titles[this.currentPage]) {
            document.title = titles[this.currentPage];
        }

        // 3. Update all BNR logo images on the page
        const logoImgs = document.querySelectorAll('.bnr-brand-logo');
        logoImgs.forEach(img => {
            img.src = branding.logoUrl || '/assets/images/bnr-logo.svg';
            img.onerror = () => {
                if (branding.fallbackLogo && img.src !== branding.fallbackLogo) {
                    img.src = branding.fallbackLogo;
                }
            };
        });
    }

    renderLayout() {
        const container = document.getElementById('appLayout');
        if (!container) return;

        const isSuperAdmin = this.currentUser && this.currentUser.role === 'SUPER_ADMIN';
        const userInitial = (this.currentUser && this.currentUser.name) ? this.currentUser.name.charAt(0).toUpperCase() : 'U';
        const userName = (this.currentUser && this.currentUser.name) || 'Nasabah BNR';
        const userRole = (this.currentUser && this.currentUser.role) || 'CUSTOMER';
        const logoSrc = (window.BNR_CONFIG && window.BNR_CONFIG.branding && window.BNR_CONFIG.branding.logoUrl) || '/assets/images/bnr-logo.svg';

        // Nav items definition
        const navItems = [
            { id: 'dashboard', label: 'Beranda', icon: 'layout-dashboard', href: '/pages/dashboard.html' },
            { id: 'transfer', label: 'Transfer', icon: 'arrow-left-right', href: '/pages/transfer.html' },
            { id: 'mutasi', label: 'Mutasi', icon: 'receipt-text', href: '/pages/mutasi.html' },
            { id: 'qris', label: 'Bayar QRIS', icon: 'qr-code', href: '/pages/qris.html' },
            { id: 'topup', label: 'Top Up', icon: 'wallet-cards', href: '/pages/topup.html' },
            { id: 'kartu', label: 'Kartu Virtual', icon: 'credit-card', href: '/pages/kartu.html' },
            { id: 'profil', label: 'Profil Saya', icon: 'user', href: '/pages/profil.html' }
        ];

        if (isSuperAdmin) {
            navItems.push({ id: 'admin', label: 'Admin Portal', icon: 'shield-check', href: '/pages/admin.html', highlight: true });
        }

        // Render Desktop Sidebar Navigation
        const desktopNavHtml = navItems.map(item => {
            const isActive = this.currentPage === item.id;
            const activeClass = isActive
                ? 'bg-bnr-red text-white font-bold shadow-md shadow-red-900/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80';
            const badgeHighlight = item.highlight ? '<span class="ml-auto text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">STAFF</span>' : '';
            return `
                <a href="${item.href}" class="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs transition duration-150 ${activeClass}">
                    <i data-lucide="${item.icon}" class="w-4 h-4"></i>
                    <span>${item.label}</span>
                    ${badgeHighlight}
                </a>
            `;
        }).join('');

        // Render Mobile Bottom Navigation (First 5 primary items)
        const mobileNavItems = [
            { id: 'dashboard', label: 'Beranda', icon: 'layout-dashboard', href: '/pages/dashboard.html' },
            { id: 'transfer', label: 'Transfer', icon: 'arrow-left-right', href: '/pages/transfer.html' },
            { id: 'qris', label: 'QRIS', icon: 'qr-code', href: '/pages/qris.html' },
            { id: 'mutasi', label: 'Mutasi', icon: 'receipt-text', href: '/pages/mutasi.html' },
            { id: 'kartu', label: 'Kartu', icon: 'credit-card', href: '/pages/kartu.html' }
        ];

        const mobileBottomHtml = mobileNavItems.map(item => {
            const isActive = this.currentPage === item.id;
            const activeClass = isActive
                ? 'text-bnr-red font-bold'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300';
            const dotIndicator = isActive ? '<span class="w-1.5 h-1.5 bg-bnr-red rounded-full mt-0.5"></span>' : '';
            return `
                <a href="${item.href}" class="flex flex-col items-center py-1 text-[11px] transition duration-150 ${activeClass}">
                    <i data-lucide="${item.icon}" class="w-5 h-5"></i>
                    <span class="mt-0.5">${item.label}</span>
                    ${dotIndicator}
                </a>
            `;
        }).join('');

        // Full Structure Template
        const layoutHtml = `
            <!-- DESKTOP SIDEBAR -->
            <aside class="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0 sticky top-0 h-screen z-30">
                <!-- Brand Header -->
                <div class="p-6 flex items-center space-x-3 border-b border-slate-800/80">
                    <img src="${logoSrc}" alt="BNR Logo" class="bnr-brand-logo w-9 h-9 object-contain rounded-xl shadow-md">
                    <div>
                        <h1 class="font-extrabold text-white text-base tracking-wide leading-none">BNR</h1>
                        <span class="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Bank Nusantara</span>
                    </div>
                </div>

                <!-- Navigation Menu -->
                <div class="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
                    ${desktopNavHtml}
                </div>

                <!-- Sidebar Footer: Profile, Dark Mode Toggle & Logout -->
                <div class="p-4 border-t border-slate-800/80 bg-slate-950/60 space-y-2">
                    <!-- User Profile Button / Info -->
                    <a href="/pages/profil.html" class="flex items-center space-x-3 p-2 rounded-xl hover:bg-slate-800/60 transition group">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-bnr-red to-red-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow">
                            ${userInitial}
                        </div>
                        <div class="overflow-hidden flex-1">
                            <p class="text-xs font-semibold text-white truncate group-hover:text-bnr-red transition">${userName}</p>
                            <p class="text-[10px] text-slate-400 font-mono truncate">${userRole}</p>
                        </div>
                    </a>

                    <!-- DARK MODE TOGGLE BUTTON (Under Profile) -->
                    <button type="button" onclick="window.bnrTheme.toggleTheme()" class="theme-toggle-btn w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition">
                        <div class="flex items-center space-x-2">
                            <i data-lucide="moon" class="theme-icon w-4 h-4 text-amber-400"></i>
                            <span class="theme-label">Mode Tampilan</span>
                        </div>
                        <span class="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">Ganti</span>
                    </button>

                    <!-- Logout Button -->
                    <button type="button" onclick="window.bnrComponents.confirmLogout()" class="w-full flex items-center space-x-2 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-xl transition">
                        <i data-lucide="log-out" class="w-4 h-4"></i>
                        <span>Keluar Sistem</span>
                    </button>
                </div>
            </aside>

            <!-- MAIN CONTAINER -->
            <div class="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
                <!-- TOP NAVBAR -->
                <header class="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 px-4 py-3 flex items-center justify-between shadow-sm">
                    <div class="flex items-center space-x-3">
                        <button onclick="window.bnrComponents.toggleMobileDrawer()" class="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                            <i data-lucide="menu" class="w-5 h-5"></i>
                        </button>
                        <div class="flex items-center space-x-2 md:hidden">
                            <img src="${logoSrc}" class="bnr-brand-logo w-7 h-7 object-contain rounded-lg" alt="Logo">
                            <span class="font-bold text-slate-900 dark:text-white text-sm tracking-tight">BNR</span>
                        </div>
                        <h2 class="hidden md:block text-base font-bold text-slate-800 dark:text-white" id="navHeaderTitle">
                            ${(window.BNR_CONFIG && window.BNR_CONFIG.pageTitles && window.BNR_CONFIG.pageTitles[this.currentPage]) || 'Beranda'}
                        </h2>
                    </div>

                    <div class="flex items-center space-x-2.5">
                        <div class="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Sistem Online</span>
                        </div>

                        <!-- Notification Bell with Unread Red Dot -->
                        <a href="/pages/notifikasi.html" onclick="window.bnrComponents.handleNotificationClick(event)" class="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition">
                            <i data-lucide="bell" class="w-5 h-5"></i>
                            <span id="unreadNotifBadge" class="hidden absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-bnr-red rounded-full ring-2 ring-white dark:ring-slate-900"></span>
                        </a>
                    </div>
                </header>

                <!-- DYNAMIC CONTENT AREA -->
                <main id="contentArea" class="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
                    <!-- Page content will be rendered here -->
                </main>
            </div>

            <!-- MOBILE BOTTOM NAVIGATION -->
            <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-30 px-3 py-1 flex justify-around items-center shadow-lg">
                ${mobileBottomHtml}
            </nav>

            <!-- MOBILE DRAWER -->
            <div id="mobileDrawer" class="hidden md:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm">
                <div class="w-72 bg-slate-900 h-full text-slate-300 p-6 flex flex-col justify-between overflow-y-auto">
                    <div>
                        <div class="flex items-center justify-between pb-6 border-b border-slate-800">
                            <div class="flex items-center space-x-3">
                                <img src="${logoSrc}" class="bnr-brand-logo w-8 h-8 object-contain rounded-lg" alt="BNR">
                                <span class="font-extrabold text-white text-base">BNR</span>
                            </div>
                            <button onclick="window.bnrComponents.toggleMobileDrawer()" class="text-slate-400 hover:text-white">
                                <i data-lucide="x" class="w-6 h-6"></i>
                            </button>
                        </div>
                        <div class="py-4 space-y-1">
                            ${desktopNavHtml}
                        </div>
                    </div>

                    <!-- Mobile Drawer Footer (Profile, Dark Mode & Logout) -->
                    <div class="pt-4 border-t border-slate-800 space-y-3">
                        <div class="flex items-center space-x-3">
                            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-bnr-red to-red-600 text-white flex items-center justify-center font-bold text-xs uppercase">
                                ${userInitial}
                            </div>
                            <div class="overflow-hidden">
                                <p class="text-xs font-semibold text-white truncate">${userName}</p>
                                <p class="text-[10px] text-slate-400 font-mono truncate">${userRole}</p>
                            </div>
                        </div>

                        <!-- Mobile Dark Mode Toggle -->
                        <button type="button" onclick="window.bnrTheme.toggleTheme()" class="theme-toggle-btn w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 rounded-xl transition">
                            <div class="flex items-center space-x-2">
                                <i data-lucide="moon" class="theme-icon w-4 h-4 text-amber-400"></i>
                                <span class="theme-label">Mode Tampilan</span>
                            </div>
                            <span class="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300">Ganti</span>
                        </button>

                        <button onclick="window.bnrComponents.confirmLogout()" class="w-full flex items-center space-x-2 px-3 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/10 rounded-xl">
                            <i data-lucide="log-out" class="w-4 h-4"></i>
                            <span>Keluar Sistem</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Transfer existing content in container into #contentArea
        const originalContent = container.innerHTML;
        container.innerHTML = layoutHtml;
        const newContentArea = document.getElementById('contentArea');
        if (newContentArea && originalContent.trim().length > 0) {
            newContentArea.innerHTML = originalContent;
        }

        if (window.lucide) {
            lucide.createIcons();
        }
    }

    toggleMobileDrawer() {
        const drawer = document.getElementById('mobileDrawer');
        if (drawer) {
            drawer.classList.toggle('hidden');
        }
    }

    async checkUnreadNotifications() {
        if (!window.bnrApi || !window.bnrApi.isAuthenticated()) return;
        try {
            const data = await window.bnrApi.getNotifications();
            const badge = document.getElementById('unreadNotifBadge');
            if (badge) {
                if (data.unreadCount > 0) {
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
        } catch {
            // Silently ignore background polling error
        }
    }

    async handleNotificationClick(e) {
        // Optimistically hide the red dot immediately
        const badge = document.getElementById('unreadNotifBadge');
        if (badge) badge.classList.add('hidden');

        // Call backend API to mark all as read
        if (window.bnrApi) {
            window.bnrApi.markNotificationsRead().catch(() => {});
        }
    }

    confirmLogout() {
        if (window.Swal) {
            Swal.fire({
                title: 'Konfirmasi Keluar',
                text: 'Apakah Anda yakin ingin keluar dari layanan BNR?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#CC0000',
                cancelButtonColor: '#64748B',
                confirmButtonText: 'Ya, Keluar',
                cancelButtonText: 'Batal'
            }).then((res) => {
                if (res.isConfirmed) {
                    window.bnrApi.logout();
                }
            });
        } else {
            if (confirm('Keluar dari sistem BNR?')) {
                window.bnrApi.logout();
            }
        }
    }

    attachEventListeners() {
        // Re-check notifications every 30 seconds
        setInterval(() => this.checkUnreadNotifications(), 30000);
    }
}

window.bnrComponents = new BnrComponents();
document.addEventListener('DOMContentLoaded', () => {
    window.bnrComponents.init();
});
