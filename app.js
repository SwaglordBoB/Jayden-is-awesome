/**
 * AeroSched - Visual Schedule Reader & Customizer
 * Core Javascript Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  
  // ==========================================
  // APPLICATION STATE
  // ==========================================
  let appState = {
    username: 'Guest Planner',
    theme: 'midnight',
    hourFormat: '12h', // '12h' or '24h'
    fontSize: 'normal', // 'normal' or 'large'
    events: [],
    uploadedImageSrc: '',
    minHour: 8,
    maxHour: 18,
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
  const fileInput = document.getElementById('file-input');
  const dropzone = document.getElementById('dropzone');
  const btnDemoStart = document.getElementById('btn-demo-start');
  const userBadgeName = document.getElementById('badge-name');
  const userBadge = document.getElementById('user-badge');

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
  
  // Workspace calendar elements
  const calendarTitle = document.getElementById('calendar-title');
  const btnExportPdf = document.getElementById('btn-export-pdf');
  const calendarRowsContainer = document.getElementById('calendar-rows');

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
    const saved = localStorage.getItem('aerosched_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        appState.username = parsed.username || appState.username;
        appState.theme = parsed.theme || appState.theme;
        appState.hourFormat = parsed.hourFormat || appState.hourFormat;
        appState.fontSize = parsed.fontSize || appState.fontSize;
        appState.events = parsed.events || [];
        
        // Restore Welcome inputs
        usernameInput.value = appState.username;

        // Apply style defaults
        applyTheme(appState.theme);
        applyHourFormat(appState.hourFormat);
        applyFontSize(appState.fontSize);

        // If there were already saved events, take them straight to workspace
        if (appState.events.length > 0) {
          updateHeaderBadge();
          renderCalendarGrid();
          showStage('workspace');
        }
      } catch (e) {
        console.error("Error loading localStorage settings:", e);
      }
    }
  }

  // ==========================================
  // WELCOME STAGE & FILE UPLOAD
  // ==========================================
  
  // Drag and Drop Effects
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
    const files = dt.files;
    if (files.length > 0) {
      handleUploadedFile(files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleUploadedFile(e.target.files[0]);
    }
  });

  // Welcome user name synchronization
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
      
      // Update state name
      appState.username = usernameInput.value.trim() || 'Guest Planner';
      updateHeaderBadge();

      // Show loader screen
      showStage('parsing');
      loader.panel.style.display = 'flex';
      review.panel.style.display = 'none';

      // Start actual Tesseract OCR
      runTesseractOCR(file);
    };
    reader.readAsDataURL(file);
  }

  // ==========================================
  // OCR ENGINE & TEXT PARSING
  // ==========================================
  function updateLoader(title, subtitle, pct) {
    loader.title.textContent = title;
    loader.subtitle.textContent = subtitle;
    loader.pct.textContent = `${pct}%`;
    loader.ring.style.background = `conic-gradient(var(--accent-primary) ${pct * 3.6}deg, var(--bg-tertiary) 0deg)`;
  }

  function runTesseractOCR(file) {
    updateLoader('Initializing OCR Engine...', 'Spinning up language modules and worker threads...', 10);
    
    // In Tesseract.js v5, we recognize standard image directly
    Tesseract.recognize(
      file,
      'eng',
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            const pct = Math.round(m.progress * 80) + 15; // Maps progress from 15% to 95%
            updateLoader('Analyzing Schedule Roster...', `Running optical text recognizer (${pct}%)...`, pct);
          } else {
            // Initializing stages
            updateLoader('Preparing Image...', `Running analyzer phase: ${m.status}`, 15);
          }
        }
      }
    ).then(({ data: { text } }) => {
      updateLoader('Heuristic Compilation...', 'Formatting times, days, and sorting course schedules...', 98);
      setTimeout(() => {
        const parsedEvents = parseScheduleText(text);
        showReviewStage(parsedEvents);
      }, 500);
    }).catch(err => {
      console.error("Tesseract OCR Error:", err);
      // Fallback gracefully so the user is not blocked
      updateLoader('OCR Reading Alert', 'We encountered an error parsing the text. Loading manual compiler board...', 99);
      setTimeout(() => {
        showReviewStage(parseScheduleText(""));
      }, 1500);
    });
  }

  // Heuristic parser algorithm to detect days and time blocks
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

    // Time pattern: HH:MM [AM/PM] to/dash HH:MM [AM/PM]
    const timeRegex = /(\d{1,2})[:.](\d{2})\s*(AM|PM)?\s*(?:-|to)\s*(\d{1,2})[:.](\d{2})\s*(AM|PM)?/i;
    let currentDay = 1; // Start standard scan on Monday

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();
      
      // 1. Detect if this line represents a header day indicator
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

      // 2. Scan for time bounds
      const timeMatch = line.match(timeRegex);
      if (timeMatch) {
        let startH = parseInt(timeMatch[1], 10);
        const startM = parseInt(timeMatch[2], 10);
        const startAm = timeMatch[3];
        let endH = parseInt(timeMatch[4], 10);
        const endM = parseInt(timeMatch[5], 10);
        const endAm = timeMatch[6];

        // Format to 24 hour integers
        if (startAm) {
          if (startAm.toUpperCase() === 'PM' && startH < 12) startH += 12;
          if (startAm.toUpperCase() === 'AM' && startH === 12) startH = 0;
        }
        if (endAm) {
          if (endAm.toUpperCase() === 'PM' && endH < 12) endH += 12;
          if (endAm.toUpperCase() === 'AM' && endH === 12) endH = 0;
        }

        // Implicit afternoon bounds: e.g. 1:00-3:00 is PM
        if (!startAm && startH < 8) startH += 12;
        if (!endAm && endH < 8) endH += 12;

        const startTimeStr = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
        const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

        // 3. Extract the class subject name
        // Remove times and days from the line to see what remains
        let textLeft = line.replace(timeRegex, '')
                           .replace(/monday|tuesday|wednesday|thursday|friday|saturday|sunday/i, '')
                           .trim();
        
        // Trim standard punctuation symbols
        textLeft = textLeft.replace(/^[:\-\s,]+|[:\-\s,]+$/g, '').trim();

        let title = 'Class / Subject';
        if (textLeft.length > 2 && !/^\d+$/.test(textLeft)) {
          title = textLeft;
        } else if (i > 0) {
          // Fallback to checking line above
          const prevLine = lines[i - 1].trim();
          const dayMatchesPrev = Object.keys(dayMap).some(day => new RegExp('\\b' + day + '\\b', 'i').test(prevLine.toLowerCase()));
          if (prevLine.length > 2 && !timeRegex.test(prevLine) && !dayMatchesPrev) {
            title = prevLine;
          }
        }

        // Color & Emoji selections based on index
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
    updateHeaderBadge();
    
    // Set preview image to copy of demo schedule
    appState.uploadedImageSrc = 'demo_schedule.png';
    review.img.src = appState.uploadedImageSrc;

    showStage('parsing');
    loader.panel.style.display = 'flex';
    review.panel.style.display = 'none';

    // Run custom animated loading delays
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
        
        // Inject beautifully parsed demo events
        const demoEvents = [
          {
            id: 'demo_1',
            title: 'MATH 101 - Calculus',
            day: 1, // Mon
            startTime: '09:00',
            endTime: '10:30',
            location: 'Hall A',
            instructor: 'Dr. Vance',
            emoji: '📚',
            color: '#8b5cf6',
            colorRgb: '139, 92, 246'
          },
          {
            id: 'demo_2',
            title: 'CS 150 - Intro to Computer Science',
            day: 1, // Mon
            startTime: '13:00',
            endTime: '14:30',
            location: 'Tech Hall 12',
            instructor: 'Prof. Miller',
            emoji: '💻',
            color: '#06b6d4',
            colorRgb: '6, 182, 212'
          },
          {
            id: 'demo_3',
            title: 'CHEM 102 - Chemistry',
            day: 2, // Tue
            startTime: '11:00',
            endTime: '12:30',
            location: 'Lab 3',
            instructor: 'Dr. Henderson',
            emoji: '🔬',
            color: '#10b981',
            colorRgb: '16, 185, 129'
          },
          {
            id: 'demo_4',
            title: 'LIT 210 - English Literature',
            day: 2, // Tue
            startTime: '15:00',
            endTime: '16:30',
            location: 'Room 402',
            instructor: 'Prof. Geller',
            emoji: '📝',
            color: '#f59e0b',
            colorRgb: '245, 158, 11'
          },
          {
            id: 'demo_5',
            title: 'MATH 101 - Calculus',
            day: 3, // Wed
            startTime: '09:00',
            endTime: '10:30',
            location: 'Hall A',
            instructor: 'Dr. Vance',
            emoji: '📚',
            color: '#8b5cf6',
            colorRgb: '139, 92, 246'
          },
          {
            id: 'demo_6',
            title: 'CS 150 - Intro to Computer Science',
            day: 3, // Wed
            startTime: '13:00',
            endTime: '14:30',
            location: 'Tech Hall 12',
            instructor: 'Prof. Miller',
            emoji: '💻',
            color: '#06b6d4',
            colorRgb: '6, 182, 212'
          },
          {
            id: 'demo_7',
            title: 'CHEM 102 - Chemistry',
            day: 4, // Thu
            startTime: '11:00',
            endTime: '12:30',
            location: 'Lab 3',
            instructor: 'Dr. Henderson',
            emoji: '🔬',
            color: '#10b981',
            colorRgb: '16, 185, 129'
          },
          {
            id: 'demo_8',
            title: 'LIT 210 - English Literature',
            day: 4, // Thu
            startTime: '15:00',
            endTime: '16:30',
            location: 'Room 402',
            instructor: 'Prof. Geller',
            emoji: '📝',
            color: '#f59e0b',
            colorRgb: '245, 158, 11'
          }
        ];
        
        showReviewStage(demoEvents);
      }
    }, 80);
  });

  // ==========================================
  // STAGE 2: LIVE REVIEW SCREEN
  // ==========================================
  function showReviewStage(events) {
    loader.panel.style.display = 'none';
    review.panel.style.display = 'grid';
    
    review.rows.innerHTML = '';
    
    if (events.length === 0) {
      // Inject placeholder row
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
    
    // Store colors on row
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

    // Add row delete trigger
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

  // Compile final events into active calendar workspace
  btnCompile.addEventListener('click', () => {
    const rows = review.rows.querySelectorAll('tr');
    const compiledEvents = [];

    rows.forEach(row => {
      const id = row.dataset.eventId;
      const title = row.querySelector('.row-title').value.trim() || 'Untitled Class';
      const day = parseInt(row.querySelector('.row-day').value, 10);
      const startTime = row.querySelector('.row-start').value;
      const endTime = row.querySelector('.row-end').value;

      if (!startTime || !endTime) return; // Skip incomplete

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
    
    // Sort, scale time slots & render workspace
    saveStateToLocalStorage();
    renderCalendarGrid();
    showStage('workspace');
  });

  // ==========================================
  // STAGE 3: INTERACTIVE CALENDAR RENDERING
  // ==========================================
  function renderCalendarGrid() {
    // 1. Calculate time slot bounds based on events to keep it aesthetically tight
    if (appState.events.length > 0) {
      let earliest = 24;
      let latest = 0;
      
      appState.events.forEach(evt => {
        const startH = parseInt(evt.startTime.split(':')[0], 10);
        const endH = parseInt(evt.endTime.split(':')[0], 10) + 1; // Pad end hour
        
        if (startH < earliest) earliest = startH;
        if (endH > latest) latest = endH;
      });

      // Keep default paddings or clamp values
      appState.minHour = Math.max(0, Math.min(8, earliest - 1));
      appState.maxHour = Math.min(24, Math.max(18, latest + 1));
    } else {
      appState.minHour = 8;
      appState.maxHour = 18;
    }

    // 2. Render background grid rows
    calendarRowsContainer.innerHTML = '';
    
    for (let hour = appState.minHour; hour < appState.maxHour; hour++) {
      const tr = document.createElement('tr');
      
      // Label cell
      const timeCell = document.createElement('td');
      timeCell.className = 'time-col-cell';
      timeCell.textContent = formatHourLabel(hour);
      tr.appendChild(timeCell);

      // Day slot cells (Monday - Sunday)
      for (let day = 1; day <= 7; day++) {
        const cell = document.createElement('td');
        cell.className = 'slot-cell';
        cell.dataset.day = day;
        cell.dataset.hour = hour;
        
        // Double click slots to manually add event for that day and hour
        cell.addEventListener('dblclick', () => {
          openEventModalForCreate(day, hour);
        });

        tr.appendChild(cell);
      }

      calendarRowsContainer.appendChild(tr);
    }

    // 3. Absolute render floating schedule blocks
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
    // Clear existing blocks
    const existing = document.querySelectorAll('.schedule-block');
    existing.forEach(el => el.remove());

    const calendarTable = document.getElementById('calendar-grid');
    const firstBodyRow = calendarRowsContainer.querySelector('tr');
    
    if (!firstBodyRow) return;

    const cellHeight = 60; // 60px represents 1 hour
    const totalMinutes = (appState.maxHour - appState.minHour) * 60;

    appState.events.forEach(evt => {
      // Find matching column TD (Monday = 1 index is cell index 1)
      const columnCells = document.querySelectorAll(`.slot-cell[data-day="${evt.day}"]`);
      if (columnCells.length === 0) return;

      const firstCell = columnCells[0]; // Reference coordinate of column
      const startMin = timeToMinutes(evt.startTime);
      const endMin = timeToMinutes(evt.endTime);
      
      const gridStartMin = appState.minHour * 60;
      
      // Calculate visual vertical position
      const topOffset = ((startMin - gridStartMin) / 60) * cellHeight;
      const blockHeight = ((endMin - startMin) / 60) * cellHeight;

      // Ensure block is visible in our current hour scale
      if (startMin >= appState.maxHour * 60 || endMin <= gridStartMin) return;

      // Construct visually appealing card
      const block = document.createElement('div');
      block.className = 'schedule-block';
      if (blockHeight < 45) {
        block.classList.add('schedule-block-compact');
      }

      block.style.setProperty('--block-color', evt.color);
      block.style.setProperty('--block-color-rgb', evt.colorRgb);
      block.style.top = `${topOffset}px`;
      block.style.height = `${blockHeight - 4}px`; // Minor gap padding

      // Set internal card templates
      const dispTime = formatEventTimeRange(evt.startTime, evt.endTime);
      block.innerHTML = `
        <div>
          <div class="block-title"><span>${evt.emoji}</span>${evt.title}</div>
          <div class="block-time"><i class="fa-regular fa-clock"></i> ${dispTime}</div>
        </div>
        ${blockHeight >= 50 && evt.location ? `<div class="block-info"><i class="fa-solid fa-location-dot"></i> ${evt.location}</div>` : ''}
      `;

      // Event click to edit trigger
      block.addEventListener('click', (e) => {
        e.stopPropagation();
        openEventModalForEdit(evt);
      });

      // Append event inside the column TD
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

  // Initialize Modal picks (colors and emoji selectors)
  function setupModalOptions() {
    // Emojis click actions
    const emojis = modal.emojiPicker.querySelectorAll('.emoji-option');
    emojis.forEach(el => {
      el.addEventListener('click', () => {
        emojis.forEach(x => x.classList.remove('active'));
        el.classList.add('active');
        modal.emoji.value = el.dataset.emoji;
      });
    });

    // Colors picker click actions
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

  // Modal in CREATE mode
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

  // Modal in EDIT mode
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

  // Save changes from Roster Editor Modal
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
      // Update existing
      const index = appState.events.findIndex(e => e.id === id);
      if (index !== -1) {
        appState.events[index] = {
          id: id, title, day, startTime: start, endTime: end, location: loc, instructor: inst, emoji, color: col, colorRgb: rgb
        };
      }
    } else {
      // Create new
      appState.events.push({
        id: 'event_' + Math.random().toString(36).substr(2, 9),
        title, day, startTime: start, endTime: end, location: loc, instructor: inst, emoji, color: col, colorRgb: rgb
      });
    }

    saveStateToLocalStorage();
    renderCalendarGrid();
    closeModal();
  });

  // Delete event from within modal
  modal.btnDelete.addEventListener('click', () => {
    const id = modal.eventId.value;
    if (id && confirm("Delete this event block?")) {
      appState.events = appState.events.filter(e => e.id !== id);
      saveStateToLocalStorage();
      renderCalendarGrid();
      closeModal();
    }
  });

  modal.btnCancel.addEventListener('click', closeModal);
  document.getElementById('btn-close-modal').addEventListener('click', closeModal);

  // ==========================================
  // SYSTEM WORKSPACE ACTIONS & CONTROLS
  // ==========================================
  
  // Theme Switching
  themeOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      themeOptions.forEach(x => x.classList.remove('active'));
      opt.classList.add('active');
      
      const selTheme = opt.dataset.theme;
      applyTheme(selTheme);
      
      appState.theme = selTheme;
      saveStateToLocalStorage();
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

  // Hour Display Toggles
  btn12h.addEventListener('click', () => {
    btn12h.classList.add('active');
    btn24h.classList.remove('active');
    appState.hourFormat = '12h';
    saveStateToLocalStorage();
    renderCalendarGrid();
  });

  btn24h.addEventListener('click', () => {
    btn24h.classList.add('active');
    btn12h.classList.remove('active');
    appState.hourFormat = '24h';
    saveStateToLocalStorage();
    renderCalendarGrid();
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

  // Font Size Settings
  btnSizeNormal.addEventListener('click', () => {
    btnSizeNormal.classList.add('active');
    btnSizeLarge.classList.remove('active');
    applyFontSize('normal');
    appState.fontSize = 'normal';
    saveStateToLocalStorage();
  });

  btnSizeLarge.addEventListener('click', () => {
    btnSizeLarge.classList.add('active');
    btnSizeNormal.classList.remove('active');
    applyFontSize('large');
    appState.fontSize = 'large';
    saveStateToLocalStorage();
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

  // Sidebar utility button listeners
  btnManualAdd.addEventListener('click', () => {
    openEventModalForCreate(1, 9); // Create for Monday 9:00
  });

  btnClearSchedule.addEventListener('click', () => {
    if (confirm("Are you sure you want to clear your current calendar and start fresh?")) {
      appState.events = [];
      saveStateToLocalStorage();
      renderCalendarGrid();
    }
  });

  btnBackToUpload.addEventListener('click', () => {
    showStage('upload');
  });

  // ==========================================
  // HIGH FIDELITY PRINT / PDF EXPORT
  // ==========================================
  btnExportPdf.addEventListener('click', () => {
    const element = document.getElementById('schedule-print-area');
    
    // Configure high fidelity pdf layout configurations
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

    // Trigger visual floating animation feedback on the button
    btnExportPdf.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generating PDF...`;
    btnExportPdf.disabled = true;

    html2pdf().set(opt).from(element).save().then(() => {
      btnExportPdf.innerHTML = `<i class="fa-solid fa-file-pdf"></i> Export PDF`;
      btnExportPdf.disabled = false;
    }).catch(err => {
      console.error("PDF Export Error:", err);
      btnExportPdf.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Export Failed`;
      btnExportPdf.disabled = false;
      setTimeout(() => {
        btnExportPdf.innerHTML = `<i class="fa-solid fa-file-pdf"></i> Export PDF`;
      }, 3000);
    });
  });

  // ==========================================
  // INITIAL WORKSPACE LOADER BOOTSTRAP
  // ==========================================
  loadStateFromLocalStorage();

});
