# Tutorial Setup — Obsidiantask (Fase 0)

Panduan lengkap untuk menyiapkan plugin Obsidiantask: verifikasi plugin di vault test, lalu membuat OAuth credential Google Tasks.

> Disusun berdasarkan dokumentasi resmi Google:
> - OAuth 2.0 for iOS & Desktop Apps: developers.google.com/identity/protocols/oauth2/native-app
> - Refresh token expiration: developers.google.com/identity/protocols/oauth2

---

## Bagian 0 — Aktifkan plugin di vault test

Plugin sudah ter-copy ke vault `cloud-relay-test`. Yang perlu dilakukan manual:

1. Buka Obsidian → ganti vault ke **cloud-relay-test**
   (vault utama tidak disentuh — jangan install plugin dev di vault yang di-sync)
2. Buka **Settings** (ikon gear) → **Community plugins**
3. Kalau muncul "Restricted mode" → klik **Turn on community plugins**
4. Di bagian **Installed plugins**, aktifkan toggle **Obsidiantask**
5. Verifikasi:
   - Tekan `Cmd+P` → ketik `Obsidiantask` → harus muncul command **"Obsidiantask: Open Obsidiantask"**
   - Jalankan command-nya — belum terjadi apa-apa (normal; panel UI baru dibangun di Fase 1)
   - Buka console `Cmd+Opt+I` → tab Console → pastikan tidak ada error merah saat toggle ON

Kalau ada error: salin pesan errornya untuk diperbaiki sebelum lanjut.

---

## Bagian A — Google Cloud Console: buat project & aktifkan API

1. Buka https://console.cloud.google.com/ → login dengan **akun Google yang Google Tasks-nya mau dipakai**
2. Buat project baru:
   - Klik **project selector** di top bar (di sebelah logo Google Cloud)
   - Klik **New project**
   - Project name: `obsidiantask`
   - Organization: **No organization** (akun pribadi)
   - Klik **Create**, tunggu ~15 detik, lalu klik notifikasi / pilih project di selector
3. Aktifkan Google Tasks API:
   - Buka langsung: https://console.cloud.google.com/apis/library/tasks.googleapis.com
   - Pastikan top bar menampilkan project `obsidiantask` (bukan project lain)
   - Klik **Enable**, tunggu sampai selesai

Kenapa perlu: tanpa API di-enable, semua request plugin ke Google Tasks akan ditolak `403`.

---

## Bagian B — OAuth consent screen

1. Menu ☰ (kiri atas) → **APIs & Services** → **OAuth consent screen**
   (di console versi baru namanya bisa **Google Auth Platform** → **Get started**)
2. **User type**: pilih **External** → Create
   - Kenapa External: tipe "Internal" hanya untuk akun Google Workspace (berbayar/organisasi); akun `@gmail.com` biasa wajib External.
3. Isi form (versi console bisa sedikit beda urutannya):
   - **App name**: `Obsidiantask`
   - **User support email**: email kamu
   - **App logo / home page**: skip, tidak perlu
   - **Audience**: External
   - **Contact information**: email kamu
4. **Scopes**: bisa **skip** — plugin meminta scope sendiri saat login
   (`https://www.googleapis.com/auth/tasks`)
5. **Test users** — LANGKAH PALING PENTING:
   - Klik **+ Add users** → masukkan **email Google kamu** → Save
   - Tanpa ini, login akan ditolak dengan error `403: access_denied`
6. Selesai → status app harus **"Testing"**
   - JANGAN klik "Publish app" — itu memicu proses verifikasi Google (belum diperlukan untuk pakai sendiri)

---

## Bagian C — Buat OAuth Client ID

1. **APIs & Services** → **Credentials** → **+ Create Credentials** → **OAuth client ID**
   (atau Google Auth Platform → tab **Clients** → **Create client**)
2. **Application type: Desktop app** ← PENTING, jangan pilih "Web application"
   - Ini standar resmi Google untuk aplikasi ter-install (dokumen "OAuth for iOS & Desktop Apps": loopback redirect → "Set the application type to **Desktop app**").
   - Keunggulannya: redirect ke `http://127.0.0.1:PORT` **dengan port acak otomatis diizinkan** — tidak perlu mengisi daftar redirect URI sama sekali.
   - Tipe "Web application" akan menolak port acak → error `redirect_uri_mismatch`.
3. **Name**: `Obsidiantask` → **Create**
4. Muncul popup **Client ID** dan **Client Secret**:
   - Klik ikon **download JSON** untuk menyimpan keduanya, atau copy manual
5. Simpan di tempat aman (password manager / catatan lokal):
   - JANGAN commit ke repo
   - JANGAN paste ke chat / issue / screenshot
   - Untuk tipe Desktop, Google tidak menganggap client secret sebagai rahasia mutlak, tapi tetap jangan disebar

Yang dibutuhkan plugin nanti (Fase 0.3): **Client ID** + **Client Secret** saja.

---

## Bagian D — Perilaku mode Testing (harus dipahami sejak awal)

### 1. Layar "Google hasn't verified this app"

Saat login pertama, Google menampilkan peringatan karena app belum diverifikasi.
Ini NORMAL untuk app mode Testing:

> Klik **Advanced** → **Go to Obsidiantask (unsafe)** → lanjut centang izin → **Continue**

"Unsafe" di sini bukan berarti berbahaya — hanya artinya Google belum meninjau app-nya. App-nya milik kamu sendiri.

### 2. Refresh token kedaluwarsa 7 hari

Ini aturan resmi Google (dokumen "Refresh token expiration"):

> Project dengan consent screen External + status "Testing" mendapat refresh token yang **kedaluwarsa dalam 7 hari** — kecuali scope-nya hanya profil/email. Scope Tasks tidak termasuk pengecualian.

Efeknya untuk kamu: **sekitar sekali seminggu, plugin akan minta login ulang.** Itu bukan bug plugin — itu batasan mode Testing.

Pilihan ke depan (keputusan Fase 3, tidak sekarang):
- Terima login ulang mingguan (cukup untuk penggunaan pribadi/dev), atau
- Publish app ke production → refresh token permanen, tapi wajib verifikasi Google karena scope Tasks tergolong sensitive scope (proses berkas + demo, bisa lama)

### 3. Scope yang diminta plugin

Hanya satu: `https://www.googleapis.com/auth/tasks` — read/write Google Tasks.
Plugin TIDAK bisa (dan tidak meminta) akses ke Gmail, Drive, Calendar, Contact, dsb.

### 4. Mencabut akses kapan saja

https://myaccount.google.com/permissions → cari "Obsidiantask" → **Remove access**.
(Plugin juga akan menyediakan tombol Disconnect yang otomatis mencabut token.)

### 5. Limit token

Google membatasi 100 refresh token per akun per client ID — token terlama otomatis mati kalau lewat.
Praktisnya tidak akan masalah untuk pemakaian normal.

---

## Bagian E — Setelah setup ini (Fase 0.3, dikerjakan agent)

Yang diimplementasikan di plugin:

1. Settings tab: field **Client ID** + **Client Secret** + tombol **Connect** / **Disconnect**
2. Flow Connect:
   - Plugin menyalakan HTTP server mini di `127.0.0.1:<port acak>`
   - Browser default terbuka ke halaman izin Google (dengan PKCE + state anti-CSRF sesuai rekomendasi Google)
   - Kamu login + centang izin → Google mengarahkan balik ke `127.0.0.1` → plugin menangkap code → browser menampilkan "kembali ke Obsidian"
   - Plugin menukar code dengan token → status **Connected**
3. Flow Disconnect: cabut token di server Google + hapus token lokal

Kriteria selesai Fase 0 (Definition of Done): connect, callback sukses, cancel/timeout, refresh, disconnect, dan token invalid/revoked — semua teruji; build + typecheck + test lulus.

---

## Troubleshooting

| Gejala | Penyebab | Solusi |
|---|---|---|
| `redirect_uri_mismatch` | Client dibuat dengan tipe **Web application**, atau port terdaftar tetap | Buat ulang client dengan tipe **Desktop app** |
| `403: access_denied` saat login | Email belum ditambahkan sebagai **Test user** | OAuth consent screen → Test users → add email kamu |
| `invalid_client` saat exchange | Client ID / Secret salah, atau beda project | Cek ulang credential dari halaman Clients |
| Layar "unverified app" | Normal di mode Testing | Advanced → Go to Obsidiantask (unsafe) |
| `invalid_grant` saat refresh setelah ±7 hari | Refresh token Testing kedaluwarsa (Bagian D.2) | Connect ulang — memang begitu aturannya |
| Request API balas `403` SERVICE_DISABLED | Google Tasks API belum di-enable di project | Ulangi Bagian A langkah 3 |
| Plugin tidak muncul di Community plugins | Artifacts belum ada / versi manifest beda | Cek `.obsidian/plugins/obsidiantask/` berisi `main.js` + `manifest.json` |

---

Terakhir diperbarui: 2026-09-29 — diverifikasi terhadap dokumentasi Google per tanggal itu.
