# BNR (Bank Nusantara Roblox) — Implementation Plan: Backend, Keamanan, Routing Halaman, & Bug Fix

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun arsitektur backend lengkap berbasis Node.js/Express & Netlify Serverless Functions, memindahkan semua kredensial sensitif ke `.env` dan `config.js`, merestrukturisasi frontend menjadi sistem multi-page dengan routing bersih (1 file 1 halaman), memperbaiki bug aset logo BNR yang hilang, serta melakukan pengujian keamanan (Strix) dan fungsional (Google Chrome DevTools MCP).

**Architecture:** Arsitektur Serverless Hybrid yang kompatibel untuk eksekusi lokal (Node.js/Express) dan deployment Netlify (Netlify Functions + static rewrite). Seluruh komunikasi basis data (Firebase Admin / Realtime Database) dan integrasi eksternal (Discord Webhook) diisolasi di sisi server. Frontend berkomunikasi dengan backend melalui REST API yang diamankan dengan JWT / Session, tanpa ada API key atau rahasia yang bocor ke browser / F12 DevTools.

**Tech Stack:** 
- Backend: Node.js, Express, `serverless-http`, Firebase Admin SDK, `dotenv`, `bcryptjs`, `jsonwebtoken`, `cors`
- Frontend: HTML5, Tailwind CSS, Lucide Icons, SweetAlert2, Modular Vanilla JS (1 page 1 script), Service Worker (PWA)
- Deployment: Netlify Static + Netlify Functions (`netlify.toml`)
- Testing & Security: Strix (API & AppSec vulnerability scanning), Google Chrome DevTools MCP (Functional, UI, & Network leak inspection)

---

## 1. Analisis Celah Keamanan & Bug yang Ditemukan (Root Cause)

1. **Kebocoran Kredensial Sensitif di Frontend (`script.js`):**
   - Firebase Client Config (API Key `AIzaSy...`, Project ID `absensi-polri`, Database URL) diekspos langsung di client.
   - Master Super Admin (`Haruukii79` dengan password `Dharmawijaya1998#`) di-hardcode dalam file script JavaScript frontend.
   - Discord Webhook URL (`https://discord.com/api/webhooks/1569346065705209886/...`) diekspos di client, memungkinkan pihak luar menyalahgunakan atau melakukan spam webhook.
   - Transaksi transfer dan manipulasi saldo dieksekusi langsung dari client melalui Firebase Web SDK tanpa validasi hak akses dari backend. Siapa pun dapat membuka console F12 dan mengubah saldo akun mereka sendiri.

2. **Penyebab Bug Logo Tidak Muncul (Huruf "BNR" dengan background merah):**
   - URL logo di `index.html` dan `manifest.json` menggunakan tautan Discord CDN (`https://cdn.discordapp.com/attachments/...`).
   - Discord menerapkan kebijakan baru di mana semua link attachment memiliki batas kadaluarsa (*expiry timestamp* `?ex=...`). Ketika link kadaluarsa, Discord mengembalikan respon HTTP 404 Not Found.
   - Tag `<img>` di frontend memiliki fallback `onerror="this.src='https://via.placeholder.com/150/990000/FFFFFF?text=BNR'"`. Akibatnya, browser menampilkan gambar placeholder darurat berupa kotak merah bertuliskan "BNR".

3. **Penyebab Bug Dot Merah Notifikasi Tidak Hilang Saat Diklik:**
   - Di `script.js` fungsi `renderNotificationsView()`, sistem hanya merender daftar notifikasi tanpa pernah memanggil fungsi update status `read: true` ke database.
   - Realtime listener memeriksa `if (!n.read) unread = true;`, karena statusnya tidak pernah diubah menjadi `read: true`, badge merah (`unreadNotifBadge`) tetap muncul terus-menerus.
   - Solusi: Sediakan endpoint `POST /api/notifications/mark-read` di backend dan panggil otomatis saat halaman/modal notifikasi dibuka, sehingga dot merah langsung hilang.

4. **Struktur Monolitik Tanpa Halaman / Routing:**
   - Semua tampilan (login, dashboard, transfer, mutasi, qr, top up, kartu virtual, notifikasi, profil, admin) ditumpuk dalam satu file HTML dan satu script raksasa (1.490 baris).
   - Tidak ada pemisahan halaman yang terstruktur (1 file 1 halaman) sehingga navigasi tidak modular dan sulit dikelola.

---

## 2. Rencana Arsitektur & Struktur Direktori Baru

```
bnrv2/
├── .env                          # Kredensial rahasia (diabaikan oleh git)
├── .env.example                  # Template variabel lingkungan
├── .gitignore                    # Mengabaikan node_modules, .env, log
├── config.js                     # Loader konfigurasi terpusat backend (secrets & server settings)
├── package.json                  # Dependensi backend & scripts
├── netlify.toml                  # Konfigurasi hosting & fungsi Netlify
├── server.js                     # Server Express lokal (pengembangan & testing)
│
├── netlify/
│   └── functions/
│       └── api.js                # Handler Serverless Netlify Functions (Express via serverless-http)
│
├── backend/
│   ├── config/
│   │   └── firebase.js           # Inisialisasi Firebase Admin SDK secara aman
│   ├── middleware/
│   │   ├── auth.js               # Verifikasi token JWT & Role Guard (CUSTOMER vs SUPER_ADMIN)
│   │   └── rateLimiter.js        # Perlindungan anti brute-force & spam
│   ├── controllers/
│   │   ├── authController.js     # Login, registrasi akun, verifikasi sesi
│   │   ├── accountController.js  # Ambil data akun, saldo, ganti nama
│   │   ├── transactionController.js # Transfer atomik, mutasi, validasi limit
│   │   ├── adminController.js    # Buat user, ubah saldo, approve top-up, audit log
│   │   └── settingsController.js # Maintenance mode toggle, system config
│   ├── services/
│   │   └── discordService.js     # Pengiriman log transaksi via Webhook aman
│   └── routes/
│       ├── authRoutes.js
│       ├── accountRoutes.js
│       ├── transactionRoutes.js
│       └── adminRoutes.js
│
└── public/                       # Frontend statis publik (dapat diakses user)
    ├── assets/
    │   ├── images/
    │   │   ├── bnr-logo.svg      # Logo vektor modern Bank Nusantara Roblox
    │   │   ├── bnr-logo.png      # Logo bitmap resolusi tinggi untuk PWA/icon
    │   │   └── favicon.ico       # Favicon browser default
    │   └── css/
    │       └── style.css         # Styling custom BNR
    ├── js/
    │   ├── config.js             # Konfigurasi frontend publik (link aset, logo, favicon, title web)
    │   ├── api.js                # Klien HTTP terpadu ke backend (/api/...)
    │   ├── auth-guard.js         # Pengecekan sesi & redirect otomatis jika belum login
    │   ├── components.js         # Header, sidebar & navigasi bersama (auto-set title & favicon)
    │   └── sw.js                 # Service worker untuk offline & caching aset
    ├── pages/
    │   ├── login.html            # Halaman Autentikasi / Masuk
    │   ├── dashboard.html        # Halaman Beranda & Ringkasan Rekening
    │   ├── transfer.html         # Halaman Transfer Antar Rekening
    │   ├── mutasi.html           # Halaman Riwayat Transaksi & Filter
    │   ├── qris.html             # Halaman Pembayaran QRIS BNR
    │   ├── topup.html            # Halaman Pengajuan Top Up Saldo
    │   ├── kartu.html            # Halaman Kartu Virtual Debit BNR
    │   ├── notifikasi.html       # Halaman Notifikasi Pengguna
    │   ├── profil.html           # Halaman Profil & Ganti Nama Akun
    │   └── admin.html            # Halaman Super Admin Panel
    ├── index.html                # Entry point (auto-route ke dashboard/login)
    └── manifest.json             # PWA Manifest dengan ikon lokal
```

---

## 3. Tahapan Implementasi Terperinci (Bite-Sized Tasks)

### Task 1: Setup Lingkungan, Git, & Manajemen Kredensial (.env & config.js)
**Tujuan:** Mengisolasi kredensial rahasia dan menyiapkan konfigurasi terpusat baik di backend maupun frontend.
- [ ] Inisialisasi Git repository dan file `.gitignore` (abaikan `.env`, `node_modules`).
- [ ] Buat file `.env` dengan variabel rahasia:
  - `PORT=3000`
  - `JWT_SECRET=<random-strong-secret>`
  - `FIREBASE_PROJECT_ID=absensi-polri`
  - `FIREBASE_DATABASE_URL=https://absensi-polri-default-rtdb.asia-southeast1.firebasedatabase.app`
  - `FIREBASE_CLIENT_EMAIL=...`
  - `FIREBASE_PRIVATE_KEY=...`
  - `DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...`
  - `ADMIN_USERNAME=Haruukii79`
  - `ADMIN_PASSWORD=Dharmawijaya1998#`
- [ ] Buat file `.env.example` sebagai referensi aman tanpa secret.
- [ ] Buat `config.js` di root/backend yang memvalidasi ketersediaan variabel `.env` menggunakan `dotenv`.
- [ ] Buat `public/js/config.js` untuk frontend:
  - Berisi konfigurasi branding publik (link aset gambar/logo, URL favicon, format default page title, nama aplikasi, link media sosial).
  - Memungkinkan Anda mengganti URL logo, icon, dan favicon cukup dari satu file `config.js` tanpa menyentuh pengaturan di Netlify.

### Task 2: Pembuatan Aset Logo BNR Permanen & Pemulihan Visual (Fix Bug Tampilan)
**Tujuan:** Menghilangkan ketergantungan pada Discord CDN yang sudah 404 dan menghilangkan fallback placeholder merah "BNR".
- [ ] Buat logo vektor SVG profesional beresolusi tinggi (`public/assets/images/bnr-logo.svg`) dengan lambang perbankan modern Bank Nusantara Roblox (perisai emas/merah tua, inisial BNR elegan, ornamen khas perbankan nusantara).
- [ ] Generate versi PNG (`public/assets/images/bnr-logo.png`) untuk ukuran 192x192 dan 512x512 untuk PWA.
- [ ] Perbarui `manifest.json` agar mengarah ke ikon lokal `/assets/images/bnr-logo.png`.
- [ ] Uji rendering logo secara visual di browser untuk memastikan tidak ada lagi error 404 atau kotak placeholder merah.

### Task 3: Pembangunan Core Backend API (Express & Netlify Serverless Functions)
**Tujuan:** Menyediakan endpoint API yang aman untuk menggantikan seluruh operasi langsung ke Firebase dari client.
- [ ] Inisialisasi `package.json` dengan dependensi: `express`, `cors`, `dotenv`, `jsonwebtoken`, `bcryptjs`, `serverless-http`, `firebase-admin`, `express-rate-limit`.
- [ ] Buat `backend/config/firebase.js` untuk menginisialisasi Firebase Admin SDK di backend.
- [ ] Buat service `backend/services/discordService.js` untuk mengirim notifikasi log transaksi ke Discord Webhook dari server (URL rahasia aman di server).
- [ ] Buat middleware `backend/middleware/auth.js` untuk memverifikasi JWT dan role user (`CUSTOMER` vs `SUPER_ADMIN`).
- [ ] Implementasikan endpoint Authentication:
  - `POST /api/auth/login` (verifikasi kredensial, buat JWT token)
  - `GET /api/auth/me` (ambil profil sesi user yang sedang aktif)
  - `POST /api/auth/logout` (bersihkan sesi)
- [ ] Implementasikan endpoint Rekening & Transaksi:
  - `GET /api/account/details` (ambil nomor rekening, saldo, status)
  - `POST /api/transactions/transfer` (eksekusi transfer atomik server-side dengan validasi saldo, limit harian, biaya admin, dan kirim discord webhook)
  - `GET /api/transactions/history` (ambil riwayat mutasi transaksi)
  - `POST /api/account/change-name` (ganti nama rekening dengan pemotongan biaya admin)
  - `POST /api/account/topup-request` (pengajuan top up saldo)
  - `GET /api/notifications` (ambil notifikasi pengguna)
  - `POST /api/notifications/mark-read` (tandai notifikasi telah dibaca & hilangkan dot merah)
- [ ] Implementasikan endpoint Admin:
  - `GET /api/admin/overview` (statistik total saldo, pengguna aktif, transaksi)
  - `GET /api/admin/users` (daftar nasabah)
  - `POST /api/admin/users/create` (buat rekening baru)
  - `POST /api/admin/users/toggle-status` (suspend / aktifkan user)
  - `POST /api/admin/users/adjust-balance` (ubah saldo nasabah dengan audit log)
  - `GET /api/admin/topups` (daftar pengajuan top up pending)
  - `POST /api/admin/topups/approve` (setujui top up secara atomik)
  - `GET /api/admin/audit-logs` (ambil log audit keamanan)
  - `POST /api/admin/settings/maintenance` (toggle status pemeliharaan sistem)
- [ ] Buat `server.js` untuk pengujian lokal (`node server.js` / port 3000).
- [ ] Buat `netlify/functions/api.js` membungkus Express app menggunakan `serverless-http`.
- [ ] Buat `netlify.toml` untuk konfigurasi build, static hosting `public`, dan redirect `/api/*` ke function.

### Task 4: Modularisasi Frontend, Routing Halaman (1 File 1 Page), & Fitur Dark Mode
**Tujuan:** Memecah monolitik `index.html` dan `script.js` menjadi struktur halaman terpisah dengan routing yang bersih, mendukung dark mode yang konsisten, dan mobile parity penuh.
- [ ] Buat modul bersama:
  - `public/js/config.js`: Konfigurasi branding terpusat (URL logo eksternal/lokal, fallback logo, favicon, page title, dsb).
  - `public/js/theme.js`: Pengelola Dark Mode & Light Mode (persisten di `localStorage`, sinkronisasi class `dark`, dan toggle responsif).
  - `public/js/api.js`: Wrapper request HTTP (`fetch`) dengan penambahan header `Authorization: Bearer <token>` otomatis dan penanganan error terpusat.
  - `public/js/auth-guard.js`: Memastikan halaman privat hanya dapat dibuka jika user telah login (redirect ke `/login` jika unauthenticated).
  - `public/js/components.js`: Me-render sidebar desktop, topbar, mobile bottom navigation, dan mobile drawer secara dinamis.
- [ ] Fitur Dark Mode & Penempatan Tombol:
  - Posisi tombol Dark Mode desktop: Diletakkan persis di **bawah tombol profil user** pada sidebar samping desktop.
  - Posisi tombol Dark Mode mobile: Diletakkan di **mobile drawer di bawah profil user**.
  - Style tema: Dark slate / midnight palette (`#0F172A`, `#1E293B`) dengan aksen merah BNR (`#CC0000`).
- [ ] Mobile Parity & Active State Navigasi:
  - Di PC, menu aktif memiliki background/teks warna merah BNR.
  - Tambahkan active state warna merah yang sama pada navigasi mobile (bottom bar & mobile drawer) saat halaman tersebut sedang aktif.
  - Pastikan semua fitur di PC berjalan responsif dan ringan di mobile tanpa lag.
- [ ] Pecah halaman ke dalam file terpisah:
  - `public/pages/login.html` (Form login elegan dengan validasi input)
  - `public/pages/dashboard.html` (Ringkasan saldo, aksi cepat, mutasi terkini)
  - `public/pages/transfer.html` (Form transfer, cek rekening tujuan, modal konfirmasi, struk digital)
  - `public/pages/mutasi.html` (Daftar transaksi lengkap, filter rentang tanggal dan jenis debet/kredit)
  - `public/pages/qris.html` (Tampilan QR Code statis / dinamis & simulasi bayar)
  - `public/pages/topup.html` (Form pengajuan top-up saldo dan daftar pengajuan user)
  - `public/pages/kartu.html` (Visualisasi kartu debit virtual BNR bergradasi mewah dengan nomor kartu dan CVV terlindungi)
  - `public/pages/notifikasi.html` (Daftar notifikasi transaksi & sistem)
  - `public/pages/profil.html` (Detail akun, pengaturan profil, dan fitur ganti nama berbayar)
  - `public/pages/admin.html` (Portal super admin dengan tab manajemen nasabah, verifikasi top-up, audit log, dan mode maintenance)
- [ ] Buat `public/index.html` sebagai router awal yang langsung mengarahkan user ke `/dashboard` jika sudah login atau `/login` jika belum.

### Task 5: Testing Fungsional & Tampilan dengan Chrome DevTools MCP
**Tujuan:** Menguji seluruh alur kerja aplikasi secara langsung di browser headless/interactive menggunakan Chrome DevTools MCP.
- [ ] Buka halaman `login.html` dan verifikasi bahwa tampilan render sempurna tanpa error console.
- [ ] Verifikasi bahwa logo BNR tampil dengan tajam di semua halaman (tidak ada gambar 404 / kotak merah).
- [ ] Uji alur login:
  - Login nasabah biasa
  - Login super admin (`Haruukii79`)
- [ ] Uji alur transaksi:
  - Cek saldo
  - Eksekusi transfer saldo antar rekening
  - Verifikasi perubahan saldo di pengirim dan penerima
  - Verifikasi struk digital
- [ ] Uji fitur Admin:
  - Masuk ke admin portal
  - Buka audit log
  - Setujui top up
- [ ] Uji PWA & Responsivitas Mobile (melalui Chrome DevTools emulation viewport smartphone).

### Task 6: Audit Keamanan Mendalam (Strix API & Code Pentest)
**Tujuan:** Membuktikan bahwa tidak ada lagi kredensial yang bocor dan seluruh celah OWASP telah ditutup.
- [ ] Jalankan audit kode Strix untuk memindai kebocoran kredensial (F12 check: periksa Network Tab dan Source Files di browser, pastikan tidak ada Firebase API Key, databaseURL, admin password, atau discord webhook URL yang dapat dilihat oleh pengunjung website).
- [ ] Uji keamanan API terhadap Broken Object Level Authorization (BOLA/IDOR): pastikan nasabah A tidak bisa melihat mutasi atau memotong saldo nasabah B tanpa izin.
- [ ] Uji otorisasi Super Admin: pastikan endpoint admin menolak request dari role `CUSTOMER` dengan status HTTP 403 Forbidden.
- [ ] Uji perlindungan rate limiting untuk mencegah brute-force login.

---

## 4. Kriteria Keberhasilan (Definition of Done)
1. **Zero Secret Leakage:** Tidak ada satu pun rahasia (Firebase API key, DB URL, password admin, webhook URL) yang terlihat di F12 / DevTools browser.
2. **Logo Fixed:** Logo BNR tampil jelas dan profesional di header, splash screen, sidebar, dan favicon tanpa dependensi Discord CDN atau error merah.
3. **Clean Routing & 1 Page 1 File:** Setiap fitur memiliki halaman HTML dan logika yang terpisah rapi di folder `public/pages/`.
4. **Backend Berfungsi Penuh:** Server Express & Netlify Functions mengelola semua transaksi secara atomik dan aman.
5. **Verifikasi Teruji:** Seluruh skenario berhasil diuji dan diverifikasi menggunakan Chrome DevTools MCP dan Strix.
