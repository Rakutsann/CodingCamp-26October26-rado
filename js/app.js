(function() {
'use strict';

// ==================== CONSTANTS ====================
var STORAGE_KEY = 'ruang:v1';
var SIDEBAR_WIDTHS = { full: 224, medium: 195, icon: 76 };

// ==================== STATE ====================
var state = null;
var timerInterval = null;
var clockInterval = null;
var dateCheckInterval = null;
var audioCtx = null;
var undoDelete = null; // { task, timeoutId }

// ==================== DEFAULT STATE ====================
function defaultState() {
  return {
    version: 1,
    settings: {
      name: 'Rado',
      focusMinutes: 25,
      breakMinutes: 5,
      goal: 4,
      theme: 'light',
      sound: true
    },
    tasks: [],
    links: [
      { id: 'l1', name: 'GitHub', url: 'https://github.com' },
      { id: 'l2', name: 'Gmail', url: 'https://mail.google.com' },
      { id: 'l3', name: 'YouTube', url: 'https://youtube.com' },
      { id: 'l4', name: 'Figma', url: 'https://figma.com' }
    ],
    sessions: [],
    timer: {
      id: generateId(),
      mode: 'focus',
      total: 1500,
      remaining: 1500,
      running: false,
      endAt: null,
      taskId: ''
    }
  };
}

function generateId() {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

// ==================== STORE ====================
var Store = {
  load: function() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      var data = JSON.parse(raw);
      return migrate(data);
    } catch(e) {
      console.error('Load error:', e);
      return defaultState();
    }
  },
  save: function() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch(e) {
      showToast('Penyimpanan browser gagal. Coba periksa ruang penyimpanan.');
      return false;
    }
  }
};

// ==================== MIGRATION ====================
function migrate(data) {
  if (!data || typeof data !== 'object') return defaultState();
  // Check for old format (no version field or version mismatch)
  if (!data.version || data.version !== 1) {
    // Try to migrate old fields
    var migrated = defaultState();
    if (data.settings) {
      if (data.settings.name) migrated.settings.name = data.settings.name;
      if (data.settings.focusDuration) migrated.settings.focusMinutes = data.settings.focusDuration;
      if (data.settings.breakDuration) migrated.settings.breakMinutes = data.settings.breakDuration;
      if (data.settings.dailyTarget) migrated.settings.goal = data.settings.dailyTarget;
      if (data.settings.theme) {
        migrated.settings.theme = data.settings.theme === 'auto' ? 'system' : data.settings.theme;
      }
      if (data.settings.soundEnabled !== undefined) migrated.settings.sound = data.settings.soundEnabled;
    }
    if (data.tasks && Array.isArray(data.tasks)) {
      migrated.tasks = data.tasks.map(function(t) {
        return {
          id: t.id || generateId(),
          title: t.title || 'Tugas',
          category: t.category || 'personal',
          priority: t.priority === 'tinggi' ? 'high' : (t.priority === 'rendah' ? 'low' : (t.priority || 'normal')),
          done: t.completed || t.done || false,
          createdAt: t.createdAt || new Date().toISOString(),
          completedAt: t.completedAt || null
        };
      });
    }
    if (data.shortcuts && Array.isArray(data.shortcuts)) {
      migrated.links = data.shortcuts.map(function(s) {
        return { id: s.id || generateId(), name: s.name || 'Pintasan', url: s.url || '#' };
      });
    } else if (data.links && Array.isArray(data.links)) {
      migrated.links = data.links;
    }
    if (data.history && data.history.sessions && Array.isArray(data.history.sessions)) {
      migrated.sessions = data.history.sessions.map(function(s) {
        return {
          id: s.id || generateId(),
          endedAt: s.completedAt ? new Date(s.completedAt).toISOString() : new Date().toISOString(),
          seconds: (s.duration || 25) * 60,
          taskId: s.taskId || ''
        };
      });
    } else if (data.sessions && Array.isArray(data.sessions)) {
      migrated.sessions = data.sessions;
    }
    return migrated;
  }
  // Version 1: validate and fill missing fields
  return validateAndFill(data);
}

function validateAndFill(data) {
  var def = defaultState();
  var result = {
    version: 1,
    settings: {
      name: (data.settings && data.settings.name) || def.settings.name,
      focusMinutes: clamp((data.settings && data.settings.focusMinutes) || def.settings.focusMinutes, 1, 120),
      breakMinutes: clamp((data.settings && data.settings.breakMinutes) || def.settings.breakMinutes, 1, 60),
      goal: [2,4,6,8].indexOf((data.settings && data.settings.goal) || def.settings.goal) >= 0 ? data.settings.goal : def.settings.goal,
      theme: ['light','dark','system'].indexOf((data.settings && data.settings.theme) || def.settings.theme) >= 0 ? data.settings.theme : def.settings.theme,
      sound: (data.settings && typeof data.settings.sound === 'boolean') ? data.settings.sound : def.settings.sound
    },
    tasks: Array.isArray(data.tasks) ? data.tasks.filter(isValidTask).map(normalizeTask) : [],
    links: Array.isArray(data.links) ? data.links.filter(isValidLink).map(normalizeLink) : def.links,
    sessions: Array.isArray(data.sessions) ? data.sessions.filter(isValidSession).map(normalizeSession) : [],
    timer: data.timer && typeof data.timer === 'object' ? normalizeTimer(data.timer) : def.timer
  };
  // Ensure timer total matches settings
  result.timer.total = result.timer.mode === 'focus' ? result.settings.focusMinutes * 60 : result.settings.breakMinutes * 60;
  if (!result.timer.running) {
    result.timer.remaining = result.timer.total;
    result.timer.endAt = null;
  }
  return result;
}

function isValidTask(t) { return t && typeof t.title === 'string' && t.title.trim().length > 0; }
function normalizeTask(t) {
  return {
    id: t.id || generateId(),
    title: t.title.slice(0, 160),
    category: ['personal','belajar','kerja'].indexOf(t.category) >= 0 ? t.category : 'personal',
    priority: ['high','normal','low'].indexOf(t.priority) >= 0 ? t.priority : 'normal',
    done: !!t.done,
    createdAt: t.createdAt || new Date().toISOString(),
    completedAt: t.completedAt || null
  };
}
function isValidLink(l) { return l && typeof l.name === 'string' && typeof l.url === 'string'; }
function normalizeLink(l) { return { id: l.id || generateId(), name: l.name.slice(0, 40), url: l.url }; }
function isValidSession(s) { return s && typeof s.id === 'string' && typeof s.endedAt === 'string'; }
function normalizeSession(s) {
  return {
    id: s.id,
    endedAt: s.endedAt,
    seconds: typeof s.seconds === 'number' ? s.seconds : 0,
    taskId: typeof s.taskId === 'string' ? s.taskId : ''
  };
}
function normalizeTimer(t) {
  var def = defaultState().timer;
  return {
    id: t.id || generateId(),
    mode: t.mode === 'break' ? 'break' : 'focus',
    total: typeof t.total === 'number' ? t.total : def.total,
    remaining: typeof t.remaining === 'number' ? t.remaining : def.remaining,
    running: !!t.running,
    endAt: typeof t.endAt === 'number' ? t.endAt : null,
    taskId: typeof t.taskId === 'string' ? t.taskId : ''
  };
}

// ==================== HELPERS ====================
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function dateToStr(d) { return d.toISOString().slice(0, 10); }

// ==================== GREETING & TIME ====================
function getGreetingPrefix(h) {
  if (h >= 5 && h < 11) return 'Selamat pagi';
  if (h >= 11 && h < 15) return 'Selamat siang';
  if (h >= 15 && h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

function getTimezoneLabel() {
  try {
    var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz === 'Asia/Jakarta') return 'WAKTU INDONESIA BARAT';
    if (tz === 'Asia/Makassar') return 'WAKTU INDONESIA TENGAH';
    if (tz === 'Asia/Jayapura') return 'WAKTU INDONESIA TIMUR';
    // Fallback: show timezone offset
    var offset = -new Date().getTimezoneOffset();
    var sign = offset >= 0 ? '+' : '-';
    offset = Math.abs(offset);
    return 'GMT' + sign + pad(Math.floor(offset/60)) + ':' + pad(offset % 60);
  } catch(e) {
    return '';
  }
}

function updateGreeting() {
  var now = new Date();
  var h = now.getHours();
  var name = state.settings.name || 'Rado';
  document.getElementById('greeting').textContent = getGreetingPrefix(h) + ', ' + name + '.';
  updateAvatar(name);
}

function updateAvatar(name) {
  var initial = (name || 'R').charAt(0).toUpperCase();
  document.getElementById('headerAvatar').textContent = initial;
  document.getElementById('sidebarAvatar').textContent = initial;
  document.getElementById('sidebarUserName').textContent = name || 'Rado';
}

function updateDate() {
  var now = new Date();
  var days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  var months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  var dateStr = days[now.getDay()] + ', ' + now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();
  document.getElementById('dateText').textContent = dateStr;
}

function updateClock() {
  var now = new Date();
  var h = pad(now.getHours());
  var m = pad(now.getMinutes());
  var s = pad(now.getSeconds());
  var clockEl = document.getElementById('clockText');
  if (clockEl) clockEl.textContent = h + ':' + m + ':' + s;

  // Check date change
  var currentDateStr = todayStr();
  if (lastDateStr && currentDateStr !== lastDateStr) {
    lastDateStr = currentDateStr;
    updateDate();
    renderStats();
    renderActivity();
  }
  lastDateStr = currentDateStr;
}

// ==================== TASKS ====================
var Tasks = {
  add: function(title, category, priority) {
    title = title.trim().slice(0, 160);
    if (!title) return false;
    if (!category) category = 'personal';
    if (!priority) priority = 'normal';
    // Check duplicate (case-insensitive, trimmed)
    var normTitle = title.toLowerCase().replace(/\s+/g, ' ').trim();
    var existing = state.tasks.find(function(t) {
      return !t.done && t.title.toLowerCase().replace(/\s+/g, ' ').trim() === normTitle;
    });
    if (existing) {
      showToast('Tugas aktif dengan judul yang sama sudah ada.');
      return false;
    }
    var task = {
      id: generateId(),
      title: title,
      category: category,
      priority: priority,
      done: false,
      createdAt: new Date().toISOString(),
      completedAt: null
    };
    state.tasks.unshift(task);
    Store.save();
    renderTasks();
    return true;
  },
  edit: function(id, updates) {
    var t = state.tasks.find(function(x) { return x.id === id; });
    if (!t) return;
    // Check duplicate when reactivating
    if (updates.done === false && t.done) {
      var normTitle = t.title.toLowerCase().replace(/\s+/g, ' ').trim();
      var existing = state.tasks.find(function(x) {
        return x.id !== id && !x.done && x.title.toLowerCase().replace(/\s+/g, ' ').trim() === normTitle;
      });
      if (existing) {
        showToast('Tugas aktif dengan judul yang sama sudah ada.');
        return false;
      }
    }
    Object.keys(updates).forEach(function(k) { t[k] = updates[k]; });
    if (updates.done === true) {
      t.completedAt = new Date().toISOString();
    } else if (updates.done === false) {
      t.completedAt = null;
    }
    Store.save();
    renderTasks();
    renderStats();
    return true;
  },
  toggle: function(id) {
    var t = state.tasks.find(function(x) { return x.id === id; });
    if (!t) return;
    if (!t.done) {
      // Check duplicate when reactivating won't apply here, we're completing
      t.done = true;
      t.completedAt = new Date().toISOString();
    } else {
      // Reactivate: check duplicate
      var normTitle = t.title.toLowerCase().replace(/\s+/g, ' ').trim();
      var existing = state.tasks.find(function(x) {
        return x.id !== id && !x.done && x.title.toLowerCase().replace(/\s+/g, ' ').trim() === normTitle;
      });
      if (existing) {
        showToast('Tugas aktif dengan judul yang sama sudah ada.');
        return;
      }
      t.done = false;
      t.completedAt = null;
    }
    Store.save();
    renderTasks();
    renderStats();
  },
  remove: function(id) {
    var idx = state.tasks.findIndex(function(x) { return x.id === id; });
    if (idx < 0) return;
    var removed = state.tasks[idx];
    state.tasks.splice(idx, 1);
    Store.save();
    renderTasks();
    renderStats();
    // Undo
    if (undoDelete) clearTimeout(undoDelete.timeoutId);
    undoDelete = { task: removed, timeoutId: null };
    var toast = showToast('Tugas dihapus.', 'Urungkan', function() {
      if (undoDelete && undoDelete.task) {
        state.tasks.splice(Math.min(idx, state.tasks.length), 0, undoDelete.task);
        Store.save();
        renderTasks();
        renderStats();
        undoDelete = null;
      }
    });
    undoDelete.timeoutId = setTimeout(function() { undoDelete = null; }, 8000);
  },
  focusCount: function(taskId) {
    if (!taskId) return 0;
    return state.sessions.filter(function(s) { return s.taskId === taskId; }).length;
  }
};

// ==================== TIMER ====================
var Timer = {
  start: function() {
    ensureAudioContext();
    var t = state.timer;
    t.running = true;
    t.endAt = Date.now() + t.remaining * 1000;
    Store.save();
    renderTimer();
    startTimerTick();
  },
  pause: function() {
    var t = state.timer;
    if (!t.running) return;
    t.remaining = Math.max(0, Math.round((t.endAt - Date.now()) / 1000));
    t.running = false;
    t.endAt = null;
    Store.save();
    renderTimer();
    stopTimerTick();
  },
  resume: function() {
    ensureAudioContext();
    var t = state.timer;
    t.running = true;
    t.endAt = Date.now() + t.remaining * 1000;
    Store.save();
    renderTimer();
    startTimerTick();
  },
  reset: function() {
    var t = state.timer;
    stopTimerTick();
    t.id = generateId(); // new session ID
    t.running = false;
    t.remaining = t.total;
    t.endAt = null;
    Store.save();
    renderTimer();
  },
  getRemaining: function() {
    var t = state.timer;
    if (t.running && t.endAt) {
      return Math.max(0, Math.round((t.endAt - Date.now()) / 1000));
    }
    return t.remaining;
  },
  getProgress: function() {
    var t = state.timer;
    var remaining = Timer.getRemaining();
    return t.total > 0 ? (t.total - remaining) / t.total : 0;
  },
  tick: function() {
    var remaining = Timer.getRemaining();
    updateTimerDisplay(remaining);
    if (remaining <= 0) {
      Timer.complete();
    }
  },
  complete: function() {
    var t = state.timer;
    var scheduledEnd = t.endAt || Date.now(); // save before nulling
    stopTimerTick();
    t.running = false;
    t.remaining = 0;
    t.endAt = null;
    // Record session if focus mode and not already recorded
    if (t.mode === 'focus') {
      var existing = state.sessions.find(function(s) { return s.id === t.id; });
      if (!existing) {
        var endedAt = new Date(scheduledEnd).toISOString();
        state.sessions.push({
          id: t.id,
          endedAt: endedAt,
          seconds: t.total,
          taskId: t.taskId || ''
        });
      }
    }
    Store.save();
    renderTimer();
    renderStats();
    renderActivity();
    // Sound
    if (state.settings.sound) playCompleteSound();
    // Notification
    if (t.mode === 'focus') {
      showToast('Sesi fokus selesai. Saatnya istirahat.', 'Mulai istirahat', function() {
        switchMode('break');
        Timer.start();
      });
    } else {
      showToast('Istirahat selesai. Siap untuk fokus lagi?');
    }
  },
  setMode: function(mode) {
    var t = state.timer;
    if (t.running) {
      showToast('Jeda timer terlebih dahulu sebelum mengganti mode.');
      return false;
    }
    t.mode = mode;
    t.total = mode === 'focus' ? state.settings.focusMinutes * 60 : state.settings.breakMinutes * 60;
    t.remaining = t.total;
    t.id = generateId();
    t.endAt = null;
    Store.save();
    renderTimer();
    return true;
  },
  setTask: function(taskId) {
    var t = state.timer;
    if (t.running) {
      showToast('Jeda timer terlebih dahulu sebelum mengganti tugas.');
      return false;
    }
    if (t.mode === 'break') {
      showToast('Tugas tidak bisa dipilih saat mode istirahat.');
      return false;
    }
    t.taskId = taskId || '';
    Store.save();
    renderTimer();
    return true;
  },
  updateDurations: function() {
    var t = state.timer;
    if (!t.running) {
      t.total = t.mode === 'focus' ? state.settings.focusMinutes * 60 : state.settings.breakMinutes * 60;
      t.remaining = t.total;
      t.endAt = null;
    }
  }
};

function startTimerTick() {
  stopTimerTick();
  timerInterval = setInterval(function() { Timer.tick(); }, 1000);
}
function stopTimerTick() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function updateTimerDisplay(remaining) {
  var m = Math.floor(remaining / 60);
  var s = remaining % 60;
  var text = pad(m) + ':' + pad(s);
  var el = document.getElementById('timerDisplay');
  if (el) el.textContent = text;
  var focusEl = document.getElementById('focusTimerDisplay');
  if (focusEl) focusEl.textContent = text;
  // Update ring
  var ring = document.querySelector('.timer-progress-ring');
  if (ring) {
    var circ = 2 * Math.PI * 98;
    var progress = Timer.getProgress();
    ring.style.strokeDashoffset = circ * (1 - progress);
  }
}

function switchMode(mode) {
  if (!Timer.setMode(mode)) return;
  // Update tab UI
  document.querySelectorAll('.timer-tab').forEach(function(tab) {
    tab.classList.toggle('active', tab.dataset.mode === mode);
  });
}

// ==================== AUDIO ====================
function ensureAudioContext() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch(e) { /* audio not available, timer still works */ }
}

function playCompleteSound() {
  try {
    ensureAudioContext();
    if (!audioCtx) return;
    var now = audioCtx.currentTime;
    // Soft two-tone chime
    [880, 660].forEach(function(freq, i) {
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, now + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.8);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.8);
    });
  } catch(e) { /* silent fail */ }
}

// ==================== STATS ====================
var Stats = {
  todayCompletedTasks: function() {
    var today = todayStr();
    return state.tasks.filter(function(t) {
      return t.done && t.completedAt && dateToStr(new Date(t.completedAt)) === today;
    }).length;
  },
  todayFocusMinutes: function() {
    var today = todayStr();
    return state.sessions.filter(function(s) {
      return dateToStr(new Date(s.endedAt)) === today;
    }).reduce(function(sum, s) { return sum + Math.round(s.seconds / 60); }, 0);
  },
  todayFocusSessions: function() {
    var today = todayStr();
    return state.sessions.filter(function(s) {
      return dateToStr(new Date(s.endedAt)) === today;
    }).length;
  },
  weeklyData: function() {
    var days = [];
    var now = new Date();
    for (var i = 6; i >= 0; i--) {
      var d = new Date(now);
      d.setDate(d.getDate() - i);
      var dStr = dateToStr(d);
      var daySessions = state.sessions.filter(function(s) { return dateToStr(new Date(s.endedAt)) === dStr; });
      var minutes = daySessions.reduce(function(sum, s) { return sum + Math.round(s.seconds / 60); }, 0);
      days.push({ date: dStr, minutes: minutes, sessions: daySessions.length, isToday: i === 0 });
    }
    return days;
  },
  weeklyTotalMinutes: function() {
    return this.weeklyData().reduce(function(sum, d) { return sum + d.minutes; }, 0);
  },
  weeklyTotalSessions: function() {
    return this.weeklyData().reduce(function(sum, d) { return sum + d.sessions; }, 0);
  }
};

// ==================== LINKS ====================
var Links = {
  validateUrl: function(url) {
    if (!url) return null;
    url = url.trim();
    if (!url) return null;
    // Add protocol if missing
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    try {
      var u = new URL(url);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
      return u.href;
    } catch(e) {
      return null;
    }
  },
  getIconColors: function(name) {
    var n = (name || '').toLowerCase();
    if (n === 'github') return { text: '#3d433e', bg: '#fffefa', monogram: 'G' };
    if (n === 'gmail') return { text: '#b17b53', bg: '#f7eee3', monogram: 'G' };
    if (n === 'youtube') return { text: '#b76557', bg: '#faede8', monogram: null }; // SVG icon
    if (n === 'figma') return { text: '#88739b', bg: '#f1edf5', monogram: 'F' };
    return { text: '#3f5d4b', bg: '#fffefa', monogram: (name || 'L').charAt(0).toUpperCase() };
  },
  add: function(name, url) {
    name = name.trim();
    var validUrl = Links.validateUrl(url);
    if (!name || !validUrl) return false;
    var link = { id: generateId(), name: name, url: validUrl };
    state.links.push(link);
    Store.save();
    renderLinks();
    return true;
  },
  edit: function(id, name, url) {
    var l = state.links.find(function(x) { return x.id === id; });
    if (!l) return false;
    var validUrl = Links.validateUrl(url);
    if (!validUrl) return false;
    l.name = name.trim();
    l.url = validUrl;
    Store.save();
    renderLinks();
    return true;
  },
  remove: function(id) {
    var idx = state.links.findIndex(function(x) { return x.id === id; });
    if (idx < 0) return;
    var removed = state.links[idx];
    state.links.splice(idx, 1);
    Store.save();
    renderLinks();
    // Undo
    var undoData = { link: removed, idx: idx };
    showToast('Pintasan dihapus.', 'Urungkan', function() {
      state.links.splice(Math.min(undoData.idx, state.links.length), 0, undoData.link);
      Store.save();
      renderLinks();
    });
  }
};

// ==================== THEME ====================
var Theme = {
  apply: function() {
    var mode = state.settings.theme;
    if (mode === 'system') {
      var dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', mode);
    }
  },
  set: function(mode) {
    state.settings.theme = mode;
    Store.save();
    Theme.apply();
  },
  cycle: function() {
    var modes = ['light', 'dark', 'system'];
    var idx = modes.indexOf(state.settings.theme);
    Theme.set(modes[(idx + 1) % modes.length]);
  },
  watchSystem: function() {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
      if (state.settings.theme === 'system') Theme.apply();
    });
  }
};

// ==================== BACKUP ====================
var Backup = {
  export: function() {
    // Calculate remaining timer without stopping it
    var snapshot = JSON.parse(JSON.stringify(state));
    var t = snapshot.timer;
    if (t.running && t.endAt) {
      t.remaining = Math.max(0, Math.round((t.endAt - Date.now()) / 1000));
      t.running = false;
      t.endAt = null;
    }
    var json = JSON.stringify(snapshot, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'ruang-backup-' + todayStr() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Cadangan berhasil diekspor.');
  },
  import: function(file) {
    if (file.size > 3 * 1024 * 1024) {
      showToast('File terlalu besar. Maksimal 3 MB.');
      return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var data = JSON.parse(e.target.result);
        if (!data || typeof data !== 'object') throw new Error('Invalid format');
        // Validate
        var validated = validateAndFill(data);
        if (!validated) throw new Error('Invalid data');
        // Show confirmation
        var msg = 'Impor ' + validated.tasks.length + ' tugas, ' + validated.links.length + ' pintasan, ' + validated.sessions.length + ' sesi?';
        showToast(msg, 'Konfirmasi', function() {
          state = validated;
          // Reset timer to focus idle
          state.timer = defaultState().timer;
          state.timer.total = state.settings.focusMinutes * 60;
          state.timer.remaining = state.timer.total;
          Store.save();
          renderAll();
          showToast('Data berhasil dipulihkan.');
        });
      } catch(err) {
        showToast('File rusak atau format tidak valid. Data tidak diubah.');
      }
    };
    reader.onerror = function() {
      showToast('Gagal membaca file.');
    };
    reader.readAsText(file);
  }
};

// ==================== RENDER ====================
function renderAll() {
  updateGreeting();
  updateDate();
  updateClock();
  renderTasks();
  renderTimer();
  renderStats();
  renderActivity();
  renderLinks();
  Timer.updateDurations();
}

function renderTasks() {
  var list = document.getElementById('taskList');
  var empty = document.getElementById('emptyState');
  var progress = document.getElementById('taskProgress');
  var count = document.getElementById('taskCount');
  var menuCount = document.getElementById('menuTaskCount');

  var total = state.tasks.length;
  var active = state.tasks.filter(function(t) { return !t.done; }).length;
  var done = total - active;

  count.textContent = '(' + total + ')';
  menuCount.textContent = active;

  if (total === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    progress.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  progress.style.display = 'block';

  // Filter
  var filter = currentFilter;
  var filtered = state.tasks;
  if (filter === 'active') filtered = state.tasks.filter(function(t) { return !t.done; });
  else if (filter === 'done') filtered = state.tasks.filter(function(t) { return t.done; });

  // Search
  var q = (document.getElementById('searchInput').value || '').toLowerCase().trim();
  if (q) {
    filtered = filtered.filter(function(t) {
      return t.title.toLowerCase().indexOf(q) >= 0 || (t.category || '').toLowerCase().indexOf(q) >= 0;
    });
  }

  // Sort: active before done always, then by sort option
  var sortBy = document.getElementById('sortSelect').value;
  var priorityOrder = { high: 0, normal: 1, low: 2 };
  filtered.sort(function(a, b) {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (sortBy === 'priority') return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
    if (sortBy === 'az') return a.title.localeCompare(b.title);
    // newest: higher createdAt first
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  var html = filtered.map(function(t) {
    var catLabels = { personal: 'Personal', belajar: 'Belajar', kerja: 'Kerja' };
    var priLabels = { high: 'Tinggi', normal: 'Normal', low: 'Rendah' };
    var focusCount = Tasks.focusCount(t.id);
    var actions = '';
    if (!t.done) {
      actions += '<button class="task-action-btn" data-action="focus" data-id="' + t.id + '" title="Fokus" aria-label="Fokus">' + iconTimer() + '</button>';
    }
    actions += '<button class="task-action-btn" data-action="edit" data-id="' + t.id + '" title="Edit" aria-label="Edit">' + iconEdit() + '</button>';
    actions += '<button class="task-action-btn" data-action="delete" data-id="' + t.id + '" title="Hapus" aria-label="Hapus">' + iconDelete() + '</button>';

    return '<div class="task-item' + (t.done ? ' done' : '') + '" data-id="' + t.id + '">' +
      '<div class="task-checkbox" data-action="toggle" data-id="' + t.id + '" role="checkbox" aria-checked="' + t.done + '" tabindex="0">' +
      '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 6l3 3 5-5"/></svg>' +
      '</div>' +
      '<div class="task-item-content">' +
      '<div class="task-item-title">' + escapeHtml(t.title) + '</div>' +
      '<div class="task-item-meta">' +
      '<span class="task-tag">' + (catLabels[t.category] || 'Personal') + '</span>' +
      '<span class="task-tag priority-' + t.priority + '">' + (priLabels[t.priority] || 'Normal') + '</span>' +
      (focusCount > 0 ? '<span class="task-focus-count">' + focusCount + ' sesi fokus</span>' : '') +
      '</div>' +
      '</div>' +
      '<div class="task-item-actions">' + actions + '</div>' +
      '</div>';
  }).join('');
  list.innerHTML = html;

  // Progress
  var pct = total > 0 ? (done / total) * 100 : 0;
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent = done + ' dari ' + total + ' tugas selesai';
}

function renderTimer() {
  var t = state.timer;
  var remaining = Timer.getRemaining();
  updateTimerDisplay(remaining);
  // Title
  var title = document.getElementById('timerTitle');
  if (t.mode === 'focus') title.textContent = 'Waktunya fokus';
  else title.textContent = 'Waktunya istirahat';
  // Tabs
  document.querySelectorAll('.timer-tab').forEach(function(tab) {
    tab.classList.toggle('active', tab.dataset.mode === t.mode);
  });
  // Buttons
  document.getElementById('btnTimerStart').style.display = t.running ? 'none' : 'inline-flex';
  document.getElementById('btnTimerPause').style.display = t.running ? 'inline-flex' : 'none';
  document.getElementById('btnTimerResume').style.display = 'none';
  // If paused (remaining < total and not running)
  if (!t.running && t.remaining < t.total) {
    document.getElementById('btnTimerStart').style.display = 'none';
    document.getElementById('btnTimerResume').style.display = 'inline-flex';
  }
  // Focus overlay buttons
  var fs = document.getElementById('btnFocusStart');
  var fp = document.getElementById('btnFocusPause');
  var fr = document.getElementById('btnFocusResume');
  if (fs) fs.style.display = t.running ? 'none' : 'inline-flex';
  if (fp) fp.style.display = t.running ? 'inline-flex' : 'none';
  if (fr) fr.style.display = 'none';
  if (fr && !t.running && t.remaining < t.total) {
    if (fs) fs.style.display = 'none';
    if (fr) fr.style.display = 'inline-flex';
  }
  // Task select
  var select = document.getElementById('timerTaskSelect');
  select.disabled = t.running || t.mode === 'break';
  // Populate options
  var currentTaskId = t.taskId;
  var options = '<option value="">Fokus tanpa tugas tertentu</option>';
  state.tasks.filter(function(x) { return !x.done; }).forEach(function(task) {
    var sel = task.id === currentTaskId ? ' selected' : '';
    options += '<option value="' + task.id + '"' + sel + '>' + escapeHtml(task.title) + '</option>';
  });
  select.innerHTML = options;
  select.value = currentTaskId;
  // Focus overlay task name
  var focusName = document.getElementById('focusTaskName');
  if (focusName) {
    var task = state.tasks.find(function(x) { return x.id === currentTaskId; });
    focusName.textContent = task ? task.title : 'Fokus tanpa tugas tertentu';
  }
  // Start/stop tick
  if (t.running && !timerInterval) startTimerTick();
  if (!t.running && timerInterval) stopTimerTick();
}

function renderStats() {
  var done = Stats.todayCompletedTasks();
  var minutes = Stats.todayFocusMinutes();
  var sessions = Stats.todayFocusSessions();
  var goal = state.settings.goal || 4;
  document.getElementById('summaryTasksDone').textContent = done;
  document.getElementById('summaryFocusMinutes').textContent = minutes;
  document.getElementById('summarySessions').textContent = sessions + '/' + goal;
}

function renderActivity() {
  var weekly = Stats.weeklyData();
  var totalMinutes = Stats.weeklyTotalMinutes();
  var totalSessions = Stats.weeklyTotalSessions();
  document.getElementById('weekMinutes').textContent = totalMinutes;
  document.getElementById('weekSessions').textContent = totalSessions;
  // Chart
  var maxMins = Math.max.apply(null, weekly.map(function(d) { return d.minutes; }));
  var dayLabels = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  var html = weekly.map(function(d) {
    var date = new Date(d.date);
    var label = dayLabels[date.getDay()];
    var height = maxMins > 0 ? (d.minutes / maxMins) * 100 : 0;
    return '<div class="bar-day">' +
      '<div class="bar-wrapper"><div class="bar' + (d.isToday ? ' active' : '') + '" style="height: ' + Math.max(2, height) + '%" title="' + d.minutes + ' menit"></div></div>' +
      '<div class="bar-label">' + label + '</div>' +
      '</div>';
  }).join('');
  document.getElementById('activityChart').innerHTML = html;
}

function renderLinks() {
  var grid = document.getElementById('shortcutsGrid');
  if (state.links.length === 0) {
    grid.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-secondary);font-size:0.85rem;">Belum ada pintasan.</div>';
    return;
  }
  var html = state.links.map(function(l) {
    var colors = Links.getIconColors(l.name);
    var icon;
    if (l.name.toLowerCase() === 'youtube') {
      icon = '<div class="shortcut-icon" style="background:' + colors.bg + ';color:' + colors.text + '">' +
        '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="1" y="4" width="18" height="12" rx="3" fill="' + colors.text + '"/><path d="M8 7.5l5 2.5-5 2.5v-5z" fill="#fffefa"/></svg>' +
        '</div>';
    } else {
      var monogram = colors.monogram || l.name.charAt(0).toUpperCase();
      icon = '<div class="shortcut-icon" style="background:' + colors.bg + ';color:' + colors.text + ';border-color:#e8e9e1;">' + monogram + '</div>';
    }
    return '<div class="shortcut-card" data-url="' + escapeHtml(l.url) + '" data-id="' + l.id + '">' +
      icon +
      '<div class="shortcut-name">' + escapeHtml(l.name) + '</div>' +
      '<div class="shortcut-actions">' +
      '<button class="shortcut-action-btn" data-link-action="edit" data-id="' + l.id + '" aria-label="Edit">' + iconEdit() + '</button>' +
      '<button class="shortcut-action-btn" data-link-action="delete" data-id="' + l.id + '" aria-label="Hapus">' + iconDelete() + '</button>' +
      '</div>' +
      '</div>';
  }).join('');
  grid.innerHTML = html;
}

// ==================== SVG ICONS ====================
function iconTimer() {
  return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="5.5"/><path d="M8 5v3l2 2"/></svg>';
}
function iconEdit() {
  return '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2l3 3-7 7H2v-3l7-7z"/></svg>';
}
function iconDelete() {
  return '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h8M5 4V3h4v1m-4 1v6m2-6v6m-3 0h6"/></svg>';
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// ==================== FOCUS MODE ====================
var FocusMode = {
  open: function() {
    document.getElementById('focusOverlay').classList.add('open');
    renderTimer();
  },
  close: function() {
    document.getElementById('focusOverlay').classList.remove('open');
  }
};

// ==================== TOAST ====================
function showToast(message, actionText, actionFn) {
  var container = document.getElementById('toastContainer');
  var toast = document.createElement('div');
  toast.className = 'toast';
  var span = document.createElement('span');
  span.textContent = message;
  toast.appendChild(span);
  if (actionText) {
    var btn = document.createElement('button');
    btn.className = 'toast-undo';
    btn.textContent = actionText;
    btn.onclick = function() {
      toast.remove();
      if (actionFn) actionFn();
    };
    toast.appendChild(btn);
  }
  container.appendChild(toast);
  // Auto remove after 8 seconds
  setTimeout(function() {
    if (toast.parentNode) toast.remove();
  }, 8000);
  return toast;
}

// ==================== SETTINGS DIALOG ====================
function openSettings() {
  document.getElementById('settingName').value = state.settings.name;
  document.getElementById('settingFocusMinutes').value = state.settings.focusMinutes;
  document.getElementById('settingBreakMinutes').value = state.settings.breakMinutes;
  document.querySelectorAll('.option-btn[data-goal]').forEach(function(btn) {
    btn.classList.toggle('active', parseInt(btn.dataset.goal) === state.settings.goal);
  });
  document.querySelectorAll('.option-btn[data-theme-opt]').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.themeOpt === state.settings.theme);
  });
  var soundBtn = document.getElementById('settingSound');
  soundBtn.textContent = state.settings.sound ? 'Aktif' : 'Nonaktif';
  soundBtn.classList.toggle('active', state.settings.sound);
  document.getElementById('settingsDialog').classList.add('open');
}

function closeSettings() {
  document.getElementById('settingsDialog').classList.remove('open');
}

function saveSettings() {
  var name = document.getElementById('settingName').value.trim() || 'Rado';
  var focusMin = clamp(parseInt(document.getElementById('settingFocusMinutes').value) || 25, 1, 120);
  var breakMin = clamp(parseInt(document.getElementById('settingBreakMinutes').value) || 5, 1, 60);
  var goalBtn = document.querySelector('.option-btn[data-goal].active');
  var goal = goalBtn ? parseInt(goalBtn.dataset.goal) : 4;
  var themeBtn = document.querySelector('.option-btn[data-theme-opt].active');
  var theme = themeBtn ? themeBtn.dataset.themeOpt : 'light';
  var sound = document.getElementById('settingSound').classList.contains('active');

  state.settings.name = name;
  state.settings.focusMinutes = focusMin;
  state.settings.breakMinutes = breakMin;
  state.settings.goal = goal;
  state.settings.theme = theme;
  state.settings.sound = sound;
  Store.save();
  Theme.apply();
  updateGreeting();
  Timer.updateDurations();
  renderTimer();
  renderStats();
  closeSettings();
}

// ==================== TASK DETAIL DIALOG ====================
var editingTaskId = null;

function openTaskDetail(id) {
  editingTaskId = id;
  if (id) {
    var t = state.tasks.find(function(x) { return x.id === id; });
    if (!t) return;
    document.getElementById('taskDetailTitle').textContent = 'Edit tugas';
    document.getElementById('taskTitleInput').value = t.title;
    document.getElementById('taskCategoryInput').value = t.category;
    document.getElementById('taskPriorityInput').value = t.priority;
  } else {
    document.getElementById('taskDetailTitle').textContent = 'Tambah tugas';
    document.getElementById('taskTitleInput').value = '';
    document.getElementById('taskCategoryInput').value = 'personal';
    document.getElementById('taskPriorityInput').value = 'normal';
  }
  document.getElementById('taskDetailDialog').classList.add('open');
  setTimeout(function() { document.getElementById('taskTitleInput').focus(); }, 50);
}

function closeTaskDetail() {
  document.getElementById('taskDetailDialog').classList.remove('open');
  editingTaskId = null;
}

function saveTaskDetail() {
  var title = document.getElementById('taskTitleInput').value.trim();
  var category = document.getElementById('taskCategoryInput').value;
  var priority = document.getElementById('taskPriorityInput').value;
  if (!title) return;
  if (editingTaskId) {
    Tasks.edit(editingTaskId, { title: title.slice(0, 160), category: category, priority: priority });
  } else {
    Tasks.add(title, category, priority);
  }
  closeTaskDetail();
}

// ==================== SHORTCUT DIALOG ====================
var editingLinkId = null;

function openShortcutDialog(id) {
  editingLinkId = id;
  if (id) {
    var l = state.links.find(function(x) { return x.id === id; });
    if (!l) return;
    document.getElementById('shortcutDialogTitle').textContent = 'Edit pintasan';
    document.getElementById('shortcutNameInput').value = l.name;
    document.getElementById('shortcutUrlInput').value = l.url;
  } else {
    document.getElementById('shortcutDialogTitle').textContent = 'Tambah pintasan';
    document.getElementById('shortcutNameInput').value = '';
    document.getElementById('shortcutUrlInput').value = '';
  }
  document.getElementById('shortcutDialog').classList.add('open');
  setTimeout(function() { document.getElementById('shortcutNameInput').focus(); }, 50);
}

function closeShortcutDialog() {
  document.getElementById('shortcutDialog').classList.remove('open');
  editingLinkId = null;
}

function saveShortcut() {
  var name = document.getElementById('shortcutNameInput').value.trim();
  var url = document.getElementById('shortcutUrlInput').value.trim();
  if (!name || !url) return;
  if (editingLinkId) {
    if (!Links.edit(editingLinkId, name, url)) {
      showToast('URL tidak valid. Gunakan HTTP atau HTTPS.');
      return;
    }
  } else {
    if (!Links.add(name, url)) {
      showToast('URL tidak valid. Gunakan HTTP atau HTTPS.');
      return;
    }
  }
  closeShortcutDialog();
}

// ==================== EVENT LISTENERS ====================
var currentFilter = 'all';

function setupEventListeners() {
  // Quick input
  var qi = document.getElementById('quickInput');
  qi.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      var title = qi.value.trim();
      if (title) {
        Tasks.add(title);
        qi.value = '';
      }
    }
  });

  // Add detail button
  document.getElementById('btnAddDetail').addEventListener('click', function() {
    openTaskDetail(null);
  });

  // Filters
  document.querySelectorAll('.filter-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderTasks();
    });
  });

  // Search
  document.getElementById('searchInput').addEventListener('input', renderTasks);

  // Sort
  document.getElementById('sortSelect').addEventListener('change', renderTasks);

  // Task list (event delegation)
  document.getElementById('taskList').addEventListener('click', function(e) {
    var target = e.target.closest('[data-action]');
    if (!target) return;
    var action = target.dataset.action;
    var id = target.dataset.id;
    if (action === 'toggle') { Tasks.toggle(id); }
    else if (action === 'focus') { Timer.setTask(id); }
    else if (action === 'edit') { openTaskDetail(id); }
    else if (action === 'delete') { Tasks.remove(id); }
  });

  // Empty state suggestions
  document.querySelectorAll('.btn-suggestion').forEach(function(btn) {
    btn.addEventListener('click', function() {
      Tasks.add(btn.dataset.suggestion);
    });
  });

  // Timer tabs
  document.querySelectorAll('.timer-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      switchMode(tab.dataset.mode);
    });
  });

  // Timer controls
  document.getElementById('btnTimerStart').addEventListener('click', function() { Timer.start(); });
  document.getElementById('btnTimerPause').addEventListener('click', function() { Timer.pause(); });
  document.getElementById('btnTimerResume').addEventListener('click', function() { Timer.resume(); });
  document.getElementById('btnTimerReset').addEventListener('click', function() { Timer.reset(); });

  // Timer task select
  document.getElementById('timerTaskSelect').addEventListener('change', function(e) {
    if (!Timer.setTask(e.target.value)) {
      renderTimer(); // revert select to actual state
    }
  });

  // Focus overlay
  document.getElementById('btnExpandFocus').addEventListener('click', function() { FocusMode.open(); });
  document.getElementById('btnExitFocus').addEventListener('click', function() { FocusMode.close(); });
  document.getElementById('btnFocusStart').addEventListener('click', function() { Timer.start(); });
  document.getElementById('btnFocusPause').addEventListener('click', function() { Timer.pause(); });
  document.getElementById('btnFocusResume').addEventListener('click', function() { Timer.resume(); });
  document.getElementById('btnFocusReset').addEventListener('click', function() { Timer.reset(); });

  // Shortcuts
  document.getElementById('btnAddShortcut').addEventListener('click', function() { openShortcutDialog(null); });
  document.getElementById('shortcutsGrid').addEventListener('click', function(e) {
    var actionBtn = e.target.closest('[data-link-action]');
    if (actionBtn) {
      e.stopPropagation();
      e.preventDefault();
      if (actionBtn.dataset.linkAction === 'edit') openShortcutDialog(actionBtn.dataset.id);
      else if (actionBtn.dataset.linkAction === 'delete') Links.remove(actionBtn.dataset.id);
      return;
    }
    var card = e.target.closest('.shortcut-card');
    if (card) {
      var url = card.dataset.url;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    }
  });

  // Shortcut dialog
  document.getElementById('btnShortcutSave').addEventListener('click', saveShortcut);
  document.getElementById('btnShortcutCancel').addEventListener('click', closeShortcutDialog);
  document.getElementById('btnCloseShortcut').addEventListener('click', closeShortcutDialog);

  // Settings
  document.getElementById('btnSettings').addEventListener('click', openSettings);
  document.getElementById('btnSettingsHeader').addEventListener('click', openSettings);
  document.getElementById('btnCloseSettings').addEventListener('click', closeSettings);
  document.getElementById('settingsDialog').addEventListener('click', function(e) {
    if (e.target === this) closeSettings();
  });

  // Settings options
  document.querySelectorAll('.option-btn[data-goal]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.option-btn[data-goal]').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
  });
  document.querySelectorAll('.option-btn[data-theme-opt]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.option-btn[data-theme-opt]').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
  });
  document.getElementById('settingSound').addEventListener('click', function() {
    var btn = this;
    var active = btn.classList.toggle('active');
    btn.textContent = active ? 'Aktif' : 'Nonaktif';
  });

  // Backup
  document.getElementById('btnExport').addEventListener('click', function() { Backup.export(); });
  document.getElementById('btnImport').addEventListener('click', function() { document.getElementById('importFile').click(); });
  document.getElementById('importFile').addEventListener('change', function(e) {
    if (e.target.files[0]) Backup.import(e.target.files[0]);
    e.target.value = '';
  });

  // Theme toggle
  document.getElementById('btnTheme').addEventListener('click', function() { Theme.cycle(); });

  // Task detail dialog
  document.getElementById('btnTaskSave').addEventListener('click', saveTaskDetail);
  document.getElementById('btnTaskCancel').addEventListener('click', closeTaskDetail);
  document.getElementById('btnCloseTaskDetail').addEventListener('click', closeTaskDetail);
  document.getElementById('taskDetailDialog').addEventListener('click', function(e) {
    if (e.target === this) closeTaskDetail();
  });
  document.getElementById('shortcutDialog').addEventListener('click', function(e) {
    if (e.target === this) closeShortcutDialog();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    // Ctrl+K / Cmd+K
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      document.getElementById('searchInput').focus();
      document.getElementById('searchInput').select();
    }
    // Escape
    if (e.key === 'Escape') {
      var openDialogs = document.querySelectorAll('.dialog-overlay.open');
      if (openDialogs.length > 0) {
        openDialogs[openDialogs.length - 1].classList.remove('open');
        editingTaskId = null;
        editingLinkId = null;
        return;
      }
      var focusOverlay = document.getElementById('focusOverlay');
      if (focusOverlay.classList.contains('open')) {
        FocusMode.close();
      }
    }
    // Enter in dialog inputs
    if (e.key === 'Enter') {
      if (document.getElementById('taskDetailDialog').classList.contains('open')) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
          saveTaskDetail();
        }
      } else if (document.getElementById('shortcutDialog').classList.contains('open')) {
        if (e.target.tagName === 'INPUT') {
          saveShortcut();
        }
      }
    }
  });

  // Sidebar navigation
  document.querySelectorAll('.menu-item[data-section]').forEach(function(item) {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      var section = item.dataset.section;
      document.querySelectorAll('.menu-item').forEach(function(m) { m.classList.remove('active'); });
      item.classList.add('active');
      var target = document.getElementById(section);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Cross-tab sync
  window.addEventListener('storage', function(e) {
    if (e.key !== STORAGE_KEY) return;
    if (!e.newValue) return;
    try {
      var data = JSON.parse(e.newValue);
      if (!validateState(data)) {
        showToast('Data dari tab lain tidak valid.');
        return;
      }
      state = validateAndFill(data);
      renderAll();
      // Don't write back to prevent loop
    } catch(err) {
      showToast('Gagal membaca data dari tab lain.');
    }
  });
}

function validateState(data) {
  if (!data || typeof data !== 'object') return false;
  if (!data.settings || typeof data.settings !== 'object') return false;
  if (typeof data.settings.name !== 'string') return false;
  return true;
}

// ==================== INIT ====================
function init() {
  state = Store.load();
  lastDateStr = todayStr();
  Theme.apply();
  Theme.watchSystem();
  setupEventListeners();
  renderAll();

  // Check if timer was running and may have completed during refresh
  if (state.timer.running && state.timer.endAt) {
    var remaining = Math.round((state.timer.endAt - Date.now()) / 1000);
    if (remaining <= 0) {
      // Session completed while page was away
      Timer.complete();
    } else {
      startTimerTick();
    }
  }

  // Start clock
  clockInterval = setInterval(updateClock, 1000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
})();
