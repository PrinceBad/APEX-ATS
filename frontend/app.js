// ApexATS Interactive Client Application
let currentCandidates = [];
let activeFilter = 'ALL';
let activeJD = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadActiveJD();
  // Auto-load benchmark batch on initial boot so the interface immediately feels alive
  loadSampleBatch();
});

// ---------------------------------------------------------------------------
// 1. Navigation & Tab Switching
// ---------------------------------------------------------------------------
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));

  const activeBtn = document.getElementById(`tab-${tabId}`);
  const activeView = document.getElementById(`view-${tabId}`);

  if (activeBtn) activeBtn.classList.add('active');
  if (activeView) activeView.classList.add('active');
}

// ---------------------------------------------------------------------------
// 2. Job Description Management
// ---------------------------------------------------------------------------
async function loadActiveJD() {
  try {
    const res = await fetch('/api/jd');
    const data = await res.json();
    activeJD = data.active_jd;
    populateJDEditor(activeJD);
  } catch (err) {
    console.error('Failed to load active JD:', err);
  }
}

function populateJDEditor(jd) {
  document.getElementById('jd-title-input').value = jd.title || '';
  document.getElementById('jd-min-exp').value = jd.min_experience_years || 4.0;
  document.getElementById('exp-val-badge').textContent = `${jd.min_experience_years || 4.0}y`;
  document.getElementById('jd-degree-select').value = jd.required_degree || "Bachelor's";
  document.getElementById('jd-desc-input').value = jd.description || '';

  renderChips('must-have-chips', jd.must_have_skills || [], 'must_have');
  renderChips('preferred-chips', jd.preferred_skills || [], 'preferred');
}

function updateExpDisplay(val) {
  document.getElementById('exp-val-badge').textContent = `${parseFloat(val).toFixed(1)}y`;
}

function renderChips(containerId, skills, type) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  skills.forEach((skill, index) => {
    const chip = document.createElement('span');
    chip.className = 'skill-chip';
    chip.innerHTML = `
      <span>${skill}</span>
      <span class="chip-remove" onclick="removeSkill('${type}', ${index})">✕</span>
    `;
    container.appendChild(chip);
  });
}

function handleChipKeydown(e, type) {
  if (e.key === 'Enter' && e.target.value.trim()) {
    e.preventDefault();
    const val = e.target.value.trim().toLowerCase();
    if (type === 'must_have') {
      if (!activeJD.must_have_skills.includes(val)) {
        activeJD.must_have_skills.push(val);
        renderChips('must-have-chips', activeJD.must_have_skills, 'must_have');
      }
    } else {
      if (!activeJD.preferred_skills.includes(val)) {
        activeJD.preferred_skills.push(val);
        renderChips('preferred-chips', activeJD.preferred_skills, 'preferred');
      }
    }
    e.target.value = '';
  }
}

function removeSkill(type, index) {
  if (type === 'must_have') {
    activeJD.must_have_skills.splice(index, 1);
    renderChips('must-have-chips', activeJD.must_have_skills, 'must_have');
  } else {
    activeJD.preferred_skills.splice(index, 1);
    renderChips('preferred-chips', activeJD.preferred_skills, 'preferred');
  }
}

async function handlePresetChange(presetKey) {
  try {
    const res = await fetch(`/api/jd/preset/${presetKey}`, { method: 'POST' });
    const data = await res.json();
    activeJD = data.active_jd;
    populateJDEditor(activeJD);
    // Re-screen current candidates against new JD preset
    loadSampleBatch();
  } catch (err) {
    console.error('Failed to load preset:', err);
  }
}

async function saveJobDescription() {
  activeJD.title = document.getElementById('jd-title-input').value.trim();
  activeJD.min_experience_years = parseFloat(document.getElementById('jd-min-exp').value);
  activeJD.required_degree = document.getElementById('jd-degree-select').value;
  activeJD.description = document.getElementById('jd-desc-input').value.trim();

  try {
    const res = await fetch('/api/jd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activeJD)
    });
    const data = await res.json();
    alert('Match criteria saved! Re-evaluating candidate pool...');
    loadSampleBatch();
  } catch (err) {
    console.error('Failed to save JD:', err);
  }
}

// ---------------------------------------------------------------------------
// 3. Batch Screening & Leaderboard
// ---------------------------------------------------------------------------
async function loadSampleBatch() {
  const btn = document.getElementById('btn-load-samples');
  btn.disabled = true;
  btn.innerHTML = `<span class="btn-icon">⏳</span> Evaluating Pipeline...`;

  try {
    const res = await fetch('/api/screen/sample', { method: 'POST' });
    const data = await res.json();
    handleScreeningResults(data);
  } catch (err) {
    console.error('Failed to screen sample batch:', err);
    alert('Error running batch screening. Check console.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span class="btn-icon">🚀</span> Run Benchmark Batch (8 Edge Cases)`;
  }
}

async function handleFileSelect(files) {
  if (!files || files.length === 0) return;

  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i]);
  }

  const dropzoneText = document.querySelector('.dropzone-text strong');
  dropzoneText.textContent = `Uploading & parsing ${files.length} files...`;

  try {
    const res = await fetch('/api/screen/upload', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    handleScreeningResults(data);
  } catch (err) {
    alert('Upload screening error: ' + err.message);
  } finally {
    dropzoneText.textContent = 'Drag & Drop Candidate Resumes';
  }
}

function handleScreeningResults(data) {
  currentCandidates = data.ranked_candidates || [];

  // Update telemetry bar
  const telem = data.telemetry;
  if (telem) {
    document.getElementById('telemetry-bar').style.display = 'grid';
    document.getElementById('telem-batch-size').textContent = data.batch_size;
    document.getElementById('telem-total-time').textContent = `${telem.total_pipeline_ms} ms`;
    document.getElementById('telem-parse-time').textContent = `${telem.parse_time_ms} ms`;
    document.getElementById('telem-stage1-time').textContent = `${telem.stage1_retrieval_ms} ms`;
    document.getElementById('telem-throughput').textContent = `${telem.avg_ms_per_resume} ms / cand`;
    document.getElementById('header-throughput').textContent = `⚡ ${telem.avg_ms_per_resume} ms/cand`;
  }

  document.getElementById('candidate-count').textContent = `${currentCandidates.length} evaluated`;
  renderLeaderboard();
}

function filterCandidates(tier) {
  activeFilter = tier;
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  event.target.classList.add('active');
  renderLeaderboard();
}

function renderLeaderboard() {
  const tbody = document.getElementById('leaderboard-body');
  tbody.innerHTML = '';

  let filtered = currentCandidates;
  if (activeFilter !== 'ALL') {
    filtered = currentCandidates.filter(c => c.tier === activeFilter);
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-state-row">
        <td colspan="8">
          <div class="empty-state">
            <span class="empty-icon">🔍</span>
            <h4>No candidates match filter "${activeFilter}"</h4>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach((cand, idx) => {
    const tr = document.createElement('tr');

    // Rank styling
    const rankClass = idx === 0 ? 'top-1' : '';
    const scoreVal = cand.composite_score;
    let scoreClass = 'mid';
    if (scoreVal >= 80) scoreClass = 'high';
    else if (scoreVal < 45) scoreClass = 'low';

    // Tier badge format
    let tierClass = 'reject';
    let tierText = cand.tier_label;
    if (cand.tier === 'TOP_TIER') tierClass = 'top-tier';
    else if (cand.tier === 'FLAGGED_REVIEW') tierClass = 'review-tier';
    else if (cand.tier === 'SECURITY_FLAG') tierClass = 'security-flag';

    // Format badge
    let formatPill = 'TXT';
    if (cand.file_name.endsWith('.pdf')) formatPill = 'PDF (2 Pages)';
    else if (cand.file_name.endsWith('.docx')) formatPill = 'DOCX';

    // Candidate friendly name
    const friendlyName = cand.file_name
      .replace(/^\d+_/, '')
      .replace(/\.(pdf|docx|txt)$/, '')
      .replace(/_/g, ' ');

    tr.innerHTML = `
      <td><span class="rank-badge ${rankClass}">#${idx + 1}</span></td>
      <td>
        <div class="candidate-cell">
          <span class="cand-name">${friendlyName}</span>
          <span class="cand-format-tag">
            <span>📄 ${formatPill}</span>
            ${cand.ocr_required ? '<span style="color:var(--accent-amber)">⚠️ Scanned (OCR Target)</span>' : ''}
          </span>
        </div>
      </td>
      <td>
        <div class="score-cell">
          <span class="score-num ${scoreClass}">${scoreVal.toFixed(1)}%</span>
        </div>
      </td>
      <td><span class="mono-cell">${cand.bm25_score.toFixed(1)}</span></td>
      <td><span class="mono-cell">${cand.semantic_score.toFixed(1)}</span></td>
      <td><span class="mono-cell">${cand.experience_years.toFixed(1)}y</span></td>
      <td>
        <span class="tier-badge ${tierClass}">${tierText}</span>
      </td>
      <td>
        <button class="inspect-btn" onclick="openDrawer(${idx})">Inspect</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ---------------------------------------------------------------------------
// 4. Candidate Detail Drawer
// ---------------------------------------------------------------------------
function openDrawer(index) {
  let filtered = currentCandidates;
  if (activeFilter !== 'ALL') {
    filtered = currentCandidates.filter(c => c.tier === activeFilter);
  }
  const cand = filtered[index];
  if (!cand) return;

  const friendlyName = cand.file_name
    .replace(/^\d+_/, '')
    .replace(/\.(pdf|docx|txt)$/, '')
    .replace(/_/g, ' ');

  document.getElementById('modal-rank').textContent = `#${index + 1}`;
  document.getElementById('modal-name').textContent = friendlyName;
  document.getElementById('modal-format-badge').textContent = cand.file_name;
  document.getElementById('modal-composite-score').textContent = `${cand.composite_score.toFixed(1)}%`;
  document.getElementById('modal-bm25').textContent = cand.bm25_score.toFixed(1);
  document.getElementById('modal-dense').textContent = cand.semantic_score.toFixed(1);
  document.getElementById('modal-exp-score').textContent = cand.experience_score.toFixed(1);
  document.getElementById('modal-star-score').textContent = cand.star_impact_score.toFixed(1);

  // Decision banner
  const decBanner = document.getElementById('modal-decision-banner');
  decBanner.className = 'decision-banner';
  if (cand.tier === 'TOP_TIER') decBanner.classList.add('top-tier');
  else if (cand.tier === 'FLAGGED_REVIEW') decBanner.classList.add('review-tier');
  else if (cand.tier === 'SECURITY_FLAG') decBanner.classList.add('security-flag');
  else decBanner.classList.add('reject');
  document.getElementById('modal-decision-text').textContent = cand.tier_label;

  // Hard filters list
  const filterList = document.getElementById('modal-filter-list');
  filterList.innerHTML = '';
  if (cand.failed_hard_filters && cand.failed_hard_filters.length > 0) {
    cand.failed_hard_filters.forEach(f => {
      filterList.innerHTML += `<li class="fail">❌ Filter Gap: ${f}</li>`;
    });
    if (cand.composite_score >= 65.0) {
      filterList.innerHTML += `<li class="pass">💡 High Competency Routing: Discrepancy routed to human recruiter review rather than algorithmic auto-rejection.</li>`;
    }
  } else {
    filterList.innerHTML += `<li class="pass">✅ Minimum Experience Requirement Met (${cand.experience_years}y ≥ ${activeJD.min_experience_years}y)</li>`;
    filterList.innerHTML += `<li class="pass">✅ Degree Credential Verified (${cand.education})</li>`;
    filterList.innerHTML += `<li class="pass">✅ Core Technology Competencies Satisfied</li>`;
  }

  // STAR Metrics
  const starBox = document.getElementById('modal-star-metrics');
  starBox.innerHTML = '';
  if (cand.quantified_metrics_found && cand.quantified_metrics_found.length > 0) {
    cand.quantified_metrics_found.forEach(m => {
      starBox.innerHTML += `<span class="star-metric-pill">📈 ${m}</span>`;
    });
  } else {
    starBox.innerHTML = `<span style="color:var(--text-muted);font-size:0.82rem;">No explicit percentage/dollar/scale metrics detected.</span>`;
  }

  // Security scan box
  document.getElementById('modal-threat-level').textContent = cand.threat_level;
  document.getElementById('modal-density').textContent = `${cand.density_chars_per_page} chars/page`;
  document.getElementById('modal-ocr-status').textContent = cand.ocr_required ? '⚠️ Triggered (<150 density)' : '✅ Native Text Passed';

  const threatsList = document.getElementById('modal-threats-list');
  threatsList.innerHTML = '';
  if (cand.threats && cand.threats.length > 0) {
    cand.threats.forEach(t => {
      threatsList.innerHTML += `<div style="color:var(--accent-crimson);font-size:0.8rem;margin-top:4px;">🚨 ${t}</div>`;
    });
  }

  // Text stream
  document.getElementById('modal-clean-text').textContent = cand.clean_text || 'Text stream sanitized and processed.';

  // Show drawer
  document.getElementById('candidate-drawer').classList.add('active');
}

function closeDrawer(e) {
  document.getElementById('candidate-drawer').classList.remove('active');
}

function closeDrawerDirect() {
  document.getElementById('candidate-drawer').classList.remove('active');
}

// ---------------------------------------------------------------------------
// 5. Live Threshold Tuning
// ---------------------------------------------------------------------------
function updateLiveThresholds() {
  const thetaInt = parseFloat(document.getElementById('live-theta-int').value);
  const thetaRev = parseFloat(document.getElementById('live-theta-rev').value);

  document.getElementById('live-theta-int-val').textContent = thetaInt.toFixed(1);
  document.getElementById('live-theta-rev-val').textContent = thetaRev.toFixed(1);

  // Dynamically re-tier candidates on the client
  currentCandidates.forEach(cand => {
    if (cand.threat_level === 'CRITICAL_ATTACK') {
      cand.tier = 'SECURITY_FLAG';
      cand.tier_label = '[BLOCKED] Prompt Injection Detected';
    } else if (cand.failed_hard_filters && cand.failed_hard_filters.length > 0) {
      if (cand.composite_score >= thetaRev) {
        cand.tier = 'FLAGGED_REVIEW';
        cand.tier_label = '[REVIEW] Prerequisite Gap but High Competency';
      } else {
        cand.tier = 'REJECT';
        cand.tier_label = '[REJECT] Missing Core Criteria';
      }
    } else {
      if (cand.composite_score >= thetaInt) {
        cand.tier = 'TOP_TIER';
        cand.tier_label = '[TOP TIER] Strong Contender Shortlist';
      } else if (cand.composite_score >= thetaRev) {
        cand.tier = 'FLAGGED_REVIEW';
        cand.tier_label = '[SOLID MATCH] Review & Interview Queue';
      } else {
        cand.tier = 'REJECT';
        cand.tier_label = '[REJECT] Low Match';
      }
    }
  });

  renderLeaderboard();
}

// Drag & drop listeners
const dropzone = document.getElementById('dropzone');
if (dropzone) {
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add('hover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove('hover');
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFileSelect(files);
  });
}
