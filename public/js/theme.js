/**
 * BNR Theme Manager & Application Settings
 * Persists theme state in localStorage and updates UI smoothly.
 */
window.BNR_CONFIG = window.BNR_CONFIG || {
    appName: "BNR",
    bankName: "Bank Nusantara Roblox",
    tagline: "Virtual Banking System",
    branding: {
        logoUrl: "/assets/images/logo.png",
        fallbackLogo: "/assets/images/logo.png",
        faviconUrl: "/assets/images/favicon.ico",
        pwaIcon192: "/assets/images/logo.png",
        pwaIcon512: "/assets/images/logo.png"
    },
    pageTitles: {
        login: "Masuk ke Layanan — BNR",
        dashboard: "Beranda — BNR",
        transfer: "Transfer Saldo — BNR",
        mutation: "Mutasi Rekening — BNR",
        qr: "Pembayaran QRIS — BNR",
        topup: "Pengajuan Top Up — BNR",
        virtualCard: "Kartu Virtual — BNR",
        notifications: "Pusat Notifikasi — BNR",
        profile: "Profil Pengguna — BNR",
        admin: "Super Admin Portal — BNR"
    },
    theme: {
        defaultMode: "light",
        brandColor: "#CC0000",
        darkColor: "#0F172A"
    }
};

(function() {
    const THEME_KEY = 'bnr_theme';
    const MANUAL_FLAG = 'bnr_theme_manual';

    // Apply saved theme if manually toggled, otherwise follow BNR_CONFIG default ('light')
    function getPreferredTheme() {
        const isManual = localStorage.getItem(MANUAL_FLAG) === 'true';
        if (isManual) {
            const saved = localStorage.getItem(THEME_KEY);
            if (saved === 'dark' || saved === 'light') return saved;
        }
        return (window.BNR_CONFIG && window.BNR_CONFIG.theme && window.BNR_CONFIG.theme.defaultMode) || 'light';
    }

    function applyTheme(theme, isManual = false) {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        if (isManual) {
            localStorage.setItem(THEME_KEY, theme);
            localStorage.setItem(MANUAL_FLAG, 'true');
        }
        updateThemeButtons(theme);
    }

    function toggleTheme() {
        const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next, true);
    }

    function updateThemeButtons(theme) {
        const buttons = document.querySelectorAll('.theme-toggle-btn');
        buttons.forEach(btn => {
            const icon = btn.querySelector('.theme-icon');
            const label = btn.querySelector('.theme-label');
            if (theme === 'dark') {
                if (icon) icon.setAttribute('data-lucide', 'sun');
                if (label) label.textContent = 'Mode Terang';
            } else {
                if (icon) icon.setAttribute('data-lucide', 'moon');
                if (label) label.textContent = 'Mode Gelap';
            }
        });
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    // Initialize immediately to prevent flash of wrong theme
    const initialTheme = getPreferredTheme();
    applyTheme(initialTheme);

    // Expose functions globally
    window.bnrTheme = {
        getPreferredTheme,
        applyTheme,
        toggleTheme,
        updateThemeButtons
    };

    document.addEventListener('DOMContentLoaded', () => {
        updateThemeButtons(getPreferredTheme());
    });
})();
