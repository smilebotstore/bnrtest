/**
 * BNR (Bank Nusantara Roblox) — Frontend Global Configuration
 * 
 * Di sini Anda dapat mengonfigurasi branding, link aset gambar, icon, logo, favicon,
 * dan judul halaman. Anda bebas menggunakan path lokal (misal: /assets/...) atau
 * link URL eksternal (misal: https://imgur.com/... atau https://cdn.example.com/...).
 */
window.BNR_CONFIG = {
    appName: "BNR",
    bankName: "Bank Nusantara Roblox",
    tagline: "Virtual Banking System",
    
    // Konfigurasi Branding & Aset Gambar
    branding: {
        // Logo utama di navbar, splash screen & login
        // Bisa berupa path lokal ("/assets/images/bnr-logo.svg") atau URL eksternal ("https://...")
        logoUrl: "/assets/images/bnr-logo.svg",
        
        // Cadangan lokal jika link logo eksternal tidak dapat dimuat
        fallbackLogo: "/assets/images/bnr-logo.svg",
        
        // Favicon / Icon Tab Browser
        faviconUrl: "/assets/images/favicon.svg",

        // Ikon aplikasi PWA
        pwaIcon192: "/assets/images/bnr-logo.png",
        pwaIcon512: "/assets/images/bnr-logo.png"
    },

    // Judul (Title) di Setiap Halaman
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

    // Pengaturan Tampilan Default
    theme: {
        defaultMode: "dark", // "dark" atau "light"
        brandColor: "#CC0000",
        darkColor: "#0F172A"
    }
};
