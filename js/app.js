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
var lastDateStr = '';
var storageReadBlocked = false;

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
      storageReadBlocked = true;
      setStorageStatus(false);
      setTimeout(function() {
        showToast('Data browser tidak terbaca. Perubahan sementara belum disimpan. Pulihkan cadangan melalui Impor.');
      }, 0);
      return defaultState();
    }
  },
  save: function() {
    if (storageReadBlocked) {
      showToast('Data lama tetap disimpan. Pulihkan cadangan melalui Impor sebelum menyimpan perubahan.');
      return false;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setStorageStatus(true);
      return true;
    } catch(e) {
      setStorageStatus(false);
      showToast('Penyimpanan browser gagal. Coba periksa ruang penyimpanan.');
      return false;
    }
  }
};

function setStorageStatus(saved) {
  var indicator = document.getElementById('storageIndicator');
  if (!indicator) return;
  indicator.querySelector('.storage-text').textContent = saved ? 'Tersimpan' : 'Belum tersimpan';
  indicator.title = saved ? 'Data tersimpan di browser ini' : 'Perubahan belum tersimpan. Ekspor cadangan sebelum menutup halaman.';
}

// ==================== MIGRATION ====================
function migrate(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid stored data');
  if (data.version !== undefined && data.version !== 0 && data.version !== 1) throw new Error('Unsupported data version');
  // Check for old format (no version field or version mismatch)
  if (!data.version || data.version !== 1) {
    var legacySettings = data.settings;
    var knownLegacy = legacySettings && (legacySettings.focusDuration !== undefined || legacySettings.breakDuration !== undefined || legacySettings.dailyTarget !== undefined);
    if (!knownLegacy && !Array.isArray(data.shortcuts) && !(data.history && Array.isArray(data.history.sessions))) throw new Error('Unknown stored data');
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
          createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
          completedAt: t.completedAt ? new Date(t.completedAt).toISOString() : null
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
      migrated.sessions = data.history.sessions.filter(function(s) { return s.type !== 'break'; }).map(function(s) {
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
    migrated.timer.total = migrated.settings.focusMinutes * 60;
    migrated.timer.remaining = migrated.timer.total;
    return validateAndFill(migrated);
  }
  // Version 1: validate and fill missing fields
  return validateAndFill(data);
}

function validateAndFill(data) {
  if (!validateBackup(data)) throw new Error('Invalid data');
  var result = {
    version: 1,
    settings: {
      name: data.settings.name.trim(),
      focusMinutes: data.settings.focusMinutes,
      breakMinutes: data.settings.breakMinutes,
      goal: data.settings.goal,
      theme: data.settings.theme,
      sound: data.settings.sound
    },
    tasks: data.tasks.map(normalizeTask),
    links: data.links.map(normalizeLink),
    sessions: data.sessions.map(normalizeSession),
    timer: normalizeTimer(data.timer)
  };
  // A saved timer belongs to its session, including a paused or completed one.
  // Applying new durations is handled by settings/reset, never by loading data.
  if (!result.tasks.some(function(t) { return t.id === result.timer.taskId && !t.done; })) result.timer.taskId = '';
  return result;
}

function isValidTask(t) { return t && typeof t.title === 'string' && t.title.trim().length > 0; }
function normalizeTask(t) {
  return {
    id: t.id || generateId(),
    title: t.title.trim(),
    category: ['personal','belajar','kerja'].indexOf(t.category) >= 0 ? t.category : 'personal',
    priority: ['high','normal','low'].indexOf(t.priority) >= 0 ? t.priority : 'normal',
    done: !!t.done,
    createdAt: t.createdAt || new Date().toISOString(),
    completedAt: t.completedAt || null
  };
}
function isValidLink(l) { return l && typeof l.name === 'string' && typeof l.url === 'string'; }
function normalizeLink(l) { return { id: l.id, name: l.name.trim(), url: Links.validateUrl(l.url) }; }
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
function todayStr() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); }
function dateToStr(d) { return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); }

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
  var greeting = getGreetingPrefix(h) + ', ' + name + '.';
  var greetingEl = document.getElementById('greeting');
  if (greetingEl.textContent !== greeting) greetingEl.textContent = greeting;
  if (document.getElementById('sidebarUserName').textContent !== name) updateAvatar(name);
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
  updateGreeting();
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
    if (!t) return false;
    // Check duplicate on title change or reactivation
    var newTitle = updates.title !== undefined ? updates.title : t.title;
    var newDone = updates.done !== undefined ? updates.done : t.done;
    if (!newDone) {
      var normTitle = newTitle.toLowerCase().replace(/\s+/g, ' ').trim();
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
    if (t.done && state.timer.taskId === id) state.timer.taskId = '';
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
    if (t.done && state.timer.taskId === id) state.timer.taskId = '';
    Store.save();
    renderTasks();
    renderStats();
  },
  remove: function(id) {
    var idx = state.tasks.findIndex(function(x) { return x.id === id; });
    if (idx < 0) return;
    var removed = state.tasks[idx];
    var wasFocused = state.timer.taskId === id;
    var timerId = state.timer.id;
    state.tasks.splice(idx, 1);
    if (wasFocused) state.timer.taskId = '';
    Store.save();
    renderTasks();
    renderStats();
    // Undo
    var canUndo = true;
    showToast('Tugas dihapus.', 'Urungkan', function() {
      if (!canUndo || state.tasks.some(function(t) { return t.id === removed.id; })) return;
      canUndo = false;
      state.tasks.splice(Math.min(idx, state.tasks.length), 0, removed);
      if (wasFocused && !removed.done && !state.timer.taskId && state.timer.id === timerId) state.timer.taskId = id;
      Store.save();
      renderTasks();
      renderStats();
    });
    setTimeout(function() { canUndo = false; }, 8000);
  },
  focusCount: function(taskId) {
    if (!taskId) return 0;
    return state.sessions.filter(function(s) { return s.taskId === taskId; }).length;
  }
};

// ==================== TIMER ====================
var Timer = {
  start: function() {
    var t = state.timer;
    if (t.running) return;
    ensureAudioContext();
    // If completed (remaining <= 0), start fresh session with new ID
    if (t.remaining <= 0 || state.sessions.some(function(s) { return s.id === t.id; })) {
      t.id = generateId();
      t.total = t.mode === 'focus' ? state.settings.focusMinutes * 60 : state.settings.breakMinutes * 60;
      t.remaining = t.total;
    }
    t.running = true;
    t.endAt = Date.now() + t.remaining * 1000;
    Store.save();
    renderTimer();
    startTimerTick();
  },
  pause: function() {
    var t = state.timer;
    if (!t.running) return;
    if (t.endAt <= Date.now()) { Timer.complete(); return; }
    t.remaining = Math.max(0, (t.endAt - Date.now()) / 1000);
    t.running = false;
    t.endAt = null;
    Store.save();
    renderTimer();
    stopTimerTick();
  },
  resume: function() {
    Timer.start();
  },
  reset: function() {
    var t = state.timer;
    stopTimerTick();
    t.id = generateId(); // new session ID
    t.running = false;
    t.total = t.mode === 'focus' ? state.settings.focusMinutes * 60 : state.settings.breakMinutes * 60;
    t.remaining = t.total;
    t.endAt = null;
    Store.save();
    renderTimer();
  },
  getRemaining: function() {
    var t = state.timer;
    if (t.running && t.endAt) {
      return Math.max(0, (t.endAt - Date.now()) / 1000);
    }
    return t.remaining;
  },
  getProgress: function() {
    var t = state.timer;
    var remaining = Timer.getRemaining();
    return t.total > 0 ? (t.total - remaining) / t.total : 0;
  },
  tick: function() {
    if (!state.timer.running) return;
    var remaining = Timer.getRemaining();
    updateTimerDisplay(remaining);
    if (remaining <= 0) {
      Timer.complete();
    }
  },
  complete: function() {
    var t = state.timer;
    if (!t.running) return;
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
    renderTasks();
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
    if (mode === t.mode) return true;
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
    // Only update idle timers (never started, remaining === total)
    if (!t.running && t.remaining > 0 && t.remaining === t.total) {
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
  remaining = Math.max(0, Math.ceil(remaining));
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
    if (typeof url !== 'string' || !url) return null;
    url = url.trim();
    if (!url) return null;
    // Add protocol if missing
    if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) {
      url = 'https://' + url;
    }
    try {
      var u = new URL(url);
      if ((u.protocol !== 'http:' && u.protocol !== 'https:') || !u.hostname || u.username || u.password) return null;
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
      t.remaining = Math.max(0, (t.endAt - Date.now()) / 1000);
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
        if (!validateBackup(data)) throw new Error('Invalid data');
        var validated = validateAndFill(data);
        // Show confirmation
        var msg = 'Impor ' + validated.tasks.length + ' tugas, ' + validated.links.length + ' pintasan, ' + validated.sessions.length + ' sesi? Data saat ini akan diganti.';
        showToast(msg, 'Konfirmasi', function() {
          var previousState = state;
          var previousBlocked = storageReadBlocked;
          state = validated;
          // Reset timer to focus idle
          state.timer = defaultState().timer;
          state.timer.total = state.settings.focusMinutes * 60;
          state.timer.remaining = state.timer.total;
          storageReadBlocked = false;
          if (!Store.save()) {
            state = previousState;
            storageReadBlocked = previousBlocked;
            showToast('Cadangan belum dipulihkan karena penyimpanan gagal. Data sebelumnya tetap tersedia.');
            return;
          }
          Theme.apply();
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
  Timer.updateDurations();
  renderTasks();
  renderTimer();
  renderStats();
  renderActivity();
  renderLinks();
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
    updateTimerTaskSelect();
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
    if (sortBy === 'priority') {
      var pa = priorityOrder[a.priority] !== undefined ? priorityOrder[a.priority] : 1;
      var pb = priorityOrder[b.priority] !== undefined ? priorityOrder[b.priority] : 1;
      return pa - pb;
    }
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
      actions += '<button class="task-action-btn" data-action="focus" data-id="' + escapeHtml(t.id) + '" title="Fokus" aria-label="Fokus">' + iconTimer() + '</button>';
    }
    actions += '<button class="task-action-btn" data-action="edit" data-id="' + escapeHtml(t.id) + '" title="Edit" aria-label="Edit">' + iconEdit() + '</button>';
    actions += '<button class="task-action-btn" data-action="delete" data-id="' + escapeHtml(t.id) + '" title="Hapus" aria-label="Hapus">' + iconDelete() + '</button>';

    return '<div class="task-item' + (t.done ? ' done' : '') + '" data-id="' + escapeHtml(t.id) + '">' +
      '<div class="task-checkbox" data-action="toggle" data-id="' + escapeHtml(t.id) + '" role="checkbox" aria-checked="' + t.done + '" aria-label="' + escapeHtml((t.done ? 'Tandai belum selesai: ' : 'Selesaikan: ') + t.title) + '" tabindex="0">' +
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
  updateTimerTaskSelect();
}

function updateTimerTaskSelect() {
  var select = document.getElementById('timerTaskSelect');
  if (!select) return;
  var currentTaskId = state.timer.taskId;
  var options = '<option value="">Fokus tanpa tugas tertentu</option>';
  state.tasks.filter(function(x) { return !x.done; }).forEach(function(task) {
    var sel = task.id === currentTaskId ? ' selected' : '';
    options += '<option value="' + escapeHtml(task.id) + '"' + sel + '>' + escapeHtml(task.title) + '</option>';
  });
  select.innerHTML = options;
  select.value = currentTaskId;
  select.disabled = state.timer.running || state.timer.mode === 'break';
  var task = state.tasks.find(function(t) { return t.id === currentTaskId && !t.done; });
  document.getElementById('focusTaskName').textContent = task ? task.title : 'Fokus tanpa tugas tertentu';
}

function renderTimer() {
  var t = state.timer;
  var remaining = Timer.getRemaining();
  updateTimerDisplay(remaining);
  // Title
  var title = document.getElementById('timerTitle');
  if (t.mode === 'focus') title.textContent = 'Waktunya fokus';
  else title.textContent = 'Waktunya istirahat';
  document.getElementById('btnTimerStart').textContent = t.mode === 'focus' ? 'Mulai fokus' : 'Mulai istirahat';
  document.getElementById('btnFocusStart').textContent = t.mode === 'focus' ? 'Mulai fokus' : 'Mulai istirahat';
  // Tabs
  document.querySelectorAll('.timer-tab').forEach(function(tab) {
    tab.classList.toggle('active', tab.dataset.mode === t.mode);
  });
  // Buttons
  document.getElementById('btnTimerStart').style.display = t.running ? 'none' : 'inline-flex';
  document.getElementById('btnTimerPause').style.display = t.running ? 'inline-flex' : 'none';
  document.getElementById('btnTimerResume').style.display = 'none';
  // If paused (remaining < total, remaining > 0, not running)
  if (!t.running && t.remaining < t.total && t.remaining > 0) {
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
  if (fr && !t.running && t.remaining < t.total && t.remaining > 0) {
    if (fs) fs.style.display = 'none';
    if (fr) fr.style.display = 'inline-flex';
  }
  updateTimerTaskSelect();
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
      icon = '<div class="shortcut-icon" style="background:' + colors.bg + ';color:' + colors.text + ';border-color:#e8e9e1;">' + escapeHtml(monogram) + '</div>';
    }
    return '<div class="shortcut-card" data-url="' + escapeHtml(l.url) + '" data-id="' + escapeHtml(l.id) + '">' +
      icon +
      '<div class="shortcut-name">' + escapeHtml(l.name) + '</div>' +
      '<div class="shortcut-actions">' +
      '<button class="shortcut-action-btn" data-link-action="edit" data-id="' + escapeHtml(l.id) + '" aria-label="Edit">' + iconEdit() + '</button>' +
      '<button class="shortcut-action-btn" data-link-action="delete" data-id="' + escapeHtml(l.id) + '" aria-label="Hapus">' + iconDelete() + '</button>' +
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
  return String(str == null ? '' : str).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
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
  var name = document.getElementById('settingName').value.trim();
  var focusMin = Number(document.getElementById('settingFocusMinutes').value);
  var breakMin = Number(document.getElementById('settingBreakMinutes').value);
  if (!name || name.length > 32 || !Number.isInteger(focusMin) || focusMin < 1 || focusMin > 120 || !Number.isInteger(breakMin) || breakMin < 1 || breakMin > 60) {
    showToast('Isi nama dan durasi dalam rentang yang tersedia.');
    return;
  }
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
  Timer.updateDurations();
  if (!Store.save()) return;
  Theme.apply();
  updateGreeting();
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
  var saved;
  if (editingTaskId) {
    saved = Tasks.edit(editingTaskId, { title: title.slice(0, 160), category: category, priority: priority });
  } else {
    saved = Tasks.add(title, category, priority);
  }
  if (saved) closeTaskDetail();
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

  // Task checkbox keyboard support (Space/Enter)
  document.getElementById('taskList').addEventListener('keydown', function(e) {
    if (e.key === ' ' || e.key === 'Enter') {
      var target = e.target.closest('[data-action="toggle"]');
      if (target) {
        e.preventDefault();
        var taskId = target.dataset.id;
        Tasks.toggle(taskId);
        var row = Array.from(document.querySelectorAll('.task-item')).find(function(item) { return item.dataset.id === taskId; });
        var nextControl = row ? row.querySelector('[data-action="toggle"]') : document.querySelector('.filter-btn.active');
        if (nextControl) nextControl.focus();
      }
    }
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
  document.getElementById('btnSettingsSave').addEventListener('click', saveSettings);
  document.getElementById('btnSettingsCancel').addEventListener('click', closeSettings);
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
      if (!validateBackup(data)) {
        showToast('Data dari tab lain tidak valid.');
        return;
      }
      state = validateAndFill(data);
      Theme.apply();
      renderAll();
      // Don't write back to prevent loop
    } catch(err) {
      showToast('Gagal membaca data dari tab lain.');
    }
  });
}

function isValidISODate(str) {
  if (typeof str !== 'string') return false;
  var parts = str.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/);
  if (!parts || !Number.isFinite(new Date(str).getTime())) return false;
  var year = Number(parts[1]), month = Number(parts[2]), day = Number(parts[3]);
  var leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  var days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1] && Number(parts[4]) < 24 && Number(parts[5]) < 60 && Number(parts[6]) < 60;
}

function validId(id) {
  return typeof id === 'string' && id.trim().length > 0 && id.length <= 100 && !/[\u0000-\u001f\u007f]/.test(id);
}

function integerInRange(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function validateBackup(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== 1) return false;
  var s = data.settings;
  if (!s || typeof s !== 'object' || typeof s.name !== 'string' || !s.name.trim() || s.name.length > 32) return false;
  if (!integerInRange(s.focusMinutes, 1, 120) || !integerInRange(s.breakMinutes, 1, 60)) return false;
  if ([2, 4, 6, 8].indexOf(s.goal) < 0 || ['light', 'dark', 'system'].indexOf(s.theme) < 0 || typeof s.sound !== 'boolean') return false;
  if (!Array.isArray(data.tasks) || data.tasks.length > 3000 || !Array.isArray(data.links) || data.links.length > 100 || !Array.isArray(data.sessions) || data.sessions.length > 10000) return false;

  var taskIds = Object.create(null);
  for (var i = 0; i < data.tasks.length; i++) {
    var task = data.tasks[i];
    if (!task || !validId(task.id) || taskIds[task.id]) return false;
    taskIds[task.id] = true;
    if (typeof task.title !== 'string' || !task.title.trim() || task.title.length > 160) return false;
    if (['personal', 'belajar', 'kerja'].indexOf(task.category) < 0 || ['high', 'normal', 'low'].indexOf(task.priority) < 0 || typeof task.done !== 'boolean') return false;
    if (!isValidISODate(task.createdAt)) return false;
    if (task.done ? !isValidISODate(task.completedAt) : task.completedAt !== null) return false;
  }

  var linkIds = Object.create(null);
  for (var j = 0; j < data.links.length; j++) {
    var link = data.links[j];
    if (!link || !validId(link.id) || linkIds[link.id]) return false;
    linkIds[link.id] = true;
    if (typeof link.name !== 'string' || !link.name.trim() || link.name.length > 40 || typeof link.url !== 'string' || link.url.length > 2048 || !Links.validateUrl(link.url)) return false;
  }

  var sessionIds = Object.create(null);
  for (var k = 0; k < data.sessions.length; k++) {
    var session = data.sessions[k];
    if (!session || !validId(session.id) || sessionIds[session.id]) return false;
    sessionIds[session.id] = true;
    if (!isValidISODate(session.endedAt) || !integerInRange(session.seconds, 60, 7200)) return false;
    if (session.taskId !== '' && !validId(session.taskId)) return false;
  }

  var timer = data.timer;
  if (!timer || !validId(timer.id) || ['focus', 'break'].indexOf(timer.mode) < 0) return false;
  if (!integerInRange(timer.total, 60, timer.mode === 'break' ? 3600 : 7200)) return false;
  if (!Number.isFinite(timer.remaining) || timer.remaining < 0 || timer.remaining > timer.total || typeof timer.running !== 'boolean') return false;
  if (timer.running ? !Number.isFinite(timer.endAt) || timer.endAt <= 0 || !Number.isFinite(new Date(timer.endAt).getTime()) : timer.endAt !== null) return false;
  if (timer.taskId !== '' && !validId(timer.taskId)) return false;
  return true;
}

function validateState(data) {
  return validateBackup(data);
}

// ==================== INIT ====================
function init() {
  state = Store.load();
  lastDateStr = todayStr();
  Theme.apply();
  Theme.watchSystem();
  setupEventListeners();
  var tzEl = document.getElementById('timezoneText');
  if (tzEl) tzEl.textContent = getTimezoneLabel();
  renderAll();

  // Check if timer was running and may have completed during refresh
  if (state.timer.running && state.timer.endAt) {
    var remaining = (state.timer.endAt - Date.now()) / 1000;
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
