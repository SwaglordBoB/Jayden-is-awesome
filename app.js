/**
 * AeroSched - Visual Schedule Reader & Customizer
 * Core Javascript Application Logic with PIN Security & Cloud Sync
 */

document.addEventListener('DOMContentLoaded', () => {
  
  // ==========================================
  // APPLICATION STATE
  // ==========================================
  let appState = {
    username: 'Guest Planner',
    pin: '', // Security passcode PIN (4-digits, e.g. "1234")
    hashedSyncKey: '', // Key for Cloud database operations
    theme: 'midnight',
    hourFormat: '12h', // '12h' or '24h'
    fontSize: 'normal', // 'normal' or 'large'
    events: [],
    uploadedImageSrc: '',
    minHour: 8,
    maxHour: 18,
    activeView: 'daily', // 'daily' (Timeline agenda) or 'weekly' (Calendar Grid)
    defaultColors: [
      { color: "#6366f1", rgb: "99, 102, 241" }, // Indigo
      { color: "#ec4899", rgb: "236, 72, 153" }, // Pink
      { color: "#10b981", rgb: "16, 185, 129" }, // Emerald
      { color: "#f59e0b", rgb: "245, 158, 11" },  // Amber
      { color: "#3b82f6", rgb: "59, 130, 246" },  // Blue
      { color: "#8b5cf6", rgb: "139, 92, 246" }, // Purple
      { color: "#ef4444", rgb: "239, 68, 68" },   // Red
      { color: "#06b6d4", rgb: "6, 182, 212" }    // Cyan
    ],
    defaultEmojis: ["📚", "🔬", "💻", "🎨", "🏋️", "⏰", "☕", "📝", "🧠", "🧬", "⚖️", "🌍", "🎭", "🍔", "💼", "✈️"]
  };

  // ==========================================
  // DOM ELEMENT REFERENCES
  // ==========================================
  const stages = {
    upload: document.getElementById('stage-upload'),
    lock: document.getElementById('stage-lock'),
    parsing: document.getElementById('stage-parsing'),
    workspace: document.getElementById('stage-workspace')
  };

  const loader = {
    panel: document.getElementById('parsing-loader'),
    title: document.getElementById('loader-title'),
    subtitle: document.getElementById('loader-subtitle'),
    ring: document.getElementById('progress-ring'),
    pct: document.getElementById('progress-pct')
  };

  const review = {
    panel: document.getElementById('parsing-review'),
    img: document.getElementById('review-img'),
    rows: document.getElementById('parsed-rows')
  };

  const modal = {
    overlay: document.getElementById('event-modal'),
    heading: document.getElementById('modal-heading'),
    eventId: document.getElementById('modal-event-id'),
    title: document.getElementById('modal-title'),
    day: document.getElementById('modal-day'),
    emoji: document.getElementById('modal-emoji'),
    startTime: document.getElementById('modal-start-time'),
    endTime: document.getElementById('modal-end-time'),
    location: document.getElementById('modal-location'),
    instructor: document.getElementById('modal-instructor'),
    emojiPicker: document.getElementById('emoji-picker'),
    colorPicker: document.getElementById('color-picker'),
    btnDelete: document.getElementById('btn-delete-modal-event'),
    btnSave: document.getElementById('btn-save-modal-event'),
    btnCancel: document.getElementById('btn-cancel-modal')
  };

  // Welcome page inputs
  const usernameInput = document.getElementById('username-input');
  const pinInput = document.getElementById('pin-input');
  const fileInput = document.getElementById('file-input');
  const dropzone = document.getElementById('dropzone');
  const btnDemoStart = document.getElementById('btn-demo-start');
  const linkCloudSyncLoad = document.getElementById('link-cloud-sync-load');
  
  // Header Meta User badge
  const userBadgeName = document.getElementById('badge-name');
  const userBadge = document.getElementById('user-badge');
  const cloudStatusBadge = document.getElementById('cloud-status');

  // Review stage buttons
  const btnAddRow = document.getElementById('btn-add-row');
  const btnCompile = document.getElementById('btn-compile-schedule');
  const btnReupload = document.getElementById('btn-reupload');

  // Sidebar Workspace Buttons/Toggles
  const themeOptions = document.querySelectorAll('.theme-option');
  const btn12h = document.getElementById('btn-12h');
  const btn24h = document.getElementById('btn-24h');
  const btnSizeNormal = document.getElementById('btn-size-normal');
  const btnSizeLarge = document.getElementById('btn-size-large');
  const btnManualAdd = document.getElementById('btn-add-manual-event');
  const btnClearSchedule = document.getElementById('btn-clear-schedule');
  const btnBackToUpload = document.getElementById('btn-back-to-upload');
  
  // PIN Sidebar settings
  const sidebarPinInput = document.getElementById('sidebar-pin-input');
  const btnUpdatePin = document.getElementById('btn-update-pin');
  const btnSidebarSync = document.getElementById('btn-sidebar-sync');

  // Lock Screen elements
  const lockCard = document.querySelector('.lock-card');
  const lockTitle = document.getElementById('lock-title');
  const lockSubtitle = document.getElementById('lock-subtitle');
  const passcodeDots = document.getElementById('passcode-dots');
  const keypadButtons = document.querySelectorAll('.key-btn');
  const btnLockSwitchUser = document.getElementById('btn-lock-switch');
  
  // Workspace calendar elements (Weekly Grid)
  const calendarTitle = document.getElementById('calendar-title');
  const btnExportPdf = document.getElementById('btn-export-pdf');
  const calendarRowsContainer = document.getElementById('calendar-rows');
  const weeklyGridContainer = document.getElementById('schedule-print-area');
  const btnViewDaily = document.getElementById('btn-view-daily');

  // Workspace Daily Agenda Elements
  const dailyViewContainer = document.getElementById('workspace-daily');
  const dailyGreeting = document.getElementById('daily-greeting');
  const dailyDateLabel = document.getElementById('daily-date-label');
  const btnViewWeekly = document.getElementById('btn-view-weekly');
  const dailyDashboardGrid = document.getElementById('daily-dashboard-grid');
  const activeClassPanel = document.getElementById('active-class-panel');
  const activeClassTitle = document.getElementById('active-class-title');
  const activeClassTime = document.getElementById('active-class-time');
  const activeClassLoc = document.getElementById('active-class-loc');
  const activeProgressFill = document.getElementById('active-progress-fill');
  const activeElapsed = document.getElementById('active-elapsed');
  const activeRemaining = document.getElementById('active-remaining');
  const dailyTimelineList = document.getElementById('daily-timeline-list');
  const dailyEmptyPanel = document.getElementById('daily-empty-panel');
  const btnEmptyViewWeekly = document.getElementById('btn-empty-view-weekly');

  // PIN buffer array for passcode entry
  let pinBuffer = [];
  let dailyUpdateInterval = null;

  // ==========================================
  // VIEW ROUTING ENGINE
  // ==========================================
  function showStage(stageId) {
    Object.keys(stages).forEach(key => {
      if (key === stageId) {
        stages[key].classList.add('active');
      } else {
        stages[key].classList.remove('active');
      }
    });

    // Clear background interval if leaving workspace
    if (stageId !== 'workspace' && dailyUpdateInterval) {
      clearInterval(dailyUpdateInterval);
      dailyUpdateInterval = null;
    }
  }

  // ==========================================
  // DYNAMIC CLOUD SYNC & CRYPTO HASHING
  // ==========================================
  
  // Secure SHA-256 hashing for cloud key mapping using native Web Crypto API
  async function hashCredentials(username, pin) {
    const formattedName = username.toLowerCase().trim();
    const msgBuffer = new TextEncoder().encode(`${formattedName}_${pin.trim()}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Auto-update visual status badge for cloud sync
  function updateCloudStatus(enabled, label, loading = false) {
    if (!enabled) {
      cloudStatusBadge.style.display = 'none';
      return;
    }

    cloudStatusBadge.style.display = 'flex';
    
    // Status text
    const textNode = cloudStatusBadge.querySelector('span:last-child');
    textNode.textContent = label;

    // Glowing bullet
    const pulseDot = cloudStatusBadge.querySelector('.pulse-dot');
    if (loading) {
      pulseDot.style.backgroundColor = '#fb923c'; // orange
      pulseDot.style.animation = 'pulse-active 1s infinite ease-in-out';
    } else if (label.toLowerCase().includes('error')) {
      pulseDot.style.backgroundColor = '#ef4444'; // red
      pulseDot.style.animation = 'none';
    } else {
      pulseDot.style.backgroundColor = '#10b981'; // green (synced)
      pulseDot.style.animation = 'pulse-active 2s infinite ease-in-out';
    }
  }

  // Sync state to KVdb.io Key-Value cloud storage
  async function syncStateToCloud() {
    if (!appState.username || !appState.pin) {
      updateCloudStatus(false);
      return;
    }

    updateCloudStatus(true, 'Cloud Syncing...', true);
    
    try {
      const syncKey = await hashCredentials(appState.username, appState.pin);
      appState.hashedSyncKey = syncKey;
      localStorage.setItem('aerosched_sync_key', syncKey);

      const payload = JSON.stringify({
        username: appState.username,
        theme: appState.theme,
        hourFormat: appState.hourFormat,
        fontSize: appState.fontSize,
        events: appState.events
      });

      // Write key value to KVdb bucket
      const response = await fetch(`https://kvdb.io/K9hRj2x7nPfD8aB4mSwZ9/${syncKey}`, {
        method: 'POST',
        body: payload
      });

      if (response.ok) {
        updateCloudStatus(true, 'Synced to Cloud');
      } else {
        throw new Error('HTTP write failed');
      }
    } catch (err) {
      console.error('Cloud Sync Error:', err);
      updateCloudStatus(true, 'Cloud Offline', false);
    }
  }

  // Pull schedule from KVdb.io Cloud bucket
  async function pullStateFromCloud(name, pin) {
    const syncKey = await hashCredentials(name, pin);
    
    try {
      const response = await fetch(`https://kvdb.io/K9hRj2x7nPfD8aB4mSwZ9/${syncKey}`);
      if (response.ok) {
        const text = await response.text();
        if (text && text.trim().startsWith('{')) {
          const data = JSON.parse(text);
          
          // Hydrate local state
          appState.username = data.username || name;
          appState.pin = pin;
          appState.hashedSyncKey = syncKey;
          appState.theme = data.theme || 'midnight';
          appState.hourFormat = data.hourFormat || '12h';
          appState.fontSize = data.fontSize || 'normal';
          appState.events = data.events || [];
          
          // Synchronize cached inputs
          usernameInput.value = appState.username;
          sidebarPinInput.value = appState.pin;
          
          // Store locally
          localStorage.setItem('aerosched_pin', pin);
          localStorage.setItem('aerosched_sync_key', syncKey);
          saveStateToLocalStorage();

          // Apply configurations
          applyTheme(appState.theme);
          applyHourFormat(appState.hourFormat);
          applyFontSize(appState.fontSize);
          updateHeaderBadge();
          updateCloudStatus(true, 'Cloud Synced');

          return true;
        }
      }
    } catch (err) {
      console.error('Error fetching cloud roster:', err);
    }
    return false;
  }

  // ==========================================
  // LOCALSTORAGE PERSISTENCE
  // ==========================================
  function saveStateToLocalStorage() {
    localStorage.setItem('aerosched_state', JSON.stringify({
      username: appState.username,
      theme: appState.theme,
      hourFormat: appState.hourFormat,
      fontSize: appState.fontSize,
      events: appState.events
    }));
  }

  function loadStateFromLocalStorage() {
    const savedState = localStorage.getItem('aerosched_state');
    const savedPin = localStorage.getItem('aerosched_pin');
    const savedSyncKey = localStorage.getItem('aerosched_sync_key');

    if (savedPin) {
      appState.pin = savedPin;
      sidebarPinInput.value = savedPin;
    }
    
    if (savedSyncKey) {
      appState.hashedSyncKey = savedSyncKey;
    }

    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        appState.username = parsed.username || appState.username;
        appState.theme = parsed.theme || appState.theme;
        appState.hourFormat = parsed.hourFormat || appState.hourFormat;
        appState.fontSize = parsed.fontSize || appState.fontSize;
        appState.events = parsed.events || [];
        
        usernameInput.value = appState.username;

        applyTheme(appState.theme);
        applyHourFormat(appState.hourFormat);
        applyFontSize(appState.fontSize);

        if (appState.events.length > 0) {
          updateHeaderBadge();
          
          // If security PIN is active, direct straight to LOCK screen on load!
          if (appState.pin) {
            setupLockDotsDisplay();
            showStage('lock');
          } else {
            // Otherwise direct straight to dynamic Dashboard
            updateCloudStatus(false);
            initializeDashboardView();
            showStage('workspace');
          }
        }
      } catch (e) {
        console.error("Local storage restoration issue:", e);
      }
    }
  }

  // ==========================================
  // WELCOME STAGE, FILE DROPS & DEMO RUNS
  // ==========================================
  
  // File dragover transitions
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt.files.length > 0) {
      handleUploadedFile(dt.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleUploadedFile(e.target.files[0]);
    }
  });

  usernameInput.addEventListener('input', () => {
    appState.username = usernameInput.value.trim() || 'Guest Planner';
    updateHeaderBadge();
  });

  function updateHeaderBadge() {
    userBadgeName.textContent = appState.username;
    userBadge.style.display = 'flex';
    calendarTitle.textContent = `${appState.username}'s Custom Schedule`;
  }

  function handleUploadedFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, or WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      appState.uploadedImageSrc = e.target.result;
      review.img.src = appState.uploadedImageSrc;
      
      // Pull name & PIN values on upload
      appState.username = usernameInput.value.trim() || 'Guest Planner';
      appState.pin = pinInput.value.trim();
      sidebarPinInput.value = appState.pin;
      
      if (appState.pin) {
        localStorage.setItem('aerosched_pin', appState.pin);
      } else {
        localStorage.removeItem('aerosched_pin');
      }

      updateHeaderBadge();

      showStage('parsing');
      loader.panel.style.display = 'flex';
      review.panel.style.display = 'none';

      runTesseractOCR(file);
    };
    reader.readAsDataURL(file);
  }

  // Onboarding Cloud pull recovery trigger
  linkCloudSyncLoad.addEventListener('click', async (e) => {
    e.preventDefault();
    const name = usernameInput.value.trim();
    const pin = pinInput.value.trim();

    if (!name || !pin || pin.length !== 4) {
      alert("Please enter both your Name and 4-digit security PIN in the onboarding fields above to pull your backup from the cloud.");
      return;
    }

    linkCloudSyncLoad.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Pulling Backup...`;
    
    const success = await pullStateFromCloud(name, pin);
    if (success) {
      initializeDashboardView();
      showStage('workspace');
    } else {
      alert("No active cloud backup was found matching that Name and PIN combination. Please check details and try again!");
    }
    
    linkCloudSyncLoad.innerHTML = `Load from Cloud <i class="fa-solid fa-cloud-arrow-down"></i>`;
  });

  // ==========================================
  // TESSERACT CLIENT-SIDE OCR ENGINE
  // ==========================================
  function updateLoader(title, subtitle, pct) {
    loader.title.textContent = title;
    loader.subtitle.textContent = subtitle;
    loader.pct.textContent = `${pct}%`;
    loader.ring.style.background = `conic-gradient(var(--accent-primary) ${pct * 3.6}deg, var(--bg-tertiary) 0deg)`;
  }

  function runTesseractOCR(file) {
    updateLoader('Initializing OCR Engine...', 'Spinning up language modules and worker threads...', 10);
    
    Tesseract.recognize(
      file,
      'eng',
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            const pct = Math.round(m.progress * 80) + 15;
            updateLoader('Analyzing Schedule Roster...', `Running optical text recognizer (${pct}%)...`, pct);
          } else {
            updateLoader('Preparing Image...', `Running analyzer phase: ${m.status}`, 15);
          }
        }
      }
    ).then(({ data: { text } }) => {
      updateLoader('Heuristic Compilation...', 'Sorting time windows and aligning day coordinates...', 98);
      setTimeout(() => {
        const parsedEvents = parseScheduleText(text);
        showReviewStage(parsedEvents);
      }, 500);
    }).catch(err => {
      console.error("Tesseract OCR error:", err);
      updateLoader('OCR Reading Alert', 'Tesseract failed to extract characters. Opening manual correction board...', 99);
      setTimeout(() => {
        showReviewStage(parseScheduleText(""));
      }, 1500);
    });
  }

  // Parse day indices & time ranges from plain OCR text blocks
  function parseScheduleText(text) {
    const parsed = [];
    const lines = text.split('\n')
                      .map(l => l.trim())
                      .filter(Boolean);
    
    const dayMap = {
      'monday': 1, 'mon': 1,
      'tuesday': 2, 'tue': 2, 'tues': 2,
      'wednesday': 3, 'wed': 3,
      'thursday': 4, 'thu': 4, 'thur': 4, 'thurs': 4,
      'friday': 5, 'fri': 5,
      'saturday': 6, 'sat': 6,
      'sunday': 7, 'sun': 7
    };

    const timeRegex = /(\d{1,2})[:.](\d{2})\s*(AM|PM)?\s*(?:-|to)\s*(\d{1,2})[:.](\d{2})\s*(AM|PM)?/i;
    let currentDay = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();
      
      let dayFound = null;
      for (const [dayName, dayIdx] of Object.entries(dayMap)) {
        const wordRegex = new RegExp('\\b' + dayName + '\\b', 'i');
        if (wordRegex.test(lowerLine)) {
          dayFound = dayIdx;
          break;
        }
      }
      if (dayFound !== null) {
        currentDay = dayFound;
      }

      const timeMatch = line.match(timeRegex);
      if (timeMatch) {
        let startH = parseInt(timeMatch[1], 10);
        const startM = parseInt(timeMatch[2], 10);
        const startAm = timeMatch[3];
        let endH = parseInt(timeMatch[4], 10);
        const endM = parseInt(timeMatch[5], 10);
        const endAm = timeMatch[6];

        if (startAm) {
          if (startAm.toUpperCase() === 'PM' && startH < 12) startH += 12;
          if (startAm.toUpperCase() === 'AM' && startH === 12) startH = 0;
        }
        if (endAm) {
          if (endAm.toUpperCase() === 'PM' && endH < 12) endH += 12;
          if (endAm.toUpperCase() === 'AM' && endH === 12) endH = 0;
        }

        if (!startAm && startH < 8) startH += 12;
        if (!endAm && endH < 8) endH += 12;

        const startTimeStr = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
        const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

        let textLeft = line.replace(timeRegex, '')
                           .replace(/monday|tuesday|wednesday|thursday|friday|saturday|sunday/i, '')
                           .trim();
        
        textLeft = textLeft.replace(/^[:\-\s,]+|[:\-\s,]+$/g, '').trim();

        let title = 'Class / Subject';
        if (textLeft.length > 2 && !/^\d+$/.test(textLeft)) {
          title = textLeft;
        } else if (i > 0) {
          const prevLine = lines[i - 1].trim();
          const dayMatchesPrev = Object.keys(dayMap).some(day => new RegExp('\\b' + day + '\\b', 'i').test(prevLine.toLowerCase()));
          if (prevLine.length > 2 && !timeRegex.test(prevLine) && !dayMatchesPrev) {
            title = prevLine;
          }
        }

        const colorIdx = parsed.length % appState.defaultColors.length;
        const colorObj = appState.defaultColors[colorIdx];

        parsed.push({
          id: 'event_' + Math.random().toString(36).substr(2, 9),
          title: title,
          day: currentDay,
          startTime: startTimeStr,
          endTime: endTimeStr,
          location: '',
          instructor: '',
          emoji: '📚',
          color: colorObj.color,
          colorRgb: colorObj.rgb
        });
      }
    }

    return parsed;
  }

  // ==========================================
  // INSTANT DEMO RUNNER
  // ==========================================
  btnDemoStart.addEventListener('click', () => {
    appState.username = usernameInput.value.trim() || 'Ellen';
    appState.pin = pinInput.value.trim();
    sidebarPinInput.value = appState.pin;

    if (appState.pin) {
      localStorage.setItem('aerosched_pin', appState.pin);
    } else {
      localStorage.removeItem('aerosched_pin');
    }

    updateHeaderBadge();
    
    appState.uploadedImageSrc = 'demo_schedule.png';
    review.img.src = appState.uploadedImageSrc;

    showStage('parsing');
    loader.panel.style.display = 'flex';
    review.panel.style.display = 'none';

    let pct = 0;
    const interval = setInterval(() => {
      pct += 4;
      if (pct <= 25) {
        updateLoader('Initializing OCR Engine...', 'Spawning headless web worker nodes and importing neural nets...', pct);
      } else if (pct <= 65) {
        updateLoader('Analyzing Schedule Layout Grid...', 'Executing perspective alignment matrix and isolating text lines...', pct);
      } else if (pct <= 90) {
        updateLoader('Recognizing Text & Segments...', 'Decrypting characters using English OCR linguistic model...', pct);
      } else if (pct < 100) {
        updateLoader('Resolving Layout Heuristics...', 'Mapping times and days to appropriate structural calendar columns...', pct);
      } else {
        clearInterval(interval);
        
        const demoEvents = [
          { id: 'demo_1', title: 'MATH 101 - Calculus', day: 1, startTime: '09:00', endTime: '10:30', location: 'Hall A', instructor: 'Dr. Vance', emoji: '📚', color: '#8b5cf6', colorRgb: '139, 92, 246' },
          { id: 'demo_2', title: 'CS 150 - Intro to CS', day: 1, startTime: '13:00', endTime: '14:30', location: 'Tech Hall 12', instructor: 'Prof. Miller', emoji: '💻', color: '#06b6d4', colorRgb: '6, 182, 212' },
          { id: 'demo_3', title: 'CHEM 102 - Chemistry', day: 2, startTime: '11:00', endTime: '12:30', location: 'Lab 3', instructor: 'Dr. Henderson', emoji: '🔬', color: '#10b981', colorRgb: '16, 185, 129' },
          { id: 'demo_4', title: 'LIT 210 - Literature', day: 2, startTime: '15:00', endTime: '16:30', location: 'Room 402', instructor: 'Prof. Geller', emoji: '📝', color: '#f59e0b', colorRgb: '245, 158, 11' },
          { id: 'demo_5', title: 'MATH 101 - Calculus', day: 3, startTime: '09:00', endTime: '10:30', location: 'Hall A', instructor: 'Dr. Vance', emoji: '📚', color: '#8b5cf6', colorRgb: '139, 92, 246' },
          { id: 'demo_6', title: 'CS 150 - Intro to CS', day: 3, startTime: '13:00', endTime: '14:30', location: 'Tech Hall 12', instructor: 'Prof. Miller', emoji: '💻', color: '#06b6d4', colorRgb: '6, 182, 212' },
          { id: 'demo_7', title: 'CHEM 102 - Chemistry', day: 4, startTime: '11:00', endTime: '12:30', location: 'Lab 3', instructor: 'Dr. Henderson', emoji: '🔬', color: '#10b981', colorRgb: '16, 185, 129' },
          { id: 'demo_8', title: 'LIT 210 - Literature', day: 4, startTime: '15:00', endTime: '16:30', location: 'Room 402', instructor: 'Prof. Geller', emoji: '📝', color: '#f59e0b', colorRgb: '245, 158, 11' }
        ];
        
        showReviewStage(demoEvents);
      }
    }, 40);
  });

  // ==========================================
  // STAGE 2: REVIEW PANEL ROWS CONTROLLER
  // ==========================================
  function showReviewStage(events) {
    loader.panel.style.display = 'none';
    review.panel.style.display = 'grid';
    review.rows.innerHTML = '';
    
    if (events.length === 0) {
      events.push(createEmptyEventObj());
    }

    events.forEach(evt => {
      appendParsedRow(evt);
    });
  }

  function createEmptyEventObj() {
    const colorObj = appState.defaultColors[0];
    return {
      id: 'event_' + Math.random().toString(36).substr(2, 9),
      title: 'New Class',
      day: 1,
      startTime: '09:00',
      endTime: '10:00',
      location: '',
      instructor: '',
      emoji: '📚',
      color: colorObj.color,
      colorRgb: colorObj.rgb
    };
  }

  function appendParsedRow(evt) {
    const tr = document.createElement('tr');
    tr.id = `row_${evt.id}`;
    tr.dataset.eventId = evt.id;
    tr.dataset.color = evt.color;
    tr.dataset.colorRgb = evt.colorRgb;
    tr.dataset.emoji = evt.emoji;
    tr.dataset.location = evt.location || '';
    tr.dataset.instructor = evt.instructor || '';

    tr.innerHTML = `
      <td>
        <input type="text" class="row-title input-control" value="${evt.title}" style="padding: 0.4rem;">
      </td>
      <td>
        <select class="row-day input-control" style="padding: 0.4rem;">
          <option value="1" ${evt.day === 1 ? 'selected' : ''}>Monday</option>
          <option value="2" ${evt.day === 2 ? 'selected' : ''}>Tuesday</option>
          <option value="3" ${evt.day === 3 ? 'selected' : ''}>Wednesday</option>
          <option value="4" ${evt.day === 4 ? 'selected' : ''}>Thursday</option>
          <option value="5" ${evt.day === 5 ? 'selected' : ''}>Friday</option>
          <option value="6" ${evt.day === 6 ? 'selected' : ''}>Saturday</option>
          <option value="7" ${evt.day === 7 ? 'selected' : ''}>Sunday</option>
        </select>
      </td>
      <td>
        <input type="time" class="row-start input-control" value="${evt.startTime}" style="padding: 0.4rem;">
      </td>
      <td>
        <input type="time" class="row-end input-control" value="${evt.endTime}" style="padding: 0.4rem;">
      </td>
      <td style="text-align: center;">
        <button class="btn-row-action" title="Delete Row"><i class="fa-solid fa-trash-can"></i></button>
      </td>
    `;

    tr.querySelector('.btn-row-action').addEventListener('click', () => {
      tr.remove();
      if (review.rows.children.length === 0) {
        appendParsedRow(createEmptyEventObj());
      }
    });

    review.rows.appendChild(tr);
  }

  btnAddRow.addEventListener('click', () => {
    appendParsedRow(createEmptyEventObj());
  });

  btnReupload.addEventListener('click', () => {
    showStage('upload');
  });

  // Finish review and save schedule
  btnCompile.addEventListener('click', () => {
    const rows = review.rows.querySelectorAll('tr');
    const compiledEvents = [];

    rows.forEach(row => {
      const id = row.dataset.eventId;
      const title = row.querySelector('.row-title').value.trim() || 'Untitled Class';
      const day = parseInt(row.querySelector('.row-day').value, 10);
      const startTime = row.querySelector('.row-start').value;
      const endTime = row.querySelector('.row-end').value;

      if (!startTime || !endTime) return;

      compiledEvents.push({
        id: id,
        title: title,
        day: day,
        startTime: startTime,
        endTime: endTime,
        location: row.dataset.location || '',
        instructor: row.dataset.instructor || '',
        emoji: row.dataset.emoji || '📚',
        color: row.dataset.color || '#6366f1',
        colorRgb: row.dataset.colorRgb || '99, 102, 241'
      });
    });

    appState.events = compiledEvents;
    
    saveStateToLocalStorage();
    syncStateToCloud(); // Push directly to KVdb bucket if PIN is set
    initializeDashboardView();
    showStage('workspace');
  });

  // ==========================================
  // PASSCODE LOCK SCREEN CONTROLLER
  // ==========================================
  function setupLockDotsDisplay() {
    const dots = passcodeDots.querySelectorAll('.dot');
    dots.forEach((dot, index) => {
      if (index < pinBuffer.length) {
        dot.classList.add('filled');
      } else {
        dot.classList.remove('filled');
      }
    });
  }

  keypadButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const key = btn.dataset.key;
      
      if (key === 'clear') {
        pinBuffer = [];
      } else if (key === 'backspace') {
        pinBuffer.pop();
      } else if (pinBuffer.length < 4) {
        pinBuffer.push(key);
      }

      setupLockDotsDisplay();

      // Verify once passcode buffer hits 4 digits
      if (pinBuffer.length === 4) {
        const enteredPin = pinBuffer.join('');
        
        lockTitle.textContent = "Verifying...";
        lockSubtitle.textContent = "Decrypting schedule configurations...";
        
        // 1. Validate against cached localStorage credentials
        if (enteredPin === appState.pin) {
          unlockGateSuccessfully();
        } else {
          // 2. Fallback to querying KVdb live (supports multi-device loading)
          const success = await pullStateFromCloud(appState.username, enteredPin);
          if (success) {
            unlockGateSuccessfully();
          } else {
            // Wrong passcode shake animations
            lockCard.classList.add('shake-error');
            lockTitle.textContent = "Access Denied";
            lockSubtitle.textContent = "Invalid security PIN. Please try again.";
            
            setTimeout(() => {
              lockCard.classList.remove('shake-error');
              pinBuffer = [];
              setupLockDotsDisplay();
              lockTitle.textContent = "Unlock AeroSched";
              lockSubtitle.textContent = "Enter your security PIN to decrypt your dashboard";
            }, 1000);
          }
        }
      }
    });
  });

  function unlockGateSuccessfully() {
    lockTitle.textContent = "Unlocked!";
    lockSubtitle.textContent = "Loading agenda workspace...";
    
    const dots = passcodeDots.querySelectorAll('.dot');
    dots.forEach(d => d.style.background = "#10b981"); // green flash

    setTimeout(() => {
      initializeDashboardView();
      showStage('workspace');
      
      // Restore standard style variables
      dots.forEach(d => d.style.background = "");
      pinBuffer = [];
    }, 400);
  }

  btnLockSwitchUser.addEventListener('click', () => {
    if (confirm("Logout from current profile and return to Upload panel?")) {
      appState.events = [];
      appState.pin = '';
      appState.hashedSyncKey = '';
      localStorage.clear();
      showStage('upload');
    }
  });

  // ==========================================
  // SIDEBAR LOCK & CLOUD API CONTROLLER
  // ==========================================
  
  // Set/Update PIN Lock
  btnUpdatePin.addEventListener('click', () => {
    const entered = sidebarPinInput.value.trim();
    if (entered && entered.length !== 4) {
      alert("PIN lock passcode must be exactly 4 digits.");
      return;
    }

    appState.pin = entered;
    if (entered) {
      localStorage.setItem('aerosched_pin', entered);
      alert("Security PIN lock updated successfully! AeroSched will lock next time you reload the site.");
    } else {
      localStorage.removeItem('aerosched_pin');
      alert("Security PIN lock deactivated. App will load automatically on startup.");
    }

    saveStateToLocalStorage();
    syncStateToCloud();
  });

  // Force Cloud Sync Button
  btnSidebarSync.addEventListener('click', () => {
    if (!appState.pin) {
      alert("Please set a 4-Digit security PIN in the field above to enable cloud synchronization capabilities!");
      return;
    }
    syncStateToCloud();
  });

  // ==========================================
  // DYNAMIC DAILY agenda DASHBOARD VIEW
  // ==========================================
  
  function initializeDashboardView() {
    // Check if daily agenda is default view
    if (appState.activeView === 'daily') {
      weeklyGridContainer.style.display = 'none';
      dailyViewContainer.style.display = 'block';
      renderDailyDashboard();
    } else {
      dailyViewContainer.style.display = 'none';
      weeklyGridContainer.style.display = 'block';
      renderCalendarGrid();
    }

    // Set 15-second background interval loop for timeline progress bars
    if (dailyUpdateInterval) clearInterval(dailyUpdateInterval);
    
    dailyUpdateInterval = setInterval(() => {
      if (appState.activeView === 'daily' && stages.workspace.classList.contains('active')) {
        renderDailyDashboard();
      }
    }, 15000);
  }

  function renderDailyDashboard() {
    // 1. Weekday indices: Sunday=0, Monday=1, ..., Saturday=6
    const now = new Date();
    const rawDay = now.getDay();
    const currentDayIdx = rawDay === 0 ? 7 : rawDay;

    const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Greeting Title
    dailyGreeting.innerHTML = `Welcome back, <span>${appState.username}</span>!`;
    dailyDateLabel.textContent = `Today's Agenda // ${weekdayNames[rawDay]}, ${monthNames[now.getMonth()]} ${now.getDate()}`;

    // 2. Filter & sort today's classes chronologically
    const todaysEvents = appState.events
      .filter(evt => evt.day === currentDayIdx)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    if (todaysEvents.length === 0) {
      // Free day
      dailyDashboardGrid.style.display = 'none';
      dailyEmptyPanel.style.display = 'flex';
      return;
    }

    dailyEmptyPanel.style.display = 'none';
    dailyDashboardGrid.style.display = 'grid';

    // 3. Scan timeline for Active, Completed, or Upcoming classes
    const curMins = now.getHours() * 60 + now.getMinutes();
    let activeClass = null;

    dailyTimelineList.innerHTML = '';

    todaysEvents.forEach(evt => {
      const startMins = timeToMinutes(evt.startTime);
      const endMins = timeToMinutes(evt.endTime);
      
      let statusClass = 'upcoming';
      let badgeLabel = 'Upcoming';

      if (curMins > endMins) {
        statusClass = 'completed';
        badgeLabel = 'Completed';
      } else if (curMins >= startMins && curMins <= endMins) {
        statusClass = 'active';
        badgeLabel = 'Active Now';
        activeClass = evt; // Current running class
      }

      // Append chronological timeline item
      const item = document.createElement('div');
      item.className = 'timeline-item';
      
      const dispTime = formatEventTimeRange(evt.startTime, evt.endTime);
      item.innerHTML = `
        <div class="timeline-badge">
          <div class="timeline-dot ${statusClass}"></div>
          <div class="timeline-line"></div>
        </div>
        <div class="timeline-card ${statusClass}">
          <div>
            <div class="timeline-title">${evt.emoji} ${evt.title}</div>
            <div class="timeline-time"><i class="fa-regular fa-clock"></i> ${dispTime}</div>
          </div>
          ${evt.location ? `<div class="timeline-loc"><i class="fa-solid fa-location-dot"></i> ${evt.location}</div>` : ''}
        </div>
      `;

      // Allow clicks to edit block directly from agenda timeline!
      item.querySelector('.timeline-card').addEventListener('click', () => {
        openEventModalForEdit(evt);
      });

      dailyTimelineList.appendChild(item);
    });

    // 4. Update the Active progress tracker cards
    if (activeClass) {
      activeClassPanel.style.display = 'flex';
      activeClassTitle.textContent = activeClass.title;
      activeClassTime.innerHTML = `<i class="fa-regular fa-clock" style="color: var(--accent-primary); margin-right: 0.25rem;"></i> ${formatEventTimeRange(activeClass.startTime, activeClass.endTime)}`;
      activeClassLoc.innerHTML = activeClass.location ? `<i class="fa-solid fa-location-dot" style="color: var(--accent-primary); margin-right: 0.25rem;"></i> ${activeClass.location}` : '';
      
      // Calculate countdown percentage & remaining minutes
      const startMins = timeToMinutes(activeClass.startTime);
      const endMins = timeToMinutes(activeClass.endTime);
      
      const duration = endMins - startMins;
      const elapsed = curMins - startMins;
      const pct = Math.min(100, Math.max(0, Math.round((elapsed / duration) * 100)));

      activeProgressFill.style.width = `${pct}%`;
      activeElapsed.textContent = `${elapsed}m elapsed`;
      activeRemaining.textContent = `${duration - elapsed}m remaining`;
      
      // Inject theme colors dynamically
      activeClassPanel.style.setProperty('--accent-primary-rgb', activeClass.colorRgb);
      activeClassPanel.style.borderColor = `rgba(${activeClass.colorRgb}, 0.25)`;
    } else {
      // Find the next upcoming class
      const nextUpcoming = todaysEvents.find(evt => timeToMinutes(evt.startTime) > curMins);
      
      if (nextUpcoming) {
        activeClassPanel.style.display = 'flex';
        activeClassTitle.textContent = `Next Up: ${nextUpcoming.title}`;
        activeClassTime.innerHTML = `<i class="fa-regular fa-clock" style="color: var(--accent-primary); margin-right: 0.25rem;"></i> Starts at ${formatEventTime(nextUpcoming.startTime)}`;
        activeClassLoc.innerHTML = nextUpcoming.location ? `<i class="fa-solid fa-location-dot" style="color: var(--accent-primary); margin-right: 0.25rem;"></i> ${nextUpcoming.location}` : '';
        
        // Setup upcoming countdown progress
        const startMins = timeToMinutes(nextUpcoming.startTime);
        const minsUntil = startMins - curMins;
        
        activeProgressFill.style.width = '0%';
        activeElapsed.textContent = 'Class hasn\'t started';
        activeRemaining.textContent = `${minsUntil} mins until start`;
        
        activeClassPanel.style.setProperty('--accent-primary-rgb', '107, 114, 128'); // gray
        activeClassPanel.style.borderColor = 'var(--glass-border)';
      } else {
        // All classes completed for today!
        activeClassPanel.style.display = 'flex';
        activeClassTitle.textContent = "Done for Today! 🎉";
        activeClassTime.innerHTML = `<i class="fa-solid fa-circle-check" style="color: #10b981; margin-right: 0.25rem;"></i> All scheduled sessions finished.`;
        activeClassLoc.textContent = "";
        
        activeProgressFill.style.width = '100%';
        activeElapsed.textContent = 'Day completed';
        activeRemaining.textContent = 'Have a great evening!';
        
        activeClassPanel.style.setProperty('--accent-primary-rgb', '16, 185, 129'); // green
        activeClassPanel.style.borderColor = 'rgba(16, 185, 129, 0.25)';
      }
    }
  }

  function formatEventTime(timeStr) {
    if (appState.hourFormat === '24h') return timeStr;
    const parts = timeStr.split(':');
    let h = parseInt(parts[0], 10);
    const suffix = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h === 0 ? 12 : h;
    return `${h}:${parts[1]} ${suffix}`;
  }

  // ==========================================
  // VIEW SWITCHING BUTTON TRIGGERS
  // ==========================================
  btnViewDaily.addEventListener('click', () => {
    appState.activeView = 'daily';
    weeklyGridContainer.style.display = 'none';
    dailyViewContainer.style.display = 'block';
    renderDailyDashboard();
  });

  btnViewWeekly.addEventListener('click', () => {
    appState.activeView = 'weekly';
    dailyViewContainer.style.display = 'none';
    weeklyGridContainer.style.display = 'block';
    renderCalendarGrid();
  });

  btnEmptyViewWeekly.addEventListener('click', () => {
    appState.activeView = 'weekly';
    dailyViewContainer.style.display = 'none';
    weeklyGridContainer.style.display = 'block';
    renderCalendarGrid();
  });

  // ==========================================
  // WEEKLY CALENDAR COMPOSITION ENGINE
  // ==========================================
  function renderCalendarGrid() {
    if (appState.events.length > 0) {
      let earliest = 24;
      let latest = 0;
      
      appState.events.forEach(evt => {
        const startH = parseInt(evt.startTime.split(':')[0], 10);
        const endH = parseInt(evt.endTime.split(':')[0], 10) + 1;
        
        if (startH < earliest) earliest = startH;
        if (endH > latest) latest = endH;
      });

      appState.minHour = Math.max(0, Math.min(8, earliest - 1));
      appState.maxHour = Math.min(24, Math.max(18, latest + 1));
    } else {
      appState.minHour = 8;
      appState.maxHour = 18;
    }

    calendarRowsContainer.innerHTML = '';
    
    for (let hour = appState.minHour; hour < appState.maxHour; hour++) {
      const tr = document.createElement('tr');
      
      const timeCell = document.createElement('td');
      timeCell.className = 'time-col-cell';
      timeCell.textContent = formatHourLabel(hour);
      tr.appendChild(timeCell);

      for (let day = 1; day <= 7; day++) {
        const cell = document.createElement('td');
        cell.className = 'slot-cell';
        cell.dataset.day = day;
        cell.dataset.hour = hour;
        
        cell.addEventListener('dblclick', () => {
          openEventModalForCreate(day, hour);
        });

        tr.appendChild(cell);
      }

      calendarRowsContainer.appendChild(tr);
    }

    positionScheduleBlocks();
  }

  function formatHourLabel(hour) {
    if (appState.hourFormat === '24h') {
      return `${String(hour).padStart(2, '0')}:00`;
    } else {
      const suffix = hour >= 12 ? 'PM' : 'AM';
      let dispHour = hour % 12;
      dispHour = dispHour === 0 ? 12 : dispHour;
      return `${dispHour}:00 ${suffix}`;
    }
  }

  function timeToMinutes(timeStr) {
    const parts = timeStr.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  function positionScheduleBlocks() {
    const existing = document.querySelectorAll('.schedule-block');
    existing.forEach(el => el.remove());

    const firstBodyRow = calendarRowsContainer.querySelector('tr');
    if (!firstBodyRow) return;

    const cellHeight = 60;
    const totalMinutes = (appState.maxHour - appState.minHour) * 60;

    appState.events.forEach(evt => {
      const columnCells = document.querySelectorAll(`.slot-cell[data-day="${evt.day}"]`);
      if (columnCells.length === 0) return;

      const firstCell = columnCells[0];
      const startMin = timeToMinutes(evt.startTime);
      const endMin = timeToMinutes(evt.endTime);
      
      const gridStartMin = appState.minHour * 60;
      
      const topOffset = ((startMin - gridStartMin) / 60) * cellHeight;
      const blockHeight = ((endMin - startMin) / 60) * cellHeight;

      if (startMin >= appState.maxHour * 60 || endMin <= gridStartMin) return;

      const block = document.createElement('div');
      block.className = 'schedule-block';
      if (blockHeight < 45) {
        block.classList.add('schedule-block-compact');
      }

      block.style.setProperty('--block-color', evt.color);
      block.style.setProperty('--block-color-rgb', evt.colorRgb);
      block.style.top = `${topOffset}px`;
      block.style.height = `${blockHeight - 4}px`;

      const dispTime = formatEventTimeRange(evt.startTime, evt.endTime);
      block.innerHTML = `
        <div>
          <div class="block-title"><span>${evt.emoji}</span>${evt.title}</div>
          <div class="block-time"><i class="fa-regular fa-clock"></i> ${dispTime}</div>
        </div>
        ${blockHeight >= 50 && evt.location ? `<div class="block-info"><i class="fa-solid fa-location-dot"></i> ${evt.location}</div>` : ''}
      `;

      block.addEventListener('click', (e) => {
        e.stopPropagation();
        openEventModalForEdit(evt);
      });

      firstCell.appendChild(block);
    });
  }

  function formatEventTimeRange(start, end) {
    if (appState.hourFormat === '24h') {
      return `${start} - ${end}`;
    }
    
    function to12h(timeStr) {
      const parts = timeStr.split(':');
      let h = parseInt(parts[0], 10);
      const m = parts[1];
      const suffix = h >= 12 ? 'pm' : 'am';
      h = h % 12;
      h = h === 0 ? 12 : h;
      return `${h}:${m}${suffix}`;
    }

    return `${to12h(start)} - ${to12h(end)}`;
  }

  // ==========================================
  // MODAL DIALOGS AND COMPOSERS
  // ==========================================
  function openModal() {
    modal.overlay.classList.add('active');
  }

  function closeModal() {
    modal.overlay.classList.remove('active');
  }

  function setupModalOptions() {
    const emojis = modal.emojiPicker.querySelectorAll('.emoji-option');
    emojis.forEach(el => {
      el.addEventListener('click', () => {
        emojis.forEach(x => x.classList.remove('active'));
        el.classList.add('active');
        modal.emoji.value = el.dataset.emoji;
      });
    });

    const colors = modal.colorPicker.querySelectorAll('.color-swatch');
    colors.forEach(el => {
      el.addEventListener('click', () => {
        colors.forEach(x => x.classList.remove('active'));
        el.classList.add('active');
        modal.colorPicker.dataset.selectedColor = el.dataset.color;
        modal.colorPicker.dataset.selectedColorRgb = el.dataset.colorRgb;
      });
    });
  }

  setupModalOptions();

  function selectModalEmoji(emojiStr) {
    const options = modal.emojiPicker.querySelectorAll('.emoji-option');
    options.forEach(opt => {
      if (opt.dataset.emoji === emojiStr) {
        opt.classList.add('active');
      } else {
        opt.classList.remove('active');
      }
    });
    modal.emoji.value = emojiStr;
  }

  function selectModalColor(hexStr) {
    const swatches = modal.colorPicker.querySelectorAll('.color-swatch');
    swatches.forEach(sw => {
      if (sw.dataset.color === hexStr) {
        sw.classList.add('active');
        modal.colorPicker.dataset.selectedColor = sw.dataset.color;
        modal.colorPicker.dataset.selectedColorRgb = sw.dataset.colorRgb;
      } else {
        sw.classList.remove('active');
      }
    });
  }

  function openEventModalForCreate(day, hour) {
    modal.heading.textContent = 'Create Custom Event';
    modal.eventId.value = '';
    modal.title.value = '';
    modal.day.value = day;
    modal.startTime.value = `${String(hour).padStart(2, '0')}:00`;
    modal.endTime.value = `${String(hour + 1).padStart(2, '0')}:00`;
    modal.location.value = '';
    modal.instructor.value = '';
    
    selectModalEmoji('📚');
    selectModalColor(appState.defaultColors[0].color);
    
    modal.btnDelete.style.display = 'none';
    openModal();
  }

  function openEventModalForEdit(evt) {
    modal.heading.textContent = 'Modify Roster Block';
    modal.eventId.value = evt.id;
    modal.title.value = evt.title;
    modal.day.value = evt.day;
    modal.startTime.value = evt.startTime;
    modal.endTime.value = evt.endTime;
    modal.location.value = evt.location || '';
    modal.instructor.value = evt.instructor || '';
    
    selectModalEmoji(evt.emoji);
    selectModalColor(evt.color);

    modal.btnDelete.style.display = 'inline-flex';
    openModal();
  }

  modal.btnSave.addEventListener('click', () => {
    const id = modal.eventId.value;
    const title = modal.title.value.trim() || 'Untitled Event';
    const day = parseInt(modal.day.value, 10);
    const start = modal.startTime.value;
    const end = modal.endTime.value;
    const loc = modal.location.value.trim();
    const inst = modal.instructor.value.trim();
    const emoji = modal.emoji.value;
    const col = modal.colorPicker.dataset.selectedColor;
    const rgb = modal.colorPicker.dataset.selectedColorRgb;

    if (!start || !end) {
      alert("Please provide valid times.");
      return;
    }

    if (timeToMinutes(end) <= timeToMinutes(start)) {
      alert("Ending time must be later than starting time.");
      return;
    }

    if (id) {
      const index = appState.events.findIndex(e => e.id === id);
      if (index !== -1) {
        appState.events[index] = {
          id: id, title, day, startTime: start, endTime: end, location: loc, instructor: inst, emoji, color: col, colorRgb: rgb
        };
      }
    } else {
      appState.events.push({
        id: 'event_' + Math.random().toString(36).substr(2, 9),
        title, day, startTime: start, endTime: end, location: loc, instructor: inst, emoji, color: col, colorRgb: rgb
      });
    }

    saveStateToLocalStorage();
    syncStateToCloud(); // Synchronize edits to KVdb Cloud bucket
    initializeDashboardView();
    closeModal();
  });

  modal.btnDelete.addEventListener('click', () => {
    const id = modal.eventId.value;
    if (id && confirm("Delete this event block?")) {
      appState.events = appState.events.filter(e => e.id !== id);
      saveStateToLocalStorage();
      syncStateToCloud(); // Synchronize deletes to KVdb Cloud bucket
      initializeDashboardView();
      closeModal();
    }
  });

  modal.btnCancel.addEventListener('click', closeModal);
  document.getElementById('btn-close-modal').addEventListener('click', closeModal);

  // ==========================================
  // DASHBOARD SETTINGS CONTROLLER
  // ==========================================
  themeOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      themeOptions.forEach(x => x.classList.remove('active'));
      opt.classList.add('active');
      
      const selTheme = opt.dataset.theme;
      applyTheme(selTheme);
      
      appState.theme = selTheme;
      saveStateToLocalStorage();
      syncStateToCloud();
    });
  });

  function applyTheme(themeName) {
    document.body.className = '';
    if (themeName !== 'midnight') {
      document.body.classList.add(`theme-${themeName}`);
    } else {
      document.body.classList.add('theme-midnight');
    }
  }

  btn12h.addEventListener('click', () => {
    btn12h.classList.add('active');
    btn24h.classList.remove('active');
    appState.hourFormat = '12h';
    saveStateToLocalStorage();
    syncStateToCloud();
    initializeDashboardView();
  });

  btn24h.addEventListener('click', () => {
    btn24h.classList.add('active');
    btn12h.classList.remove('active');
    appState.hourFormat = '24h';
    saveStateToLocalStorage();
    syncStateToCloud();
    initializeDashboardView();
  });

  function applyHourFormat(format) {
    if (format === '24h') {
      btn24h.classList.add('active');
      btn12h.classList.remove('active');
    } else {
      btn12h.classList.add('active');
      btn24h.classList.remove('active');
    }
  }

  btnSizeNormal.addEventListener('click', () => {
    btnSizeNormal.classList.add('active');
    btnSizeLarge.classList.remove('active');
    applyFontSize('normal');
    appState.fontSize = 'normal';
    saveStateToLocalStorage();
    syncStateToCloud();
  });

  btnSizeLarge.addEventListener('click', () => {
    btnSizeLarge.classList.add('active');
    btnSizeNormal.classList.remove('active');
    applyFontSize('large');
    appState.fontSize = 'large';
    saveStateToLocalStorage();
    syncStateToCloud();
  });

  function applyFontSize(size) {
    const grid = document.getElementById('calendar-grid');
    if (size === 'large') {
      grid.style.fontSize = '1.05rem';
      btnSizeLarge.classList.add('active');
      btnSizeNormal.classList.remove('active');
    } else {
      grid.style.fontSize = '';
      btnSizeNormal.classList.add('active');
      btnSizeLarge.classList.remove('active');
    }
  }

  btnManualAdd.addEventListener('click', () => {
    openEventModalForCreate(1, 9);
  });

  btnClearSchedule.addEventListener('click', () => {
    if (confirm("Are you sure you want to clear your current calendar and start fresh?")) {
      appState.events = [];
      saveStateToLocalStorage();
      syncStateToCloud();
      initializeDashboardView();
    }
  });

  btnBackToUpload.addEventListener('click', () => {
    showStage('upload');
  });

  // ==========================================
  // HIGH FIDELITY LANDSCAPE PDF EXPORT
  // ==========================================
  btnExportPdf.addEventListener('click', () => {
    // Generate landscape PDF of the weekly grid
    const element = document.getElementById('schedule-print-area');
    
    const opt = {
      margin:       [10, 10, 10, 10],
      filename:     `${appState.username.replace(/\s+/g, '_')}_schedule.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2.5, 
        useCORS: true,
        backgroundColor: document.body.classList.contains('theme-cyberpunk') ? '#080312' : 
                         document.body.classList.contains('theme-emerald') ? '#050d0a' : 
                         document.body.classList.contains('theme-sunset') ? '#100a06' : '#0a0e17'
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    btnExportPdf.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generating PDF...`;
    btnExportPdf.disabled = true;

    html2pdf().set(opt).from(element).save().then(() => {
      btnExportPdf.innerHTML = `<i class="fa-solid fa-file-pdf"></i> Export PDF`;
      btnExportPdf.disabled = false;
    }).catch(err => {
      console.error("PDF Export failed:", err);
      btnExportPdf.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Export Failed`;
      btnExportPdf.disabled = false;
      setTimeout(() => {
        btnExportPdf.innerHTML = `<i class="fa-solid fa-file-pdf"></i> Export PDF`;
      }, 3000);
    });
  });

  // ==========================================
  // COLD START ENGINE BOOTSTRAP
  // ==========================================
  loadStateFromLocalStorage();

});
