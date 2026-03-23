/**
 * GOG — localStorage API Layer
 * Replaces all PHP backend calls with browser storage.
 * Works on any static host (Netlify, GitHub Pages, etc.)
 */

'use strict';

/* ═══════════════════════════════════════
   DATABASE — localStorage wrapper
   ═══════════════════════════════════════ */
const GOG_DB = {
  K: {
    USERS:    'gog:users',
    SESSION:  'gog:session',
    PLAYERS:  'gog:players',
    CLUBS:    'gog:clubs',
    REQUESTS: 'gog:requests',
    SAVED:    'gog:saved',
    VIEWS:    'gog:views',
  },

  _get(key)        { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  _set(key, val)   { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) { console.warn('Storage full', e); } },
  _list(key)       { return this._get(key) || []; },
  _uid()           { return '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); },

  /* ── Users ── */
  getUsers()             { return this._list(this.K.USERS); },
  _saveUsers(u)          { this._set(this.K.USERS, u); },
  findUserByEmail(email) { return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase()); },
  getUserById(id)        { return this.getUsers().find(u => u.id === id); },
  addUser(user) {
    const users = this.getUsers();
    user.id = this._uid();
    user.created_at = new Date().toISOString();
    users.push(user);
    this._saveUsers(users);
    return user;
  },

  /* ── Session ── */
  getSession()    { return this._get(this.K.SESSION); },
  setSession(u)   {
    const safe = { id: u.id, email: u.email, role: u.role, full_name: u.full_name || '' };
    this._set(this.K.SESSION, safe);
    return safe;
  },
  clearSession()  { localStorage.removeItem(this.K.SESSION); },

  /* ── Players ── */
  getPlayers()            { return this._list(this.K.PLAYERS); },
  _savePlayers(arr)       { this._set(this.K.PLAYERS, arr); },
  getPlayerByUserId(uid)  { return this.getPlayers().find(p => p.user_id === uid); },
  getPlayerById(id)       { return this.getPlayers().find(p => p.id === id); },
  upsertPlayer(player) {
    const arr = this.getPlayers();
    const i   = arr.findIndex(p => p.id === player.id);
    if (i >= 0) arr[i] = player; else arr.push(player);
    this._savePlayers(arr);
  },

  /* ── Clubs ── */
  getClubs()           { return this._list(this.K.CLUBS); },
  _saveClubs(arr)      { this._set(this.K.CLUBS, arr); },
  getClubByUserId(uid) { return this.getClubs().find(c => c.user_id === uid); },
  getClubById(id)      { return this.getClubs().find(c => c.id === id); },
  upsertClub(club) {
    const arr = this.getClubs();
    const i   = arr.findIndex(c => c.id === club.id);
    if (i >= 0) arr[i] = club; else arr.push(club);
    this._saveClubs(arr);
  },

  /* ── Contact Requests ── */
  getRequests()      { return this._list(this.K.REQUESTS); },
  _saveRequests(arr) { this._set(this.K.REQUESTS, arr); },
  addRequest(req) {
    const arr = this.getRequests();
    req.id      = this._uid();
    req.sent_at = new Date().toISOString();
    req.status  = 'pending';
    arr.push(req);
    this._saveRequests(arr);
    return req;
  },
  updateRequestStatus(reqId, status) {
    const arr = this.getRequests();
    const req = arr.find(r => r.id === reqId);
    if (req) { req.status = status; this._saveRequests(arr); }
    return req;
  },

  /* ── Saved Players ── */
  getSaved()        { return this._list(this.K.SAVED); },
  _saveSaved(arr)   { this._set(this.K.SAVED, arr); },
  addSaved(clubId, playerId) {
    const arr = this.getSaved();
    if (!arr.find(s => s.club_id === clubId && s.player_id === playerId)) {
      arr.push({ club_id: clubId, player_id: playerId });
      this._saveSaved(arr);
    }
  },
  removeSaved(clubId, playerId) {
    this._saveSaved(this.getSaved().filter(s => !(s.club_id === clubId && s.player_id === playerId)));
  },

  /* ── Profile Views ── */
  addView(clubId, playerId) {
    const arr = this._list(this.K.VIEWS);
    arr.push({ club_id: clubId, player_id: playerId, viewed_at: new Date().toISOString() });
    this._set(this.K.VIEWS, arr);
  },
  getViewCount(playerId) {
    return this._list(this.K.VIEWS).filter(v => v.player_id === playerId).length;
  },
};

/* ═══════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════ */
function _fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function _getSessionOrThrow() {
  const s = GOG_DB.getSession();
  if (!s || !s.id) throw new Error('غير مسجل الدخول');
  return s;
}

function _fd(formData, key) {
  if (!formData) return null;
  if (formData instanceof FormData) return formData.get(key);
  return formData[key] ?? null;
}

/* ═══════════════════════════════════════
   API HANDLERS
   ═══════════════════════════════════════ */
const GOG_API = {

  /* ── Auth ── */
  async login(data) {
    const user = GOG_DB.findUserByEmail(data.email);
    if (!user || user.password !== data.password) {
      throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }
    return GOG_DB.setSession(user);
  },

  async logout() {
    GOG_DB.clearSession();
    return { ok: true };
  },

  async me() {
    const s = GOG_DB.getSession();
    if (!s || !s.id) throw new Error('غير مسجل الدخول');
    return s;
  },

  async registerPlayer(data) {
    if (GOG_DB.findUserByEmail(data.email)) throw new Error('البريد الإلكتروني مسجل مسبقاً');
    if (!data.password || data.password.length < 8) throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');

    const user    = GOG_DB.addUser({ email: data.email, password: data.password, role: 'player', full_name: data.full_name });
    const profile = {
      id:                 GOG_DB._uid(),
      user_id:            user.id,
      full_name:          data.full_name,
      email:              data.email,
      date_of_birth:      data.date_of_birth   || null,
      nationality:        data.nationality     || '',
      country_residence:  data.country_residence || '',
      position_primary:   data.position_primary  || '',
      position_secondary: data.position_secondary || null,
      preferred_foot:     data.preferred_foot    || '',
      height_cm:          data.height_cm         || null,
      weight_kg:          data.weight_kg         || null,
      bio:                '',
      photo_url:          null,
      instagram_url:      '',
      youtube_url:        '',
      skills:             { speed: 50, dribbling: 50, shooting: 50, passing: 50, defending: 50, heading: 50 },
      career:             [],
      videos:             [],
      updated_at:         new Date().toISOString(),
      created_at:         new Date().toISOString(),
    };
    GOG_DB.upsertPlayer(profile);
    return GOG_DB.setSession(user);
  },

  async registerClub(formData) {
    const email    = _fd(formData, 'email')    || '';
    const password = _fd(formData, 'password') || '';
    const clubName = _fd(formData, 'club_name') || '';

    if (GOG_DB.findUserByEmail(email)) throw new Error('البريد الإلكتروني مسجل مسبقاً');

    const user = GOG_DB.addUser({ email, password, role: 'club' });
    const club = {
      id:                  GOG_DB._uid(),
      user_id:             user.id,
      club_name:           clubName,
      email,
      country:             _fd(formData, 'country')     || '',
      league:              _fd(formData, 'league')      || '',
      description:         _fd(formData, 'description') || '',
      logo_url:            null,
      verification_status: 'pending',
      created_at:          new Date().toISOString(),
    };
    GOG_DB.upsertClub(club);
    return GOG_DB.setSession(user);
  },

  /* ── Player ── */
  async playerProfile() {
    const s = _getSessionOrThrow();
    const p = GOG_DB.getPlayerByUserId(s.id);
    if (!p) throw new Error('لم يتم العثور على الملف الشخصي');
    return p;
  },

  async saveProfile(formData) {
    const s = _getSessionOrThrow();
    const p = GOG_DB.getPlayerByUserId(s.id);
    if (!p) throw new Error('لم يتم العثور على الملف الشخصي');

    // Photo
    if (formData instanceof FormData) {
      const photoFile = formData.get('photo');
      if (photoFile && photoFile instanceof File && photoFile.size > 0) {
        p.photo_url = await _fileToDataURL(photoFile);
      }
      p.bio          = formData.get('bio')           || p.bio;
      p.instagram_url = formData.get('instagram_url') || '';
      p.youtube_url   = formData.get('youtube_url')   || '';

      for (const skill of ['speed','dribbling','shooting','passing','defending','heading']) {
        const v = formData.get(skill);
        if (v !== null && v !== undefined) {
          if (!p.skills) p.skills = {};
          p.skills[skill] = parseInt(v) || 0;
        }
      }

      const careerJson = formData.get('career');
      if (careerJson) {
        try { p.career = JSON.parse(careerJson); } catch { /* ignore */ }
      }
    } else if (formData && typeof formData === 'object') {
      Object.assign(p, formData);
    }

    p.updated_at = new Date().toISOString();
    GOG_DB.upsertPlayer(p);
    return p;
  },

  async playerCareer(playerId) {
    let p;
    if (playerId) {
      p = GOG_DB.getPlayerById(playerId);
    } else {
      const s = GOG_DB.getSession();
      p = s && GOG_DB.getPlayerByUserId(s.id);
    }
    return (p && p.career) || [];
  },

  async playerSkills(playerId) {
    let p;
    if (playerId) {
      p = GOG_DB.getPlayerById(playerId);
    } else {
      const s = GOG_DB.getSession();
      p = s && GOG_DB.getPlayerByUserId(s.id);
    }
    return (p && p.skills) || { speed: 50, dribbling: 50, shooting: 50, passing: 50, defending: 50, heading: 50 };
  },

  async playerVideos(playerId) {
    let p;
    if (playerId) {
      p = GOG_DB.getPlayerById(playerId);
    } else {
      const s = GOG_DB.getSession();
      p = s && GOG_DB.getPlayerByUserId(s.id);
    }
    return (p && p.videos) || [];
  },

  async uploadVideo(formData) {
    const s = _getSessionOrThrow();
    const p = GOG_DB.getPlayerByUserId(s.id);
    if (!p) throw new Error('لم يتم العثور على الملف الشخصي');

    const file = formData instanceof FormData ? formData.get('video') : null;
    if (!file || !(file instanceof File)) throw new Error('لم يتم اختيار فيديو');

    const url   = await _fileToDataURL(file);
    const video = { id: GOG_DB._uid(), video_type: 'upload', video_url: url, title: file.name };

    if (!Array.isArray(p.videos)) p.videos = [];
    p.videos.push(video);
    GOG_DB.upsertPlayer(p);
    return { url, message: 'تم رفع الفيديو' };
  },

  async playerContactRequests() {
    const s = _getSessionOrThrow();
    const p = GOG_DB.getPlayerByUserId(s.id);
    if (!p) return [];
    return GOG_DB.getRequests()
      .filter(r => r.player_id === p.id)
      .map(r => {
        const club = GOG_DB.getClubById(r.club_id);
        return { ...r, club_name: club ? club.club_name : 'نادٍ' };
      });
  },

  async respondRequest(data) {
    const req = GOG_DB.updateRequestStatus(data.request_id, data.status);
    if (!req) throw new Error('لم يتم العثور على الطلب');
    return req;
  },

  async playerStats() {
    const s = _getSessionOrThrow();
    const p = GOG_DB.getPlayerByUserId(s.id);
    if (!p) return { profile_views: 0, total_requests: 0 };
    return {
      profile_views:   GOG_DB.getViewCount(p.id),
      total_requests:  GOG_DB.getRequests().filter(r => r.player_id === p.id).length,
    };
  },

  async publicProfile(playerId) {
    const p = GOG_DB.getPlayerById(playerId);
    if (!p) throw new Error('لم يتم العثور على اللاعب');
    const s = GOG_DB.getSession();
    if (s && s.role === 'club') {
      const club = GOG_DB.getClubByUserId(s.id);
      if (club) GOG_DB.addView(club.id, playerId);
    }
    return p;
  },

  /* ── Club ── */
  async clubProfile() {
    const s = _getSessionOrThrow();
    const c = GOG_DB.getClubByUserId(s.id);
    if (!c) throw new Error('لم يتم العثور على الملف');
    return c;
  },

  async searchPlayers(params) {
    let players = GOG_DB.getPlayers();

    if (params.position)    players = players.filter(p => p.position_primary === params.position);
    if (params.nationality) players = players.filter(p => p.nationality && p.nationality.toLowerCase().includes(params.nationality.toLowerCase()));
    if (params.foot)        players = players.filter(p => p.preferred_foot === params.foot);
    if (params.age_min || params.age_max) {
      players = players.filter(p => {
        if (!p.date_of_birth) return true;
        const age = Math.floor((Date.now() - new Date(p.date_of_birth)) / 3.156e10);
        if (params.age_min && age < +params.age_min) return false;
        if (params.age_max && age > +params.age_max) return false;
        return true;
      });
    }

    const page    = parseInt(params.page)     || 1;
    const perPage = parseInt(params.per_page) || 20;
    const total   = players.length;
    const pages   = Math.max(1, Math.ceil(total / perPage));
    const start   = (page - 1) * perPage;

    return { players: players.slice(start, start + perPage), total, pages, page };
  },

  async savedPlayers() {
    const s = _getSessionOrThrow();
    const c = GOG_DB.getClubByUserId(s.id);
    if (!c) return [];
    return GOG_DB.getSaved()
      .filter(sv => sv.club_id === c.id)
      .map(sv => GOG_DB.getPlayerById(sv.player_id))
      .filter(Boolean);
  },

  async savePlayer(data) {
    const s = _getSessionOrThrow();
    const c = GOG_DB.getClubByUserId(s.id);
    if (!c) throw new Error('لم يتم العثور على النادي');
    GOG_DB.addSaved(c.id, data.player_id);
    return { message: 'تم حفظ اللاعب' };
  },

  async unsavePlayer(data) {
    const s = _getSessionOrThrow();
    const c = GOG_DB.getClubByUserId(s.id);
    if (!c) throw new Error('لم يتم العثور على النادي');
    GOG_DB.removeSaved(c.id, data.player_id);
    return { message: 'تمت الإزالة' };
  },

  async sendRequest(data) {
    const s = _getSessionOrThrow();
    const c = GOG_DB.getClubByUserId(s.id);
    if (!c) throw new Error('لم يتم العثور على النادي');
    return GOG_DB.addRequest({ club_id: c.id, player_id: data.player_id, message: data.message || '' });
  },

  async clubContactRequests() {
    const s = _getSessionOrThrow();
    const c = GOG_DB.getClubByUserId(s.id);
    if (!c) return [];
    return GOG_DB.getRequests()
      .filter(r => r.club_id === c.id)
      .map(r => {
        const player = GOG_DB.getPlayerById(r.player_id);
        return { ...r, player_name: player ? player.full_name : 'لاعب' };
      });
  },

  async requestStatus(playerId) {
    const s = _getSessionOrThrow();
    const c = GOG_DB.getClubByUserId(s.id);
    if (!c) return { status: null };
    const req = GOG_DB.getRequests().find(r => r.club_id === c.id && r.player_id === playerId);
    return { status: req ? req.status : null };
  },

  /* ── Admin ── */
  async adminStats() {
    const clubs   = GOG_DB.getClubs();
    const players = GOG_DB.getPlayers();
    return {
      total_players:  players.length,
      pending_clubs:  clubs.filter(c => c.verification_status === 'pending').length,
      verified_clubs: clubs.filter(c => c.verification_status === 'verified').length,
      rejected_clubs: clubs.filter(c => c.verification_status === 'rejected').length,
    };
  },

  async adminPendingClubs() {
    return GOG_DB.getClubs().filter(c => c.verification_status === 'pending');
  },

  async adminPlayers(params) {
    const page    = parseInt(params.page)     || 1;
    const perPage = parseInt(params.per_page) || 25;
    const players = GOG_DB.getPlayers();
    const total   = players.length;
    const pages   = Math.max(1, Math.ceil(total / perPage));
    const start   = (page - 1) * perPage;
    return { players: players.slice(start, start + perPage).map(p => ({ ...p, is_active: true })), total, pages };
  },

  async adminClubs(params) {
    const page    = parseInt(params.page)     || 1;
    const perPage = parseInt(params.per_page) || 25;
    const clubs   = GOG_DB.getClubs();
    const total   = clubs.length;
    const pages   = Math.max(1, Math.ceil(total / perPage));
    const start   = (page - 1) * perPage;
    return { clubs: clubs.slice(start, start + perPage), total, pages };
  },

  async adminVerifyClub(data) {
    const clubs = GOG_DB.getClubs();
    const club  = clubs.find(c => c.id === data.club_id);
    if (!club) throw new Error('النادي غير موجود');
    if (data.action === 'verify')  club.verification_status = 'verified';
    if (data.action === 'reject')  club.verification_status = 'rejected';
    if (data.action === 'revoke')  club.verification_status = 'pending';
    GOG_DB.upsertClub(club);
    return { ok: true };
  },

  async adminUserAction(data) {
    if (data.action === 'delete') {
      // Remove player or club records for this user
      GOG_DB._savePlayers(GOG_DB.getPlayers().filter(p => p.user_id !== data.user_id));
      GOG_DB._saveClubs(GOG_DB.getClubs().filter(c => c.user_id !== data.user_id));
      GOG_DB._saveUsers(GOG_DB.getUsers().filter(u => u.id !== data.user_id));
    }
    return { ok: true };
  },

  async adminLogs(params) {
    // In localStorage mode, logs are synthetic from existing data
    const logs = [];
    GOG_DB.getClubs().forEach(c => {
      if (c.verification_status !== 'pending') {
        logs.push({ created_at: c.created_at, action: c.verification_status === 'verified' ? 'verify_club' : 'reject_club', target_type: 'club', target_id: c.id, actor_email: 'admin' });
      }
    });
    logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const page    = parseInt(params.page)     || 1;
    const perPage = parseInt(params.per_page) || 50;
    const pages   = Math.max(1, Math.ceil(logs.length / perPage));
    return { logs: logs.slice((page - 1) * perPage, page * perPage), pages };
  },
};

/* ═══════════════════════════════════════
   OVERRIDE apiRequest (defined in components.js)
   Routes every /api/... call to localStorage handlers
   ═══════════════════════════════════════ */
async function apiRequest(url, options = {}) {
  const [path, qs]  = url.split('?');
  const params       = qs ? Object.fromEntries(new URLSearchParams(qs)) : {};
  const method       = (options.method || 'GET').toUpperCase();

  let body = null;
  if (options.body) {
    if (options.body instanceof FormData) {
      body = options.body;
    } else if (typeof options.body === 'string') {
      try { body = JSON.parse(options.body); } catch { body = options.body; }
    } else {
      body = options.body;
    }
  }

  try {
    switch (path) {
      /* Auth */
      case '/api/auth/login.php':            return await GOG_API.login(body);
      case '/api/auth/logout.php':           return await GOG_API.logout();
      case '/api/auth/me.php':               return await GOG_API.me();
      case '/api/auth/register-player.php':  return await GOG_API.registerPlayer(body);
      case '/api/auth/register-club.php':    return await GOG_API.registerClub(body);

      /* Player */
      case '/api/player/profile.php':        return await GOG_API.playerProfile();
      case '/api/player/save-profile.php':   return await GOG_API.saveProfile(body);
      case '/api/player/career.php':         return await GOG_API.playerCareer(params.id);
      case '/api/player/skills.php':         return await GOG_API.playerSkills(params.id);
      case '/api/player/videos.php':         return await GOG_API.playerVideos(params.id);
      case '/api/player/upload-video.php':   return await GOG_API.uploadVideo(body);
      case '/api/player/contact-requests.php': return await GOG_API.playerContactRequests();
      case '/api/player/respond-request.php':  return await GOG_API.respondRequest(body);
      case '/api/player/stats.php':          return await GOG_API.playerStats();
      case '/api/player/public-profile.php': return await GOG_API.publicProfile(params.id);

      /* Club */
      case '/api/club/profile.php':          return await GOG_API.clubProfile();
      case '/api/club/search-players.php':   return await GOG_API.searchPlayers(params);
      case '/api/club/saved-players.php':    return await GOG_API.savedPlayers();
      case '/api/club/save-player.php':      return await GOG_API.savePlayer(body);
      case '/api/club/unsave-player.php':    return await GOG_API.unsavePlayer(body);
      case '/api/club/send-request.php':     return await GOG_API.sendRequest(body);
      case '/api/club/contact-requests.php': return await GOG_API.clubContactRequests();
      case '/api/club/request-status.php':   return await GOG_API.requestStatus(params.player_id);

      /* Admin */
      case '/api/admin/stats.php':           return await GOG_API.adminStats();
      case '/api/admin/pending-clubs.php':   return await GOG_API.adminPendingClubs();
      case '/api/admin/players.php':         return await GOG_API.adminPlayers(params);
      case '/api/admin/clubs.php':           return await GOG_API.adminClubs(params);
      case '/api/admin/verify-club.php':     return await GOG_API.adminVerifyClub(body);
      case '/api/admin/user-action.php':     return await GOG_API.adminUserAction(body);
      case '/api/admin/logs.php':            return await GOG_API.adminLogs(params);

      default:
        throw new Error('مسار API غير معروف: ' + path);
    }
  } catch (err) {
    throw new Error(err.message || 'حدث خطأ في الخادم');
  }
}

/* ═══════════════════════════════════════
   OVERRIDE requireAuth — no fetch needed
   ═══════════════════════════════════════ */
async function requireAuth(requiredRole) {
  try {
    const session = GOG_DB.getSession();
    if (!session || !session.id) throw new Error('غير مسجل الدخول');

    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (requiredRole && !roles.includes(session.role)) {
      window.location.href = '/login.html';
      return null;
    }
    return session;
  } catch {
    window.location.href = '/login.html';
    return null;
  }
}

/* ═══════════════════════════════════════
   OVERRIDE handleLogout — Arabic
   ═══════════════════════════════════════ */
function handleLogout() {
  renderModal(
    'تسجيل الخروج',
    '<p style="color:var(--text-secondary)">هل أنت متأكد من أنك تريد تسجيل الخروج من Got؟</p>',
    [
      {
        label: 'تسجيل الخروج',
        class: 'btn--danger',
        onClick: () => {
          GOG_DB.clearSession();
          window.location.href = '/login.html';
        },
      },
      { label: 'إلغاء', class: 'btn--ghost', onClick: closeModal },
    ]
  );
}

/* ═══════════════════════════════════════
   SEED ADMIN USER (demo mode)
   ═══════════════════════════════════════ */
(function _seedAdmin() {
  if (!GOG_DB.findUserByEmail('admin@got.com')) {
    GOG_DB.addUser({ email: 'admin@got.com', password: 'admin123', role: 'admin', full_name: 'المشرف' });
  }
})();
