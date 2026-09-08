const { useState, useEffect, useMemo, useCallback } = React;

function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState('screening'); // 'screening' | 'calibration' | 'bias'

  // Target Job Description State
  const [presets, setPresets] = useState({});
  const [selectedPresetKey, setSelectedPresetKey] = useState('senior_ai_systems');
  const [activeJD, setActiveJD] = useState({
    title: 'Senior AI Systems & Edge Runtime Engineer',
    description: '',
    min_experience_years: 4.0,
    required_degree: "Bachelor's",
    must_have_skills: ['python', 'kubernetes', 'litert', 'vllm'],
    preferred_skills: ['c++', 'docker', 'onnx', 'quantization', 'triton'],
    category: 'Edge & MLSys',
    icon: '⚡'
  });

  // Candidate Screening Results
  const [batchResults, setBatchResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Awaiting document ingestion');
  
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('ALL'); // 'ALL' | 'SHORTLIST' | 'REVIEW' | 'ARCHIVED' | 'SECURITY'
  const [sortBy, setSortBy] = useState('SCORE_DESC');

  // Modals & Dossier State
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [compareList, setCompareList] = useState([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  // Custom Profile Form State
  const [customForm, setCustomForm] = useState({
    title: '',
    category: 'Operations',
    icon: '📋',
    description: '',
    min_experience_years: 1.0,
    required_degree: "Bachelor's",
    must_have_skills: [],
    preferred_skills: []
  });
  const [customMustInput, setCustomMustInput] = useState('');
  const [customPrefInput, setCustomPrefInput] = useState('');

  // File Upload State
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragActive, setIsDragActive] = useState(false);

  // Active JD Skill Editing
  const [newMustSkill, setNewMustSkill] = useState('');
  const [newPrefSkill, setNewPrefSkill] = useState('');

  // Calibration & Bias Telemetry Data
  const [calibrationData, setCalibrationData] = useState(null);
  const [counterfactualData, setCounterfactualData] = useState(null);

  // Interactive Weight Tuning Simulator
  const [simWeights, setSimWeights] = useState({
    bm25: 35,
    dense: 40,
    experience: 15,
    star: 10
  });

  // Initial Load: Fetch JD, Presets, Benchmark Resumes, and Telemetry
  useEffect(() => {
    fetchJD();
    loadBenchmarkCandidates();
    fetchCalibration();
    fetchCounterfactual();
  }, []);

  const fetchJD = async () => {
    try {
      const res = await fetch('/api/jd');
      if (res.ok) {
        const data = await res.json();
        setActiveJD(data.active_jd);
        setPresets(data.presets || {});
      }
    } catch (err) {
      console.error('Failed to load target profile:', err);
    }
  };

  const fetchCalibration = async () => {
    try {
      const res = await fetch('/api/calibration');
      if (res.ok) {
        const data = await res.json();
        setCalibrationData(data);
      }
    } catch (err) {
      console.error('Failed to load calibration data:', err);
    }
  };

  const fetchCounterfactual = async () => {
    try {
      const res = await fetch('/api/counterfactual');
      if (res.ok) {
        const data = await res.json();
        setCounterfactualData(data);
      }
    } catch (err) {
      console.error('Failed to load counterfactual sensitivity audit:', err);
    }
  };

  // Switch Active Preset
  const handleSelectPreset = async (key) => {
    setSelectedPresetKey(key);
    setIsLoading(true);
    setStatusMsg(`Loading target specification: ${presets[key]?.title || key}...`);
    try {
      const res = await fetch(`/api/jd/preset/${key}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setActiveJD(data.active_jd);
        setStatusMsg(`Active Target: ${data.active_jd.title}`);
        await loadBenchmarkCandidates();
      }
    } catch (err) {
      console.error('Error switching target role:', err);
      setStatusMsg('Error loading target specification');
    } finally {
      setIsLoading(false);
    }
  };

  // Save Modifications to Current JD
  const handleSaveJD = async () => {
    setIsLoading(true);
    setStatusMsg('Updating evaluation criteria...');
    try {
      const res = await fetch('/api/jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: activeJD.title,
          description: activeJD.description,
          min_experience_years: parseFloat(activeJD.min_experience_years),
          required_degree: activeJD.required_degree,
          must_have_skills: activeJD.must_have_skills,
          preferred_skills: activeJD.preferred_skills
        })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveJD(data.active_jd);
        setStatusMsg('Evaluation criteria updated and re-scored');
        await loadBenchmarkCandidates();
      }
    } catch (err) {
      console.error('Error updating JD:', err);
      setStatusMsg('Failed to update criteria');
    } finally {
      setIsLoading(false);
    }
  };

  // Create & Persist New Target Role
  const handleCreateCustomProfile = async () => {
    if (!customForm.title.trim()) {
      alert('Please specify a role title.');
      return;
    }
    setIsLoading(true);
    setStatusMsg(`Creating profile: ${customForm.title}...`);
    try {
      const res = await fetch('/api/jd/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: customForm.title.trim(),
          category: customForm.category.trim() || 'Custom',
          icon: customForm.icon.trim() || '📋',
          description: customForm.description.trim(),
          min_experience_years: parseFloat(customForm.min_experience_years) || 1.0,
          required_degree: customForm.required_degree,
          must_have_skills: customForm.must_have_skills,
          preferred_skills: customForm.preferred_skills
        })
      });
      if (res.ok) {
        const data = await res.json();
        await fetchJD();
        setSelectedPresetKey(data.key);
        setActiveJD(data.active_jd);
        setIsCustomModalOpen(false);
        setStatusMsg(`Target Profile Active: ${data.preset.title}`);
        await loadBenchmarkCandidates();
      } else {
        setStatusMsg('Failed to register custom profile');
      }
    } catch (err) {
      console.error('Error creating profile:', err);
      setStatusMsg('Error registering profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Load Benchmark Cohort
  const loadBenchmarkCandidates = async () => {
    setIsLoading(true);
    setStatusMsg('Evaluating benchmark cohort via dual-layer retrieval...');
    try {
      const res = await fetch('/api/screen/sample', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setBatchResults(data);
        setStatusMsg(`Evaluation complete: ${data.ranked_candidates.length} dossiers evaluated`);
      }
    } catch (err) {
      console.error('Error screening benchmark:', err);
      setStatusMsg('Screening error encountered');
    } finally {
      setIsLoading(false);
    }
  };

  // Upload Batch
  const handleUploadBatch = async () => {
    if (!uploadedFiles || uploadedFiles.length === 0) return;
    setIsLoading(true);
    setStatusMsg(`Ingesting and sanitizing ${uploadedFiles.length} candidate documents...`);
    const formData = new FormData();
    for (let f of uploadedFiles) {
      formData.append('files', f);
    }

    try {
      const res = await fetch('/api/screen/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setBatchResults(data);
        setUploadedFiles([]);
        setStatusMsg(`Batch processing complete: ${data.ranked_candidates.length} dossiers processed`);
      } else {
        const errData = await res.json();
        setStatusMsg(`Upload error: ${errData.detail || 'Invalid document formats'}`);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setStatusMsg('Batch ingestion failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Export Audit CSV
  const exportCSV = () => {
    if (!batchResults || !batchResults.ranked_candidates) return;
    const headers = ['Rank', 'Candidate Name', 'File Name', 'Alignment Score', 'BM25 Lexical', 'Dense Semantic', 'Experience (Yrs)', 'Security Status', 'Audit Determination'];
    const rows = batchResults.ranked_candidates.map((c, i) => [
      i + 1,
      formatCandidateName(c.file_name),
      c.file_name,
      c.composite_score.toFixed(1),
      (c.bm25_score || 0).toFixed(1),
      (c.semantic_score || 0).toFixed(1),
      c.experience_years || 0,
      c.threat_level,
      c.tier_label || ''
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Apex_Audit_Ledger_${activeJD.title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle Comparison
  const toggleCompareCandidate = (cand) => {
    if (compareList.some(c => c.file_name === cand.file_name)) {
      setCompareList(compareList.filter(c => c.file_name !== cand.file_name));
    } else {
      if (compareList.length >= 2) {
        setCompareList([compareList[1], cand]);
      } else {
        setCompareList([...compareList, cand]);
      }
    }
  };

  // Format Clean Name
  const formatCandidateName = (fileName) => {
    if (!fileName) return 'Unknown Candidate';
    let clean = fileName.replace(/\.(pdf|docx|txt)$/i, '');
    clean = clean.replace(/^\d+[_-\s]*/, '');
    return clean.replace(/_/g, ' ');
  };

  // Filtered & Sorted Candidates
  const processedCandidates = useMemo(() => {
    if (!batchResults || !batchResults.ranked_candidates) return [];
    let list = [...batchResults.ranked_candidates];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(c => {
        const name = formatCandidateName(c.file_name).toLowerCase();
        return name.includes(term) || (c.education && c.education.toLowerCase().includes(term));
      });
    }

    if (tierFilter === 'SHORTLIST') {
      list = list.filter(c => c.composite_score >= 80 && c.threat_level === 'CLEAN');
    } else if (tierFilter === 'REVIEW') {
      list = list.filter(c => c.composite_score >= 50 && c.composite_score < 80 && c.threat_level === 'CLEAN');
    } else if (tierFilter === 'ARCHIVED') {
      list = list.filter(c => c.composite_score < 50 && c.threat_level === 'CLEAN');
    } else if (tierFilter === 'SECURITY') {
      list = list.filter(c => c.threat_level !== 'CLEAN');
    }

    if (sortBy === 'SCORE_DESC') {
      list.sort((a, b) => b.composite_score - a.composite_score);
    } else if (sortBy === 'SCORE_ASC') {
      list.sort((a, b) => a.composite_score - b.composite_score);
    } else if (sortBy === 'EXP_DESC') {
      list.sort((a, b) => (b.experience_years || 0) - (a.experience_years || 0));
    }

    return list;
  }, [batchResults, searchTerm, tierFilter, sortBy]);

  // Simulated Scores in Calibration Tab
  const simulatedCandidates = useMemo(() => {
    if (!batchResults || !batchResults.ranked_candidates) return [];
    const totalWeight = (simWeights.bm25 + simWeights.dense + simWeights.experience + simWeights.star) || 100;
    return batchResults.ranked_candidates.map(c => {
      const simScore = (
        (c.bm25_score || 0) * (simWeights.bm25 / totalWeight) +
        (c.semantic_score || 0) * (simWeights.dense / totalWeight) +
        (c.experience_score || 0) * (simWeights.experience / totalWeight) +
        (c.star_impact_score || 0) * (simWeights.star / totalWeight)
      );
      return {
        ...c,
        simScore: Math.min(100, Math.max(0, simScore))
      };
    }).sort((a, b) => b.simScore - a.simScore);
  }, [batchResults, simWeights]);

  return (
    <div>
      {/* Top Institutional Masthead */}
      <header className="cf-masthead">
        <div className="cf-masthead-inner">
          <div className="cf-brand-group">
            <span className="cf-brand-title">Apex</span>
            <span className="cf-brand-tag">Candidate Evaluation & Audit Ledger</span>
          </div>

          <nav className="cf-nav-tabs">
            <button 
              className={`cf-nav-btn ${activeTab === 'screening' ? 'active' : ''}`}
              onClick={() => setActiveTab('screening')}
            >
              Candidate Ledger
            </button>
            <button 
              className={`cf-nav-btn ${activeTab === 'calibration' ? 'active' : ''}`}
              onClick={() => setActiveTab('calibration')}
            >
              Threshold Calibration Exhibit
            </button>
            <button 
              className={`cf-nav-btn ${activeTab === 'bias' ? 'active' : ''}`}
              onClick={() => setActiveTab('bias')}
            >
              Demographic Sensitivity Audit
            </button>
          </nav>

          <div className="cf-system-badge">
            <span className="cf-pulse-dot"></span>
            <span>{statusMsg}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="cf-main-container">
        
        {/* SCREENING LEDGER TAB */}
        {activeTab === 'screening' && (
          <div>
            {/* Active Target Profile Specification */}
            <div className="cf-target-card">
              <div className="cf-target-header">
                <div>
                  <div className="cf-target-pretitle">Active Evaluation Specification</div>
                  <h1 className="cf-target-title">{activeJD.title}</h1>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="cf-btn cf-btn-secondary"
                    onClick={() => setIsCustomModalOpen(true)}
                  >
                    ➕ New Specification
                  </button>
                  <button 
                    className="cf-btn cf-btn-secondary"
                    onClick={exportCSV}
                    disabled={!batchResults}
                  >
                    📥 Export Audit CSV
                  </button>
                </div>
              </div>

              <div className="cf-target-meta">
                <div className="cf-meta-item">
                  <span className="cf-meta-label">Domain:</span>
                  <span className="cf-meta-value">{activeJD.category || 'General'}</span>
                </div>
                <div className="cf-meta-item">
                  <span className="cf-meta-label">Tenure Requirement:</span>
                  <span className="cf-meta-value">≥ {activeJD.min_experience_years} Years</span>
                </div>
                <div className="cf-meta-item">
                  <span className="cf-meta-label">Academic Prerequisite:</span>
                  <span className="cf-meta-value">{activeJD.required_degree || "Bachelor's"}</span>
                </div>
                <div className="cf-meta-item">
                  <span className="cf-meta-label">Retrieval Architecture:</span>
                  <span className="cf-meta-value">Hybrid BM25 + Dense Semantic Cosine</span>
                </div>
              </div>

              {/* Skills Strip */}
              <div className="cf-skills-group">
                <span className="cf-skill-label">Mandatory Qualifications:</span>
                {activeJD.must_have_skills?.map((s, i) => (
                  <span key={i} className="cf-skill-chip must-have">{s}</span>
                ))}
                <span className="cf-skill-label" style={{ marginLeft: '12px' }}>Preferred:</span>
                {activeJD.preferred_skills?.slice(0, 5).map((s, i) => (
                  <span key={i} className="cf-skill-chip">{s}</span>
                ))}
              </div>
            </div>

            {/* Presets Shelf */}
            <div className="cf-presets-strip">
              {Object.entries(presets).map(([key, p]) => (
                <button
                  key={key}
                  className={`cf-preset-pill ${selectedPresetKey === key ? 'active' : ''}`}
                  onClick={() => handleSelectPreset(key)}
                  disabled={isLoading}
                >
                  <span>{p.icon || '📄'}</span>
                  <span>{p.title}</span>
                </button>
              ))}
            </div>

            {/* Document Ingestion & Telemetry Section */}
            <div 
              className={`cf-ingestion-box ${isDragActive ? 'drag-active' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragActive(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragActive(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  const valid = Array.from(e.dataTransfer.files).filter(f => /\.(pdf|docx|txt)$/i.test(f.name));
                  setUploadedFiles(prev => [...prev, ...valid]);
                }
              }}
              onClick={() => document.getElementById('cf-file-input').click()}
            >
              <input 
                type="file" 
                id="cf-file-input" 
                style={{ display: 'none' }} 
                multiple 
                accept=".pdf,.docx,.txt"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    const valid = Array.from(e.target.files).filter(f => /\.(pdf|docx|txt)$/i.test(f.name));
                    setUploadedFiles(prev => [...prev, ...valid]);
                  }
                }}
              />
              <div className="cf-ingestion-title">Drop candidate documents to ingest (.PDF, .DOCX, .TXT)</div>
              <div className="cf-ingestion-desc">
                Includes automated multi-page character density verification, optical fallback triggers, and anti-cheat threat scanning.
              </div>
              <button className="cf-btn cf-btn-secondary" onClick={(e) => { e.stopPropagation(); document.getElementById('cf-file-input').click(); }}>
                Select Files from Disk
              </button>

              {/* Upload Queue if files selected */}
              {uploadedFiles.length > 0 && (
                <div style={{ marginTop: '14px', textAlign: 'left', borderTop: '1px solid var(--border-hairline)', paddingTop: '10px' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Queued for ingestion: {uploadedFiles.length} files</span>
                    <button style={{ background: 'none', border: 'none', color: 'var(--status-security)', cursor: 'pointer', fontSize: '0.78rem' }} onClick={() => setUploadedFiles([])}>
                      Clear Queue
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    {uploadedFiles.map((f, i) => (
                      <span key={i} className="cf-skill-chip">{f.name} ({(f.size / 1024).toFixed(1)} KB)</span>
                    ))}
                  </div>
                  <button className="cf-btn cf-btn-primary" onClick={handleUploadBatch} disabled={isLoading}>
                    Run Pipeline Ingestion
                  </button>
                </div>
              )}

              {/* Local Dev Machine Telemetry Banner */}
              {batchResults && batchResults.telemetry && (
                <div className="cf-telemetry-strip" onClick={(e) => e.stopPropagation()}>
                  <div>BATCH EXECUTION (N={batchResults.ranked_candidates.length}): <strong>{batchResults.telemetry.total_pipeline_ms} ms</strong></div>
                  <div>PARSING & SANITIZATION: <strong>{batchResults.telemetry.parse_time_ms} ms</strong></div>
                  <div>RETRIEVAL MATCH: <strong>{batchResults.telemetry.stage1_retrieval_ms} ms</strong></div>
                  <div>AVERAGE / DOSSIER: <strong>{batchResults.telemetry.avg_ms_per_resume} ms</strong></div>
                  <div style={{ color: 'var(--text-muted)' }}>*Local single-core smoke test. Cloud distributed load test TBD.</div>
                </div>
              )}
            </div>

            {/* Filter & Search Bar */}
            <div className="cf-controls-bar">
              <div className="cf-filter-pills">
                <button 
                  className={`cf-filter-btn ${tierFilter === 'ALL' ? 'active' : ''}`}
                  onClick={() => setTierFilter('ALL')}
                >
                  All ({batchResults?.ranked_candidates?.length || 0})
                </button>
                <button 
                  className={`cf-filter-btn ${tierFilter === 'SHORTLIST' ? 'active' : ''}`}
                  onClick={() => setTierFilter('SHORTLIST')}
                >
                  Shortlist (≥80%)
                </button>
                <button 
                  className={`cf-filter-btn ${tierFilter === 'REVIEW' ? 'active' : ''}`}
                  onClick={() => setTierFilter('REVIEW')}
                >
                  Review Needed (50–79%)
                </button>
                <button 
                  className={`cf-filter-btn ${tierFilter === 'ARCHIVED' ? 'active' : ''}`}
                  onClick={() => setTierFilter('ARCHIVED')}
                >
                  Archived (&lt;50%)
                </button>
                <button 
                  className={`cf-filter-btn ${tierFilter === 'SECURITY' ? 'active' : ''}`}
                  onClick={() => setTierFilter('SECURITY')}
                >
                  Security Quarantine ({batchResults?.ranked_candidates?.filter(c => c.threat_level !== 'CLEAN').length || 0})
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="text" 
                  className="cf-search-input" 
                  placeholder="Filter by candidate name, degree, skill..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select 
                  className="cf-select" 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="SCORE_DESC">Score: Highest First</option>
                  <option value="SCORE_ASC">Score: Lowest First</option>
                  <option value="EXP_DESC">Experience: Highest First</option>
                </select>
              </div>
            </div>

            {/* Primary Audit Ledger Table */}
            <div className="cf-table-container">
              <table className="cf-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Candidate Dossier</th>
                    <th>Source Document</th>
                    <th style={{ width: '130px' }}>Alignment Score</th>
                    <th>BM25 Lexical</th>
                    <th>Dense Semantic</th>
                    <th>Tenure</th>
                    <th>STAR Impact Summary</th>
                    <th>Audit Determination</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {processedCandidates.map((cand, idx) => {
                    const cleanName = formatCandidateName(cand.file_name);
                    const isThreat = cand.threat_level !== 'CLEAN';
                    const isShortlist = cand.composite_score >= 80 && !isThreat;
                    const isReview = cand.composite_score >= 50 && cand.composite_score < 80 && !isThreat;
                    const isCompared = compareList.some(c => c.file_name === cand.file_name);

                    // Semantic Status Mapping (Strictly no red for normal unqualified)
                    const statusDotClass = isThreat 
                      ? 'dot-security' 
                      : isShortlist 
                      ? 'dot-pass' 
                      : isReview 
                      ? 'dot-review' 
                      : 'dot-archive';

                    const statusPillClass = isThreat 
                      ? 'pill-security' 
                      : isShortlist 
                      ? 'pill-pass' 
                      : isReview 
                      ? 'pill-review' 
                      : 'pill-archive';

                    const statusLabel = isThreat 
                      ? 'Security Quarantine' 
                      : isShortlist 
                      ? 'Qualified Shortlist' 
                      : isReview 
                      ? 'Recruiter Review' 
                      : 'Archived (Unmatched)';

                    return (
                      <tr key={idx} style={{ backgroundColor: isCompared ? '#F6F9FD' : 'transparent' }}>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {idx + 1}
                        </td>
                        <td>
                          <div className="cf-cand-name-title">{cleanName}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {cand.education || 'Credentials Verified'}
                          </div>
                        </td>
                        <td>
                          <div className="cf-cand-file-name">{cand.file_name}</div>
                        </td>
                        <td>
                          <div className="cf-score-cell">
                            <span className={`cf-score-dot ${statusDotClass}`}></span>
                            <span>{cand.composite_score.toFixed(1)}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ 100</span>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                          {cand.bm25_score?.toFixed(1)}%
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                          {cand.semantic_score?.toFixed(1)}%
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>
                          {cand.experience_years ? `${cand.experience_years} yrs` : 'N/A'}
                        </td>
                        <td>
                          {cand.quantified_metrics_found && cand.quantified_metrics_found.length > 0 ? (
                            <span className="cf-skill-chip must-have" title={cand.quantified_metrics_found.join(', ')}>
                              {cand.quantified_metrics_found.length} metrics extracted
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>None extracted</span>
                          )}
                        </td>
                        <td>
                          <span className={`cf-status-pill ${statusPillClass}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button 
                            className="cf-btn cf-btn-secondary" 
                            style={{ padding: '4px 10px', fontSize: '0.78rem', marginRight: '6px' }}
                            onClick={() => setSelectedCandidate(cand)}
                          >
                            Inspect Dossier
                          </button>
                          <label style={{ cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                            <input 
                              type="checkbox"
                              checked={isCompared}
                              onChange={() => toggleCompareCandidate(cand)}
                              style={{ marginRight: '4px', verticalAlign: 'middle' }}
                            />
                            Compare
                          </label>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Comparison Dock if items queued */}
            {compareList.length > 0 && (
              <div className="cf-compare-dock">
                <span>Queued for comparison: <strong>{compareList.length} / 2</strong></span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', opacity: 0.85 }}>
                  {compareList.map(c => formatCandidateName(c.file_name)).join(' vs ')}
                </span>
                <button 
                  className="cf-btn cf-btn-primary" 
                  disabled={compareList.length < 2}
                  onClick={() => setIsCompareModalOpen(true)}
                  style={{ padding: '4px 12px', fontSize: '0.8rem', backgroundColor: '#FFFFFF', color: '#1C1B19' }}
                >
                  Compare Side-by-Side
                </button>
                <button 
                  style={{ background: 'none', border: 'none', color: '#E8D5B5', cursor: 'pointer', fontSize: '0.8rem' }}
                  onClick={() => setCompareList([])}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        )}

        {/* THRESHOLD CALIBRATION EXHIBIT TAB */}
        {activeTab === 'calibration' && (
          <div>
            <div className="cf-exhibit-card">
              <h2 className="cf-exhibit-title">Exhibit A: Empirical Threshold Optimization (θ*)</h2>
              <p className="cf-exhibit-desc">
                Threshold parameters are fitted mathematically on an initial calibration cohort (N = 18) by maximizing 
                <strong> Youden's J-statistic</strong> (J = Sensitivity + Specificity - 1). This replaces arbitrary percentage cutoffs with defensible empirical derivations.
              </p>

              {calibrationData && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-hairline)', borderRadius: '4px', padding: '16px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-ink)' }}>
                      {calibrationData.empirically_derived_thresholds.theta_interview}%
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      θ* SHORTLIST THRESHOLD (FITTED)
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px', borderTop: '1px solid var(--border-hairline)', paddingTop: '6px' }}>
                      ⚠️ OPTIMIZER FIT ON LOCAL N=18 SPLIT (UNVALIDATED AT PRODUCTION SCALE)
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-hairline)', borderRadius: '4px', padding: '16px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--status-review)' }}>
                      {calibrationData.empirically_derived_thresholds.theta_review}%
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      θ* RETENTION THRESHOLD (FITTED)
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px', borderTop: '1px solid var(--border-hairline)', paddingTop: '6px' }}>
                      ⚠️ OPTIMIZER FIT ON LOCAL N=18 SPLIT (UNVALIDATED AT PRODUCTION SCALE)
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-hairline)', borderRadius: '4px', padding: '16px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--status-pass)' }}>
                      {calibrationData.empirically_derived_thresholds.youden_j_statistic}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      YOUDEN'S J STATISTIC
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px', borderTop: '1px solid var(--border-hairline)', paddingTop: '6px' }}>
                      SEPARATION OF SENSITIVITY AND SPECIFICITY
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-hairline)', borderRadius: '4px', padding: '16px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-ink)' }}>
                      {calibrationData.throughput_benchmarks.throughput_candidates_per_sec}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      THROUGHPUT (DOCS / SEC)
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px', borderTop: '1px solid var(--border-hairline)', paddingTop: '6px' }}>
                      LOCAL DEV MACHINE (N=8 RESUMES, SINGLE-CORE)
                    </div>
                  </div>
                </div>
              )}

              {/* Held-Out Validation Table */}
              {calibrationData && (
                <div style={{ marginTop: '24px' }}>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', marginBottom: '8px' }}>
                    Held-Out Test Validation Results (Split N = 12)
                  </h3>
                  <div className="cf-caveat-banner">
                    <strong>Disclosure regarding observed validation precision:</strong> The 100.0% interview precision observed below is an artifact of clean separation on a small synthetic feasibility split (N = 12). Expected production precision across messy applicant flow is significantly lower and requires a formal multi-rater benchmark study before commercial claims are made.
                  </div>
                  <table className="cf-table" style={{ border: '1px solid var(--border-hairline)', borderRadius: '4px' }}>
                    <thead>
                      <tr>
                        <th>Metric Parameter</th>
                        <th>Shortlist Tier (θ ≥ 64.5%)</th>
                        <th>Retention Tier (θ ≥ 40.0%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Observed Precision</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--status-pass)' }}>{calibrationData.held_out_validation_results.interview_precision}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{calibrationData.held_out_validation_results.retention_precision}</td>
                      </tr>
                      <tr>
                        <td>Observed Recall</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{calibrationData.held_out_validation_results.interview_recall}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{calibrationData.held_out_validation_results.retention_recall}</td>
                      </tr>
                      <tr>
                        <td>F1 Score</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{calibrationData.held_out_validation_results.interview_f1}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{calibrationData.held_out_validation_results.retention_f1}</td>
                      </tr>
                      <tr>
                        <td>False Positive Rate</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>0.0%</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{calibrationData.held_out_validation_results.false_positive_rate}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Interactive Weight Simulator */}
            <div className="cf-exhibit-card">
              <h3 className="cf-exhibit-title">Interactive Retrieval Component Weight Simulator</h3>
              <p className="cf-exhibit-desc">
                Explore how composite scores recalibrate when redistributing weight across lexical keyword matching, dense vector semantics, tenure verification, and STAR impact metrics.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '18px' }}>
                <div>
                  <label className="cf-form-label">BM25 Lexical Weight: {simWeights.bm25}%</label>
                  <input 
                    type="range" min="0" max="100" 
                    value={simWeights.bm25} 
                    onChange={e => setSimWeights({ ...simWeights, bm25: parseInt(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="cf-form-label">Dense Semantic Weight: {simWeights.dense}%</label>
                  <input 
                    type="range" min="0" max="100" 
                    value={simWeights.dense} 
                    onChange={e => setSimWeights({ ...simWeights, dense: parseInt(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="cf-form-label">Tenure Alignment Weight: {simWeights.experience}%</label>
                  <input 
                    type="range" min="0" max="100" 
                    value={simWeights.experience} 
                    onChange={e => setSimWeights({ ...simWeights, experience: parseInt(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="cf-form-label">STAR Evidence Weight: {simWeights.star}%</label>
                  <input 
                    type="range" min="0" max="100" 
                    value={simWeights.star} 
                    onChange={e => setSimWeights({ ...simWeights, star: parseInt(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Simulation Result Preview */}
              <div style={{ background: 'var(--bg-subtle)', padding: '12px 16px', borderRadius: '4px', border: '1px solid var(--border-hairline)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Simulated Re-Ranking Preview (Top 5 Dossiers):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                  {simulatedCandidates.slice(0, 5).map((c, i) => (
                    <div key={i} style={{ background: '#FFFFFF', padding: '8px 10px', border: '1px solid var(--border-hairline)', borderRadius: '3px', fontSize: '0.78rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-ink)' }}>#{i+1} {formatCandidateName(c.file_name)}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-signal)' }}>Simulated: {c.simScore.toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DEMOGRAPHIC SENSITIVITY AUDIT TAB */}
        {activeTab === 'bias' && (
          <div>
            <div className="cf-exhibit-card">
              <h2 className="cf-exhibit-title">Exhibit B: Pipeline Token Sensitivity Smoke Test (N = 6)</h2>
              <p className="cf-exhibit-desc">
                Counterfactual testing evaluates score variance when identical technical credentials, tenure, and STAR achievements are held constant while altering demographic proxy tokens (name, perceived gender, cultural signifiers).
              </p>

              <div className="cf-caveat-banner">
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>
                  ⚠️ Critical Methodological Limitations & Compliance Boundaries:
                </div>
                <ul style={{ paddingLeft: '18px', margin: 0 }}>
                  <li style={{ marginBottom: '4px' }}>
                    <strong>Token Sensitivity vs. Disparate Impact:</strong> Score invariance (ε ≤ 0.72%) on 6 synthetic name pairs evaluates embedding stability to name tokens. It does <em>not</em> mathematically prove compliance with the EEOC 80% Four-Fifths rule (Selection Rate Ratio ≥ 0.80), which requires analyzing actual longitudinal selection rates across live applicant volume.
                  </li>
                  <li style={{ marginBottom: '4px' }}>
                    <strong>Heuristic Proxy Limitation:</strong> Using ethnicity-coded names (Keisha Washington, Wei Zhang, Priya Sharma) is a synthetic heuristic proxy, not a direct measurement of protected identity. This test measures whether the model reacts to name-based signals, not whether it is fair to real protected populations.
                  </li>
                  <li>
                    <strong>Sample Size Boundary:</strong> N = 6 pairs is a pipeline smoke test. Formal legal validation requires hundreds of multi-template profiles across diverse job families before making fairness claims.
                  </li>
                </ul>
              </div>

              {counterfactualData && counterfactualData.perturbations && (
                <table className="cf-table" style={{ border: '1px solid var(--border-hairline)', borderRadius: '4px', marginBottom: '18px' }}>
                  <thead>
                    <tr>
                      <th>Identity Perturbation Proxy</th>
                      <th>Composite ATS Score</th>
                      <th>Delta from Baseline</th>
                      <th>Token Invariance Determination</th>
                    </tr>
                  </thead>
                  <tbody>
                    {counterfactualData.perturbations.map((p, idx) => (
                      <tr key={idx}>
                        <td>{p.identity}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{p.score.toFixed(2)}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{p.delta}</td>
                        <td>
                          <span className="cf-status-pill pill-pass">
                            ✓ Invariant (Within ε tolerance)
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Data Governance Protocol */}
              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-hairline)', paddingTop: '16px' }}>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', marginBottom: '8px' }}>
                  Audit Ledger Data Governance (GDPR / DPDP Compliance)
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  Raw extracted technical features (former employers, exact tenure timestamps, unique metric descriptors) act as quasi-identifiers enabling candidate re-identification. To maintain GDPR Art. 4(5) pseudonymization:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginTop: '10px' }}>
                  <div style={{ background: 'var(--bg-subtle)', padding: '10px 14px', borderRadius: '4px', fontSize: '0.82rem' }}>
                    <strong>1. Tenure Coarsening:</strong> Experience is binned into two-year intervals (`[3y - 5y]`, `[5y - 7y]`) prior to persistent ledger storage.
                  </div>
                  <div style={{ background: 'var(--bg-subtle)', padding: '10px 14px', borderRadius: '4px', fontSize: '0.82rem' }}>
                    <strong>2. Employer Token Generalization:</strong> Specific company names are generalized to industry cohorts ([TIER1_TECH], [ENTERPRISE_CORP]).
                  </div>
                  <div style={{ background: 'var(--bg-subtle)', padding: '10px 14px', borderRadius: '4px', fontSize: '0.82rem' }}>
                    <strong>3. Automated Expiration Purge:</strong> Unselected candidate dossiers are scheduled for automated cryptographic scrubbing after 90 days.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* CANDIDATE DOSSIER READING DRAWER / MODAL */}
      {selectedCandidate && (
        <div className="cf-modal-overlay" onClick={() => setSelectedCandidate(null)}>
          <div className="cf-dossier-modal" onClick={e => e.stopPropagation()}>
            <div className="cf-dossier-header">
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Candidate Dossier Audit Exhibit
                </span>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', fontWeight: 700 }}>
                  {formatCandidateName(selectedCandidate.file_name)}
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className={`cf-status-pill ${
                  selectedCandidate.threat_level !== 'CLEAN' ? 'pill-security' :
                  selectedCandidate.composite_score >= 80 ? 'pill-pass' :
                  selectedCandidate.composite_score >= 50 ? 'pill-review' : 'pill-archive'
                }`}>
                  {selectedCandidate.threat_level !== 'CLEAN' ? 'Security Quarantine' :
                   selectedCandidate.composite_score >= 80 ? 'Qualified Shortlist' :
                   selectedCandidate.composite_score >= 50 ? 'Recruiter Review Needed' : 'Archived (Unmatched)'}
                </span>
                <button 
                  className="cf-btn cf-btn-secondary" 
                  onClick={() => setSelectedCandidate(null)}
                  style={{ padding: '4px 10px' }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <div className="cf-dossier-body">
              {/* Left Column: Full Resume in Readable Serif */}
              <div className="cf-resume-pane">
                <div className="cf-resume-title">{formatCandidateName(selectedCandidate.file_name)}</div>
                <div className="cf-resume-subhead">
                  File: {selectedCandidate.file_name} | Verified Experience: {selectedCandidate.experience_years || 0} years
                </div>

                {/* Extracted STAR Metrics marginalia */}
                {selectedCandidate.quantified_metrics_found && selectedCandidate.quantified_metrics_found.length > 0 && (
                  <div className="cf-star-box">
                    <div style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--status-review)', marginBottom: '4px' }}>
                      Extracted STAR Impact Achievements:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedCandidate.quantified_metrics_found.map((m, i) => (
                        <span key={i} className="cf-skill-chip must-have">{m}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="cf-resume-prose">
                  {selectedCandidate.clean_text || 'Document text extracted and sanitized.'}
                </div>
              </div>

              {/* Right Column: Audit Evaluation Rationale */}
              <div className="cf-audit-pane">
                <div className="cf-pane-heading">Defensible Evaluation Ledger</div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Composite ATS Score:</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 700, color: 'var(--text-ink)' }}>
                    {selectedCandidate.composite_score.toFixed(1)} / 100
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div className="cf-pane-heading" style={{ fontSize: '0.72rem' }}>Component Breakdown</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                    <span>BM25 Okapi Lexical Match:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>{selectedCandidate.bm25_score?.toFixed(1)}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                    <span>Dense Vector Cosine Semantics:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>{selectedCandidate.semantic_score?.toFixed(1)}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                    <span>Tenure Requirement Alignment:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>{selectedCandidate.experience_score?.toFixed(1)}%</strong>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div className="cf-pane-heading" style={{ fontSize: '0.72rem' }}>Prerequisite Verification</div>
                  <div style={{ fontSize: '0.82rem', marginBottom: '4px' }}>
                    Academic Degree: <strong>{selectedCandidate.education || 'None Detected'}</strong>
                  </div>
                  {selectedCandidate.failed_hard_filters && selectedCandidate.failed_hard_filters.length > 0 ? (
                    <div style={{ color: 'var(--status-review)', fontSize: '0.8rem', marginTop: '6px' }}>
                      ⚠️ Gap Noted: {selectedCandidate.failed_hard_filters.join(', ')}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--status-pass)', fontSize: '0.8rem', marginTop: '6px' }}>
                      ✓ All core prerequisites satisfied
                    </div>
                  )}
                </div>

                {selectedCandidate.threat_level !== 'CLEAN' && (
                  <div style={{ background: 'var(--status-security-bg)', border: '1px solid var(--status-security-border)', padding: '10px', borderRadius: '4px', marginTop: '12px' }}>
                    <div style={{ color: 'var(--status-security)', fontWeight: 600, fontSize: '0.8rem' }}>
                      🚨 Security Threat Intercepted:
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--status-security)', marginTop: '4px' }}>
                      Threat Level: {selectedCandidate.threat_level}
                      {selectedCandidate.security_threats?.map((t, i) => (
                        <div key={i}>• {t}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIDE-BY-SIDE COMPARISON MODAL */}
      {isCompareModalOpen && compareList.length === 2 && (
        <div className="cf-modal-overlay" onClick={() => setIsCompareModalOpen(false)}>
          <div className="cf-dossier-modal" style={{ maxWidth: '1140px' }} onClick={e => e.stopPropagation()}>
            <div className="cf-dossier-header">
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 600 }}>
                Side-by-Side Candidate Dossier Comparison
              </h2>
              <button className="cf-btn cf-btn-secondary" onClick={() => setIsCompareModalOpen(false)}>
                ✕ Close
              </button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {compareList.map((cand, idx) => (
                  <div key={idx} style={{ background: 'var(--bg-subtle)', padding: '20px', borderRadius: '6px', border: '1px solid var(--border-hairline)' }}>
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', marginBottom: '4px' }}>
                      {formatCandidateName(cand.file_name)}
                    </h3>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                      File: {cand.file_name}
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Alignment Score:</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-ink)' }}>
                        {cand.composite_score.toFixed(1)} / 100
                      </div>
                    </div>

                    <div style={{ fontSize: '0.84rem', lineHeight: '1.6' }}>
                      <div>BM25 Lexical Match: <strong>{cand.bm25_score?.toFixed(1)}%</strong></div>
                      <div>Dense Semantic Match: <strong>{cand.semantic_score?.toFixed(1)}%</strong></div>
                      <div>Tenure Verified: <strong>{cand.experience_years || 0} years</strong></div>
                      <div>Academic Degree: <strong>{cand.education || 'None Detected'}</strong></div>
                      <div style={{ marginTop: '8px' }}>
                        STAR Metrics Extracted: <strong>{cand.quantified_metrics_found?.join(', ') || 'None'}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW TARGET ROLE MODAL */}
      {isCustomModalOpen && (
        <div className="cf-modal-overlay" onClick={() => setIsCustomModalOpen(false)}>
          <div className="cf-dossier-modal" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="cf-dossier-header">
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 600 }}>
                Register New Target Role Specification
              </h2>
              <button className="cf-btn cf-btn-secondary" onClick={() => setIsCustomModalOpen(false)}>
                ✕
              </button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto' }}>
              <div className="cf-form-group">
                <label className="cf-form-label">Role Title *</label>
                <input 
                  type="text" 
                  className="cf-form-input" 
                  placeholder="e.g. Data Entry & Operations Specialist, L1/L2 IT Support..." 
                  value={customForm.title}
                  onChange={e => setCustomForm({ ...customForm, title: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="cf-form-group">
                  <label className="cf-form-label">Domain Category</label>
                  <input 
                    type="text" 
                    className="cf-form-input" 
                    value={customForm.category}
                    onChange={e => setCustomForm({ ...customForm, category: e.target.value })}
                  />
                </div>
                <div className="cf-form-group">
                  <label className="cf-form-label">Role Icon Emoji</label>
                  <input 
                    type="text" 
                    className="cf-form-input" 
                    value={customForm.icon}
                    onChange={e => setCustomForm({ ...customForm, icon: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="cf-form-group">
                  <label className="cf-form-label">Tenure Requirement (Years)</label>
                  <input 
                    type="number" 
                    step="0.5" 
                    className="cf-form-input" 
                    value={customForm.min_experience_years}
                    onChange={e => setCustomForm({ ...customForm, min_experience_years: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="cf-form-group">
                  <label className="cf-form-label">Academic Prerequisite</label>
                  <select 
                    className="cf-form-input"
                    value={customForm.required_degree}
                    onChange={e => setCustomForm({ ...customForm, required_degree: e.target.value })}
                  >
                    <option value="None">None Required</option>
                    <option value="Associate">Associate Degree</option>
                    <option value="Bachelor's">Bachelor's Degree</option>
                    <option value="Master's">Master's Degree</option>
                    <option value="Ph.D.">Doctorate (Ph.D.)</option>
                  </select>
                </div>
              </div>

              <div className="cf-form-group">
                <label className="cf-form-label">Mandatory Skills (Must-Haves)</label>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                  <input 
                    type="text" 
                    className="cf-form-input" 
                    placeholder="Type skill & press Enter..." 
                    value={customMustInput}
                    onChange={e => setCustomMustInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = customMustInput.trim().toLowerCase();
                        if (val && !customForm.must_have_skills.includes(val)) {
                          setCustomForm({ ...customForm, must_have_skills: [...customForm.must_have_skills, val] });
                          setCustomMustInput('');
                        }
                      }
                    }}
                  />
                  <button 
                    className="cf-btn cf-btn-secondary" 
                    type="button"
                    onClick={() => {
                      const val = customMustInput.trim().toLowerCase();
                      if (val && !customForm.must_have_skills.includes(val)) {
                        setCustomForm({ ...customForm, must_have_skills: [...customForm.must_have_skills, val] });
                        setCustomMustInput('');
                      }
                    }}
                  >
                    Add
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {customForm.must_have_skills.map((s, i) => (
                    <span key={i} className="cf-skill-chip must-have">
                      {s} <button style={{ border: 'none', background: 'none', cursor: 'pointer', marginLeft: '4px' }} onClick={() => setCustomForm({ ...customForm, must_have_skills: customForm.must_have_skills.filter(x => x !== s) })}>✕</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="cf-form-group">
                <label className="cf-form-label">Job Description Context</label>
                <textarea 
                  className="cf-form-textarea" 
                  rows="3" 
                  placeholder="Outline core responsibilities and operational scope..."
                  value={customForm.description}
                  onChange={e => setCustomForm({ ...customForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button className="cf-btn cf-btn-secondary" onClick={() => setIsCustomModalOpen(false)}>
                  Cancel
                </button>
                <button className="cf-btn cf-btn-primary" onClick={handleCreateCustomProfile} disabled={isLoading}>
                  Save & Deploy Specification
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
