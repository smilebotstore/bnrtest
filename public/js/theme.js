/**
 * BNR Theme Manager & Application Settings
 * Persists theme state in localStorage and updates UI smoothly.
 */
window.BNR_CONFIG = window.BNR_CONFIG || {
    appName: "BNR",
    bankName: "Bank Nusantara Roblox",
    tagline: "Virtual Banking System",
    branding: {
        logoUrl: "/assets/images/bnr-logo.svg",
        fallbackLogo: "/assets/images/bnr-logo.svg",
        faviconUrl: "/assets/images/favicon.svg",
        pwaIcon192: "/assets/images/bnr-logo.png",
        pwaIcon512: "/assets/images/bnr-logo.png"
    },
    pageTitles: {
        login: "Masuk ke Layanan — BNR",
        dashboard: "Beranda Nasabah — BNR",
        transfer: "Transfer Saldo — BNR",
        mutasi: "Mutasi Rekening — BNR",
        qris: "Pembayaran QRIS — BNR",
        topup: "Pengajuan Top Up — BNR",
        kartu: "Kartu Virtual Debit — BNR",
        notifikasi: "Pusat Notifikasi — BNR",
        profil: "Profil Pengguna — BNR",
        admin: "Super Admin Portal — BNR"
    },
    theme: {
        defaultMode: "dark",
        brandColor: "#CC0000",
        darkColor: "#0F172A"
    }
};

(function() {
    const THEME_KEY = 'bnr_theme';

    // Apply saved theme or default to dark
    function getPreferredTheme() {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved) return saved;
        return (window.BNR_CONFIG && window.BNR_CONFIG.theme && window.BNR_CONFIG.theme.defaultMode) || 'dark';
    }

    function applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem(THEME_KEY, theme);
        updateThemeButtons(theme);
    }

    function toggleTheme() {
        const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
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
