/**
 * app.js - Lógica interactiva para astro-qc v2.0.0
 */

// Simulación de sesión de observación astronómica con 20 subframes
const DEFAULT_SUBFRAMES = [
  { id: "LIGHT_0001", time: "21:15", filter: "L", exp: 300, airmass: 1.55, fwhmArcsec: 2.35, ellipticity: 0.08, backgroundAdu: 820, snr: 34.2, accepted: true },
  { id: "LIGHT_0002", time: "21:21", filter: "L", exp: 300, airmass: 1.48, fwhmArcsec: 2.28, ellipticity: 0.07, backgroundAdu: 815, snr: 35.5, accepted: true },
  { id: "LIGHT_0003", time: "21:27", filter: "L", exp: 300, airmass: 1.42, fwhmArcsec: 2.19, ellipticity: 0.06, backgroundAdu: 810, snr: 36.8, accepted: true },
  { id: "LIGHT_0004", time: "21:33", filter: "L", exp: 300, airmass: 1.36, fwhmArcsec: 2.12, ellipticity: 0.07, backgroundAdu: 818, snr: 37.1, accepted: true },
  { id: "LIGHT_0005", time: "21:39", filter: "L", exp: 300, airmass: 1.31, fwhmArcsec: 2.08, ellipticity: 0.08, backgroundAdu: 825, snr: 37.9, accepted: true },
  { id: "LIGHT_0006", time: "21:45", filter: "L", exp: 300, airmass: 1.27, fwhmArcsec: 3.45, ellipticity: 0.28, backgroundAdu: 830, snr: 22.4, accepted: false }, // Viento / Ráfaga
  { id: "LIGHT_0007", time: "21:51", filter: "L", exp: 300, airmass: 1.23, fwhmArcsec: 2.05, ellipticity: 0.07, backgroundAdu: 820, snr: 38.5, accepted: true },
  { id: "LIGHT_0008", time: "21:57", filter: "L", exp: 300, airmass: 1.20, fwhmArcsec: 1.98, ellipticity: 0.06, backgroundAdu: 815, snr: 39.2, accepted: true },
  { id: "LIGHT_0009", time: "22:03", filter: "L", exp: 300, airmass: 1.18, fwhmArcsec: 1.95, ellipticity: 0.07, backgroundAdu: 822, snr: 39.8, accepted: true },
  { id: "LIGHT_0010", time: "22:09", filter: "L", exp: 300, airmass: 1.16, fwhmArcsec: 1.92, ellipticity: 0.05, backgroundAdu: 820, snr: 40.5, accepted: true },
  { id: "LIGHT_0011", time: "22:15", filter: "L", exp: 300, airmass: 1.15, fwhmArcsec: 1.94, ellipticity: 0.06, backgroundAdu: 830, snr: 40.1, accepted: true },
  { id: "LIGHT_0012", time: "22:21", filter: "L", exp: 300, airmass: 1.16, fwhmArcsec: 2.02, ellipticity: 0.08, backgroundAdu: 840, snr: 39.0, accepted: true },
  { id: "LIGHT_0013", time: "22:27", filter: "L", exp: 300, airmass: 1.18, fwhmArcsec: 2.65, ellipticity: 0.09, backgroundAdu: 1450, snr: 28.5, accepted: false }, // Nube cirro
  { id: "LIGHT_0014", time: "22:33", filter: "L", exp: 300, airmass: 1.21, fwhmArcsec: 2.15, ellipticity: 0.07, backgroundAdu: 850, snr: 37.2, accepted: true },
  { id: "LIGHT_0015", time: "22:39", filter: "L", exp: 300, airmass: 1.25, fwhmArcsec: 2.22, ellipticity: 0.08, backgroundAdu: 845, snr: 36.4, accepted: true },
  { id: "LIGHT_0016", time: "22:45", filter: "L", exp: 300, airmass: 1.30, fwhmArcsec: 2.30, ellipticity: 0.09, backgroundAdu: 855, snr: 35.8, accepted: true },
  { id: "LIGHT_0017", time: "22:51", filter: "L", exp: 300, airmass: 1.35, fwhmArcsec: 3.85, ellipticity: 0.35, backgroundAdu: 860, snr: 20.1, accepted: false }, // Error de guiado
  { id: "LIGHT_0018", time: "22:57", filter: "L", exp: 300, airmass: 1.41, fwhmArcsec: 2.42, ellipticity: 0.10, backgroundAdu: 865, snr: 34.5, accepted: true },
  { id: "LIGHT_0019", time: "23:03", filter: "L", exp: 300, airmass: 1.48, fwhmArcsec: 2.55, ellipticity: 0.11, backgroundAdu: 870, snr: 33.2, accepted: true },
  { id: "LIGHT_0020", time: "23:09", filter: "L", exp: 300, airmass: 1.56, fwhmArcsec: 2.68, ellipticity: 0.12, backgroundAdu: 880, snr: 32.0, accepted: true }
];

let sessionSubframes = JSON.parse(JSON.stringify(DEFAULT_SUBFRAMES));
let activeProfileKey = "deep_sky";
let trendChart = null;
let psfProfileChart = null;

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initProfileSelector();
  initSyntheticCanvas();
  initCharts();
  renderSessionTable();
  recalculateSession();
  attachEventListeners();
});

function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('active-tab');
        t.classList.add('inactive-tab');
      });
      btn.classList.add('active-tab');
      btn.classList.remove('inactive-tab');

      const targetId = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab-content').forEach(sec => {
        sec.classList.add('hidden');
      });
      const activeSection = document.getElementById(`tab-${targetId}`);
      if (activeSection) activeSection.classList.remove('hidden');

      if (trendChart) trendChart.resize();
      if (psfProfileChart) psfProfileChart.resize();
    });
  });
}

function initProfileSelector() {
  const sel = document.getElementById('profile-selector');
  if (!sel) return;
  sel.innerHTML = Object.keys(ScienceProfiles.PROFILES).map(k => `
    <option value="${k}" ${k === activeProfileKey ? 'selected' : ''}>${ScienceProfiles.PROFILES[k].name}</option>
  `).join('');

  sel.addEventListener('change', (e) => {
    activeProfileKey = e.target.value;
    updateProfileDescription();
    recalculateSession();
  });
  updateProfileDescription();
}

function updateProfileDescription() {
  const prof = ScienceProfiles.PROFILES[activeProfileKey];
  document.getElementById('profile-desc').textContent = prof.description;
  document.getElementById('rule-fwhm-max').value = prof.rules.fwhmArcsecMax;
  document.getElementById('rule-ellip-max').value = prof.rules.ellipMax || prof.rules.ellipticityMax;
  document.getElementById('rule-bg-max').value = prof.rules.backgroundAduMax;
  document.getElementById('rule-snr-min').value = prof.rules.snrMin;
}

function attachEventListeners() {
  // Red mode
  document.getElementById('red-mode-toggle')?.addEventListener('click', () => {
    document.body.classList.toggle('red-night-mode');
  });

  // Hotkey Shift+R
  window.addEventListener('keydown', (e) => {
    if (e.shiftKey && e.key.toUpperCase() === 'R') {
      document.body.classList.toggle('red-night-mode');
    }
  });

  // Slider adjustments
  const ruleInputs = ['rule-fwhm-max', 'rule-ellip-max', 'rule-bg-max', 'rule-snr-min'];
  ruleInputs.forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      // Custom overrides
      ScienceProfiles.PROFILES[activeProfileKey].rules.fwhmArcsecMax = Number(document.getElementById('rule-fwhm-max').value);
      ScienceProfiles.PROFILES[activeProfileKey].rules.ellipticityMax = Number(document.getElementById('rule-ellip-max').value);
      ScienceProfiles.PROFILES[activeProfileKey].rules.backgroundAduMax = Number(document.getElementById('rule-bg-max').value);
      ScienceProfiles.PROFILES[activeProfileKey].rules.snrMin = Number(document.getElementById('rule-snr-min').value);
      recalculateSession();
    });
  });

  // Simulator seeing slider
  document.getElementById('sim-seeing')?.addEventListener('input', (e) => {
    const seeing = Number(e.target.value);
    document.getElementById('sim-seeing-val').textContent = `${seeing.toFixed(1)}"`;
    drawSyntheticStars();
    updatePsfChart(seeing);
  });

  // Reset batch
  document.getElementById('reset-batch-btn')?.addEventListener('click', () => {
    sessionSubframes = JSON.parse(JSON.stringify(DEFAULT_SUBFRAMES));
    renderSessionTable();
    recalculateSession();
  });

  // Export JSON
  document.getElementById('export-qc-btn')?.addEventListener('click', exportQcJson);
}

function recalculateSession() {
  const minFwhm = Math.min(...sessionSubframes.map(f => f.fwhmArcsec));
  const minEllip = Math.min(...sessionSubframes.map(f => f.ellipticity));
  const maxSnr = Math.max(...sessionSubframes.map(f => f.snr));

  let acceptedCount = 0;
  let totalExposureSec = 0;
  let acceptedExposureSec = 0;

  sessionSubframes.forEach((frame, idx) => {
    const evalRes = ScienceProfiles.evaluateFrame(frame, activeProfileKey);
    frame.evaluation = evalRes;
    frame.weight = ScienceProfiles.calculateStackWeight(frame, minFwhm, minEllip, maxSnr);
    
    // Auto-decide acceptance
    if (evalRes.overallGrade === "PASS") {
      frame.accepted = true;
    } else if (evalRes.overallGrade === "CONDITIONAL") {
      frame.accepted = true; // Por defecto condicional se acepta con peso menor
    } else {
      frame.accepted = false;
    }

    totalExposureSec += frame.exp;
    if (frame.accepted) {
      acceptedCount++;
      acceptedExposureSec += frame.exp;
    }
  });

  // Actualizar KPI Cards
  document.getElementById('stat-total-frames').textContent = sessionSubframes.length;
  document.getElementById('stat-accepted-frames').textContent = `${acceptedCount} / ${sessionSubframes.length}`;
  const effPct = Math.round((acceptedCount / sessionSubframes.length) * 100);
  document.getElementById('stat-acceptance-pct').textContent = `${effPct} %`;
  document.getElementById('stat-total-time').textContent = `${(acceptedExposureSec / 3600).toFixed(2)} h`;

  // Mejores métricas
  const acceptedFrames = sessionSubframes.filter(f => f.accepted);
  if (acceptedFrames.length > 0) {
    const meanFwhm = acceptedFrames.reduce((acc, f) => acc + f.fwhmArcsec, 0) / acceptedFrames.length;
    const meanEllip = acceptedFrames.reduce((acc, f) => acc + f.ellipticity, 0) / acceptedFrames.length;
    document.getElementById('stat-mean-fwhm').textContent = `${meanFwhm.toFixed(2)}"`;
    document.getElementById('stat-mean-ellip').textContent = `${meanEllip.toFixed(3)}`;
  } else {
    document.getElementById('stat-mean-fwhm').textContent = "--";
    document.getElementById('stat-mean-ellip').textContent = "--";
  }

  renderSessionTable();
  updateTrendChart();
}

function renderSessionTable() {
  const tbody = document.getElementById('session-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  sessionSubframes.forEach((f, idx) => {
    const tr = document.createElement('tr');
    tr.className = `border-b border-slate-800 text-xs hover:bg-slate-800/40 ${!f.accepted ? 'opacity-60 bg-rose-950/10' : ''}`;
    
    let gradeBadgeClass = "badge-pass";
    if (f.evaluation?.overallGrade === "CONDITIONAL") gradeBadgeClass = "badge-conditional";
    if (f.evaluation?.overallGrade === "REJECT") gradeBadgeClass = "badge-reject";

    tr.innerHTML = `
      <td class="p-2.5 text-center">
        <input type="checkbox" ${f.accepted ? 'checked' : ''} class="frame-toggle accent-sky-500 cursor-pointer" data-idx="${idx}">
      </td>
      <td class="p-2.5 font-mono font-bold text-slate-200">${f.id}</td>
      <td class="p-2.5 font-mono text-slate-400">${f.time}</td>
      <td class="p-2.5 font-mono">${f.filter}</td>
      <td class="p-2.5 font-mono">${f.airmass.toFixed(2)}</td>
      <td class="p-2.5 font-mono font-bold ${f.evaluation?.grades?.fwhm === 'PASS' ? 'text-emerald-400' : (f.evaluation?.grades?.fwhm === 'WARNING' ? 'text-amber-400' : 'text-rose-400')}">
        ${f.fwhmArcsec.toFixed(2)}"
      </td>
      <td class="p-2.5 font-mono ${f.evaluation?.grades?.ellipticity === 'PASS' ? 'text-slate-300' : 'text-rose-400 font-bold'}">
        ${f.ellipticity.toFixed(3)}
      </td>
      <td class="p-2.5 font-mono ${f.evaluation?.grades?.background === 'PASS' ? 'text-slate-300' : 'text-amber-400 font-bold'}">
        ${f.backgroundAdu}
      </td>
      <td class="p-2.5 font-mono text-slate-300">${f.snr.toFixed(1)}</td>
      <td class="p-2.5 font-mono font-bold text-sky-400">${f.weight?.toFixed(3) || '--'}</td>
      <td class="p-2.5">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${gradeBadgeClass}">
          ${f.evaluation?.overallGrade || 'PASS'}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.frame-toggle').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const idx = Number(e.target.dataset.idx);
      sessionSubframes[idx].accepted = e.target.checked;
      recalculateSession();
    });
  });
}

function initCharts() {
  const ctx1 = document.getElementById('trendChart')?.getContext('2d');
  const ctx2 = document.getElementById('psfProfileChart')?.getContext('2d');

  if (ctx1) {
    trendChart = new Chart(ctx1, {
      type: 'line',
      data: {
        labels: sessionSubframes.map(f => f.time),
        datasets: [
          {
            label: 'FWHM (arcsec)',
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            data: sessionSubframes.map(f => f.fwhmArcsec),
            yAxisID: 'y'
          },
          {
            label: 'Elipticidad (e)',
            borderColor: '#fbbf24',
            borderDash: [5, 5],
            data: sessionSubframes.map(f => f.ellipticity),
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#9ca3af' } }
        },
        scales: {
          x: { ticks: { color: '#9ca3af' }, grid: { color: '#1f2937' } },
          y: {
            title: { display: true, text: 'FWHM (arcsec)', color: '#38bdf8' },
            ticks: { color: '#38bdf8' },
            grid: { color: '#1f2937' },
            position: 'left'
          },
          y1: {
            title: { display: true, text: 'Elipticidad', color: '#fbbf24' },
            ticks: { color: '#fbbf24' },
            grid: { drawOnChartArea: false },
            position: 'right',
            min: 0,
            max: 0.5
          }
        }
      }
    });
  }

  if (ctx2) {
    psfProfileChart = new Chart(ctx2, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Perfil Observado (Pixel)',
            borderColor: '#e5e7eb',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            data: [],
            borderWidth: 2
          },
          {
            label: 'Ajuste Moffat (β=4.765)',
            borderColor: '#38bdf8',
            borderDash: [4, 4],
            data: [],
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: 'Radio desde el Centroide (Píxeles)', color: '#9ca3af' },
            ticks: { color: '#9ca3af' },
            grid: { color: '#1f2937' },
            min: 0,
            max: 8
          },
          y: {
            title: { display: true, text: 'Intensidad (ADU)', color: '#9ca3af' },
            ticks: { color: '#9ca3af' },
            grid: { color: '#1f2937' }
          }
        }
      }
    });
    updatePsfChart(2.2);
  }
}

function updateTrendChart() {
  if (!trendChart) return;
  trendChart.data.labels = sessionSubframes.map(f => f.time);
  trendChart.data.datasets[0].data = sessionSubframes.map(f => f.fwhmArcsec);
  trendChart.data.datasets[1].data = sessionSubframes.map(f => f.ellipticity);
  trendChart.update();
}

function updatePsfChart(seeingArcsec = 2.2) {
  if (!psfProfileChart) return;
  const pixelScale = 1.0; // 1 arcsec / px
  const fwhmPx = seeingArcsec / pixelScale;
  const sigma = PsfEngine.fwhmToSigma(fwhmPx);
  const alpha = fwhmPx / (2 * Math.sqrt(Math.pow(2, 1 / 4.765) - 1));

  const ptsObserved = [];
  const ptsMoffat = [];
  const i0 = 3500;
  const bg = 500;

  for (let r = 0; r <= 8; r += 0.25) {
    const valObs = PsfEngine.gaussianRadialProfile(r, i0, sigma, bg) + (Math.random() - 0.5) * 45;
    const valMoffat = PsfEngine.moffatRadialProfile(r, i0, alpha, 4.765, bg);
    ptsObserved.push({ x: Number(r.toFixed(2)), y: Math.round(valObs) });
    ptsMoffat.push({ x: Number(r.toFixed(2)), y: Math.round(valMoffat) });
  }

  psfProfileChart.data.datasets[0].data = ptsObserved;
  psfProfileChart.data.datasets[1].data = ptsMoffat;
  psfProfileChart.update();
}

function initSyntheticCanvas() {
  const canvas = document.getElementById('synthetic-fits-canvas');
  if (!canvas) return;
  drawSyntheticStars();

  canvas.addEventListener('click', (e) => {
    // Al clickear sobre el canvas, recrear campo estelar
    drawSyntheticStars();
  });
}

function drawSyntheticStars() {
  const canvas = document.getElementById('synthetic-fits-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Fondo oscuro con ruido
  const imgData = ctx.createImageData(w, h);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const noise = Math.floor(10 + Math.random() * 12);
    imgData.data[i] = noise;     // R
    imgData.data[i + 1] = noise; // G
    imgData.data[i + 2] = noise + 4; // B (leve azulado de cielo nocturno)
    imgData.data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  // Estrellas sintéticas
  const seeingVal = Number(document.getElementById('sim-seeing')?.value || 2.2);
  const numStars = 40;

  for (let s = 0; s < numStars; s++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const brightness = Math.random();
    const rad = Math.max(1, (seeingVal * (0.8 + brightness * 1.5)));

    const grad = ctx.createRadialGradient(x, y, 0, x, y, rad * 3);
    grad.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1, brightness + 0.4)})`);
    grad.addColorStop(0.3, `rgba(200, 230, 255, ${brightness * 0.7})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, rad * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Estrella de prueba central seleccionada
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1;
  ctx.strokeRect(w / 2 - 12, h / 2 - 12, 24, 24);
  ctx.font = '9px Consolas';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('REF_STAR', w / 2 - 18, h / 2 + 20);
}

function exportQcJson() {
  const report = {
    generator: "astro-qc v2.0.0",
    timestamp: new Date().toISOString(),
    profile: ScienceProfiles.PROFILES[activeProfileKey],
    summary: {
      totalFrames: sessionSubframes.length,
      acceptedFrames: sessionSubframes.filter(f => f.accepted).length,
      acceptanceRate: `${Math.round((sessionSubframes.filter(f => f.accepted).length / sessionSubframes.length) * 100)}%`
    },
    subframes: sessionSubframes
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `astro_qc_session_report_${activeProfileKey}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
