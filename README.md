# Got — بوابة الأهداف ⚽

منصة الكشافة الكروية التي تربط اللاعبين بالأندية الموثقة حول العالم.



---

## 🚀 Live Deployment (Netlify)

Deploy directly from this repo. The `netlify.toml` is already configured.

1. Connect your GitHub repo to Netlify
2. Set **Publish directory** to `.` (root)
3. No build command needed
4. Deploy ✓

---

## 🔐 Login Credentials

### Admin Panel
| Field | Value |
|-------|-------|
| URL | `/admin-login.html` |
| Email | `admin@got.com` |
| Password | `admin123` |
| Access Key | `got2025` |

### Demo Player (create your own)
- Go to `/player/register.html` and register a new account

### Demo Club (create your own)
- Go to `/club/register.html` and register a new club
- Clubs are **auto-verified** in demo mode — no admin approval needed

---

## 📁 Project Structure

```
Football-/
├── index.html                  # Landing page (home)
├── login.html                  # Login for players & clubs
├── admin-login.html            # Admin panel login
├── netlify.toml                # Netlify hosting config
│
├── player/
│   ├── register.html           # Player registration (3-step)
│   ├── dashboard.html          # Player dashboard
│   ├── profile.html            # Player profile builder
│   └── view.html               # Public player profile (for clubs)
│
├── club/
│   ├── register.html           # Club registration
│   ├── dashboard.html          # Club dashboard + player search
│   └── pending.html            # Awaiting verification page
│
├── admin/
│   └── dashboard.html          # Admin panel
│
├── css/
│   ├── variables.css           # Design tokens (colors, spacing, fonts)
│   ├── base.css                # Reset, typography, utilities
│   ├── components.css          # Reusable UI components
│   └── pages/
│       ├── landing.css         # Home page styles
│       ├── auth.css            # Login/register pages
│       ├── dashboard.css       # Dashboard layout
│       └── profile.css         # Player profile styles
│
└── js/
    ├── storage.js              # ⭐ localStorage API layer (replaces PHP)
    ├── components.js           # Navbar, modals, toasts, shared UI
    ├── auth.js                 # Login & registration logic
    ├── player.js               # Player dashboard & profile builder
    ├── club.js                 # Club dashboard & player search
    └── admin.js                # Admin panel logic
```

---

## ⚙️ How It Works

### Data Storage (`js/storage.js`)
Since Netlify only serves static files (no PHP/Node.js backend), all data is stored in the browser's `localStorage` via a custom API layer:

- `GOG_DB` — localStorage wrapper with CRUD methods
- `GOG_API` — mimics every PHP endpoint in pure JavaScript
- `apiRequest()` — overrides the fetch-based version; routes calls to `GOG_API`
- `requireAuth()` — checks `localStorage` session instead of calling the server

**localStorage keys:**
| Key | Contents |
|-----|----------|
| `gog:users` | All registered users (email, password, role) |
| `gog:session` | Current logged-in user |
| `gog:players` | Player profiles with skills, career, videos |
| `gog:clubs` | Club profiles with verification status |
| `gog:requests` | Contact requests between clubs and players |
| `gog:saved` | Club's saved/shortlisted players |
| `gog:views` | Profile view counts |

### Admin User Seed
An admin user is automatically created on first page load:
- **Email:** `admin@got.com`
- **Password:** `admin123`

---

## 🌐 Pages Overview

| Page | URL | Who |
|------|-----|-----|
| Home | `/index.html` | Everyone |
| Login | `/login.html` | Players & Clubs |
| Player Register | `/player/register.html` | New players |
| Player Dashboard | `/player/dashboard.html` | Logged-in players |
| Profile Builder | `/player/profile.html` | Logged-in players |
| Player Profile | `/player/view.html?id=...` | Logged-in clubs |
| Club Register | `/club/register.html` | New clubs |
| Club Dashboard | `/club/dashboard.html` | Verified clubs |
| Club Pending | `/club/pending.html` | Unverified clubs |
| Admin Login | `/admin-login.html` | Admins only |
| Admin Dashboard | `/admin/dashboard.html` | Admins only |

---

## 🎨 Design System

- **Primary font:** Cairo (Arabic)
- **Display font:** Bebas Neue (logo/headings)
- **Gold accent:** `#D4AF37`
- **Background:** `#0A0A0A` (near-black)
- **RTL layout:** `dir="rtl" lang="ar"` on all pages

---

## 📱 Features

- ✅ Full Arabic RTL interface
- ✅ Player profile builder (photo, bio, skills, career history, videos)
- ✅ Club player search with filters (position, nationality, foot, age)
- ✅ Contact request system (club → player, accept/decline)
- ✅ Save/shortlist players
- ✅ Admin verification panel
- ✅ PDF export of player profile (`window.print()`)
- ✅ Works 100% offline / no backend required
- ✅ Netlify-ready (static hosting)

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML, CSS, JavaScript |
| Storage | Browser `localStorage` |
| Fonts | Google Fonts (Cairo, Bebas Neue) |
| Hosting | Netlify (static) |
| Auth | Session stored in `localStorage` |

---

## ⚠️ Notes

- Data is **browser-local** — clearing browser storage will erase all data
- Photos and videos are stored as **base64 Data URLs** in localStorage — large files may approach storage limits (~5MB)
- For a production version, replace `js/storage.js` with real API calls to a PHP/Node.js backend
