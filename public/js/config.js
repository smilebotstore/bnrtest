/**
 * BNR (Bank Nusantara Roblox) — Frontend Global Configuration
 * 
 * Di file ini Anda dapat dengan mudah mengonfigurasi branding, link logo, icon, favicon,
 * nama aplikasi, serta judul halaman.
 * Anda dapat menggunakan path lokal (misal: "/assets/images/favicon.svg") atau
 * link URL eksternal langsung (misal: "https://...").
 */
window.BNR_CONFIG = {
    appName: "BNR",
    bankName: "Bank Nusantara Roblox",
    tagline: "Virtual Banking System",
    
    // Konfigurasi Branding, Logo & Favicon
    branding: {
        // Logo utama di navbar, splash screen & login
        // Bisa path lokal ("/assets/images/bnr-logo.svg") atau link URL eksternal ("https://...")
        logoUrl: "/assets/images/bnr-logo.svg",
        
        // Cadangan lokal jika link logo eksternal gagal dimuat
        fallbackLogo: "/assets/images/bnr-logo.svg",
        
        // Favicon / Icon Tab Browser (Bisa diganti ke link icon Anda sendiri)
        faviconUrl: "/assets/images/favicon.svg",

        // Ikon aplikasi PWA / Home Screen
        pwaIcon192: "/assets/images/bnr-logo.png",
        pwaIcon512: "/assets/images/bnr-logo.png"
    },

    // Judul (Title) di Setiap Halaman Tab Browser
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

    // Pengaturan Tampilan & Tema Default
    theme: {
        defaultMode: "dark", // "dark" atau "light"
        brandColor: "#CC0000",
        darkColor: "#0F172A"
    }
};
