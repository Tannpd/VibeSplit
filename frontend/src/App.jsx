import React, { useState, useEffect } from 'react';
import { 
  useVibeSplit, 
  formatGen 
} from './useVibeSplit';
import { 
  Award, 
  Compass, 
  BookOpen, 
  Coins, 
  Sparkles, 
  Plus, 
  Search, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Terminal, 
  ExternalLink, 
  Clock, 
  Music,
  User,
  Sliders,
  Activity
} from 'lucide-react';

export default function App() {
  const {
    address,
    disputes,
    contractBalance,
    loading,
    error,
    txHash,
    txStatus,
    connectWallet,
    fetchDisputesState,
    createDispute,
    joinDispute,
    resolveDispute,
    contractAddress
  } = useVibeSplit();

  // Form inputs
  const [accusedArtist, setAccusedArtist] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [accusedUrl, setAccusedUrl] = useState('');
  const [stakeAmt, setStakeAmt] = useState('1.0');

  // UI state
  const [selectedDisputeId, setSelectedDisputeId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [localError, setLocalError] = useState('');

  // Add system logs
  const addLog = (message, hash = '') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [{ timestamp, message, hash }, ...prev]);
  };

  // Preset reviews loading
  const setPreset = (original, accused, accusedAddr) => {
    setOriginalUrl(original);
    setAccusedUrl(accused);
    setAccusedArtist(accusedAddr || '0x0000000000000000000000000000000000000000');
    addLog(`Loaded preset arbitration target`);
  };

  // Track state changes
  useEffect(() => {
    if (txStatus) addLog(txStatus, txHash);
  }, [txStatus, txHash]);

  useEffect(() => {
    if (error) {
      addLog(`Error: ${error}`);
      setLocalError(error);
    }
  }, [error]);

  useEffect(() => {
    if (disputes.length > 0 && selectedDisputeId === null) {
      setSelectedDisputeId(disputes[0].id);
    }
  }, [disputes, selectedDisputeId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!accusedArtist || !originalUrl || !accusedUrl || !stakeAmt) {
      setLocalError('All fields must be filled to open a dispute.');
      return;
    }

    try {
      addLog(`Initiating copyright dispute against ${accusedArtist}...`);
      await createDispute(accusedArtist, originalUrl, accusedUrl, stakeAmt);
      // Clear form
      setAccusedArtist('');
      setOriginalUrl('');
      setAccusedUrl('');
      addLog('Dispute transaction created successfully!');
    } catch (err) {
      addLog(`Failed: ${err.message}`);
    }
  };

  const handleJoin = async (disputeId, amount) => {
    setLocalError('');
    try {
      const formattedAmount = formatGen(amount);
      addLog(`Staking matching amount of ${formattedAmount} GEN to join dispute #${disputeId}...`);
      await joinDispute(disputeId, formattedAmount);
      addLog(`Successfully joined dispute. Arbitration ready.`);
    } catch (err) {
      addLog(`Failed to join: ${err.message}`);
    }
  };

  const handleResolve = async (disputeId) => {
    setLocalError('');
    try {
      addLog(`Executing AI musicologist consensus on dispute #${disputeId}...`);
      await resolveDispute(disputeId);
      addLog(`Consensus resolution completed!`);
    } catch (err) {
      addLog(`Arbitration resolution failed: ${err.message}`);
    }
  };

  const selectedDispute = disputes.find(d => d.id === selectedDisputeId);

  return (
    <div className="app-container">
      {/* GLOBAL RETRO LOADING OVERLAY */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-card">
            <div className="spinner-container">
              <div className="vinyl-spinner">
                <Music size={40} className="vinyl-icon" />
              </div>
              <div className="pulsing-glow"></div>
            </div>
            <h3 className="loading-title">GenVM Processing...</h3>
            <p className="loading-status">{txStatus || 'Analyzing audio files & syncing network state...'}</p>
            {txHash && (
              <div className="loading-txhash">
                <span>Tx Hash:</span>
                <code>{txHash.substring(0, 12)}...{txHash.substring(txHash.length - 10)}</code>
              </div>
            )}
            <div className="loading-bar">
              <div className="loading-progress"></div>
            </div>
            <span className="loading-tip">Do not close this tab. AI consensus rounds can take 15-30 seconds.</span>
          </div>
        </div>
      )}

      {/* SYNTHWAVE RETRO HEADER */}
      <header className="synth-header">
        <div className="synth-super">GenLayer Forensic Lab</div>
        <h1 className="synth-title">VIBESPLIT</h1>
        <p className="synth-subtitle">
          Decentralized Music Copyright Arbitration & Royalty Escrow. Leveraging on-chain AI and non-deterministic scrapers to resolve plagiarism disputes.
        </p>
      </header>

      {/* SYSTEM STATUS DECK */}
      <div className="dj-deck-status">
        <div className="deck-meters">
          <div className="deck-meter-item">
            <span className="deck-meter-label">Artist Connection</span>
            <span className="deck-meter-value">
              {address ? `${address.substring(0, 10)}...${address.substring(address.length - 8)}` : 'DISCONNECTED'}
            </span>
          </div>
          <div className="deck-meter-item">
            <span className="deck-meter-label">Escrow Pool Address</span>
            <span className="deck-meter-value">
              {contractAddress ? `${contractAddress.substring(0, 10)}...${contractAddress.substring(contractAddress.length - 8)}` : '0x00000...'}
            </span>
          </div>
          <div className="deck-meter-item">
            <span className="deck-meter-label">Active Dispute Pool</span>
            <span className="deck-meter-value" style={{ color: 'var(--color-pink)' }}>
              {formatGen(contractBalance)} GEN
            </span>
          </div>
        </div>
        <div>
          {address ? (
            <button className="neon-blue-btn" onClick={() => fetchDisputesState()}>
              Sync Console
            </button>
          ) : (
            <button className="neon-pink-btn" onClick={connectWallet} disabled={loading} style={{ padding: '0.5rem 1rem' }}>
              Initialize Deck
            </button>
          )}
        </div>
      </div>

      {localError && (
        <div className="toast-error">
          <AlertCircle size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          {localError}
        </div>
      )}

      {/* MAIN RACK WORKSPACE */}
      <div className="studio-racks">
        
        {/* LEFT PANEL: ARBITRATION SUBMISSION DECK */}
        <section className="rack-panel">
          <h2 className="rack-title">
            <Sliders size={20} color="var(--color-pink)" /> SUBMISSION DECK
          </h2>
          
          <form className="studio-form" onSubmit={handleCreate}>
            <div className="studio-group">
              <label className="studio-label">Accused Artist Address</label>
              <input
                className="studio-input"
                type="text"
                placeholder="0x..."
                value={accusedArtist}
                onChange={(e) => setAccusedArtist(e.target.value)}
              />
            </div>

            <div className="studio-group">
              <label className="studio-label">Original Track Analysis URL</label>
              <input
                className="studio-input"
                type="url"
                placeholder="e.g., https://genius.com/Original-artist-lyrics"
                value={originalUrl}
                onChange={(e) => setOriginalUrl(e.target.value)}
              />
            </div>

            <div className="studio-group">
              <label className="studio-label">Disputed Track Analysis URL</label>
              <input
                className="studio-input"
                type="url"
                placeholder="e.g., https://genius.com/Accused-artist-lyrics"
                value={accusedUrl}
                onChange={(e) => setAccusedUrl(e.target.value)}
              />
            </div>

            <div className="studio-group">
              <label className="studio-label">Royalties Stake (GEN)</label>
              <input
                className="studio-input"
                type="number"
                step="0.1"
                min="0.1"
                value={stakeAmt}
                onChange={(e) => setStakeAmt(e.target.value)}
              />
            </div>

            <button type="submit" className="neon-pink-btn" disabled={loading || !address}>
              <Plus size={18} /> Open Copyright Dispute
            </button>
          </form>

          {/* PRESETS STRIP */}
          <div className="presets-grid">
            <span className="studio-label">Test Case Presets</span>
            
            <button 
              className="preset-strip"
              onClick={() => setPreset(
                'https://raw.githubusercontent.com/Tannpd/VibeSplit/master/tests/mock_original_song.txt',
                'https://raw.githubusercontent.com/Tannpd/VibeSplit/master/tests/mock_disputed_song.txt',
                '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
              )}
            >
              <div className="preset-meta">
                <span className="preset-tag">Melodic Infringement (Plagiarism)</span>
                <span className="preset-desc">Expert reports verify identical hooks and chord progression.</span>
              </div>
              <Music size={16} color="var(--color-pink)" />
            </button>

            <button 
              className="preset-strip"
              onClick={() => setPreset(
                'https://raw.githubusercontent.com/Tannpd/VibeSplit/master/tests/mock_inspiration_original.txt',
                'https://raw.githubusercontent.com/Tannpd/VibeSplit/master/tests/mock_inspiration_accused.txt',
                '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
              )}
            >
              <div className="preset-meta">
                <span className="preset-tag">Creative Homage (Inspiration)</span>
                <span className="preset-desc">Songs share dynamic progression styling but unique lyrics and melodies.</span>
              </div>
              <Music size={16} color="var(--color-blue)" />
            </button>

            <button 
              className="preset-strip"
              onClick={() => setPreset(
                'https://raw.githubusercontent.com/Tannpd/VibeSplit/master/tests/mock_unrelated_original.txt',
                'https://raw.githubusercontent.com/Tannpd/VibeSplit/master/tests/mock_unrelated_accused.txt',
                '0x90F79bf6EB2c4f870365E785982E1f101E93b906'
              )}
            >
              <div className="preset-meta">
                <span className="preset-tag">Completely Unrelated (Safe)</span>
                <span className="preset-desc">Acoustic Pop Ballad compared to heavy metal rock track.</span>
              </div>
              <Music size={16} color="var(--color-text-muted)" />
            </button>
          </div>
        </section>

        {/* RIGHT PANEL: MIXER CONSOLE */}
        <section className="rack-panel mixer-console">
          <h2 className="rack-title">
            <Activity size={20} color="var(--color-blue)" /> MIXER CONSOLE
          </h2>

          {!selectedDispute ? (
            <div className="mixer-empty-state">
              <Activity size={40} className="eq-bar" style={{ animation: 'bounce 1s infinite alternate', width: 'auto' }} />
              <p>Select a copyright dispute from the registry to inspect audio analytics and crossfader splits.</p>
            </div>
          ) : (
            <div className="mixer-deck">
              <div className="mixer-grid">
                <div className="mixer-stat">
                  <span className="deck-meter-label">Original Artist A</span>
                  <span className="mixer-stat-val">
                    {selectedDispute.original_artist.substring(0, 12)}...
                  </span>
                </div>
                <div className="mixer-stat">
                  <span className="deck-meter-label">Accused Artist B</span>
                  <span className="mixer-stat-val">
                    {selectedDispute.accused_artist.substring(0, 12)}...
                  </span>
                </div>
              </div>

              {/* STAT DETAILS */}
              <div className="mixer-grid">
                <div className="mixer-stat">
                  <span className="deck-meter-label">Original URL</span>
                  <a href={selectedDispute.original_url} target="_blank" rel="noopener noreferrer" className="mixer-stat-val" style={{ fontSize: '0.85rem', color: 'var(--color-blue)', textDecoration: 'underline' }}>
                    {selectedDispute.original_url.substring(0, 30)}... <ExternalLink size={12} style={{ display: 'inline' }} />
                  </a>
                </div>
                <div className="mixer-stat">
                  <span className="deck-meter-label">Accused URL</span>
                  <a href={selectedDispute.accused_url} target="_blank" rel="noopener noreferrer" className="mixer-stat-val" style={{ fontSize: '0.85rem', color: 'var(--color-pink)', textDecoration: 'underline' }}>
                    {selectedDispute.accused_url.substring(0, 30)}... <ExternalLink size={12} style={{ display: 'inline' }} />
                  </a>
                </div>
              </div>

              {/* GLOWING VISUAL EQUALIZER */}
              <div className="eq-visualizer">
                <div className="eq-bar"></div>
                <div className="eq-bar"></div>
                <div className="eq-bar"></div>
                <div className="eq-bar"></div>
                <div className="eq-bar"></div>
                <div className="eq-bar"></div>
                <div className="eq-bar"></div>
                <div className="eq-bar"></div>
                <div className="eq-bar"></div>
                <div className="eq-bar"></div>
                <div className="eq-bar"></div>
                <div className="eq-bar"></div>
              </div>

              {/* CROSSFADER SLIDER SECTION */}
              <div className="crossfader-container">
                <div className="crossfader-labels">
                  <span className="fader-artist-a">Artist A Split</span>
                  <span className="fader-artist-b">Artist B Split</span>
                </div>
                <input
                  type="range"
                  className="neon-slider"
                  min="0"
                  max="100"
                  value={selectedDispute.status === 'RESOLVED' ? Number(selectedDispute.original_artist_split) : 50}
                  disabled
                />
                <div className="fader-readout">
                  {selectedDispute.status === 'RESOLVED' ? (
                    `${Number(selectedDispute.original_artist_split)}% / ${100 - Number(selectedDispute.original_artist_split)}%`
                  ) : (
                    'PENDING SPLIT'
                  )}
                </div>
              </div>

              {/* FORENSIC TRACK LOGS */}
              <div className="forensic-track-log">
                <p>{selectedDispute.musicological_analysis}</p>
              </div>

              {/* STAMP / ACTION AREA */}
              <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                {selectedDispute.status === 'CREATED' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
                    <span className="verdict-banner-stamp pending">Awaiting Accused Artist Join</span>
                    {address === selectedDispute.accused_artist.toLowerCase() ? (
                      <button 
                        className="neon-pink-btn"
                        onClick={() => handleJoin(selectedDispute.id, selectedDispute.original_stake)}
                        disabled={loading}
                      >
                        Join Dispute (Lock {formatGen(selectedDispute.original_stake)} GEN)
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        Waiting for Accused {selectedDispute.accused_artist.substring(0, 6)}... to match stake.
                      </span>
                    )}
                  </div>
                )}

                {selectedDispute.status === 'PENDING' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
                    <span className="verdict-banner-stamp pending">Arbitration Ready</span>
                    <button 
                      className="neon-blue-btn"
                      style={{ padding: '0.8rem 2rem' }}
                      onClick={() => handleResolve(selectedDispute.id)}
                      disabled={loading || !address}
                    >
                      Run AI Musicologist Consensus
                    </button>
                  </div>
                )}

                {selectedDispute.status === 'RESOLVED' && (
                  <span className={`verdict-banner-stamp ${selectedDispute.is_plagiarism ? 'plagiarism' : 'inspiration'}`}>
                    {selectedDispute.is_plagiarism ? 'Plagiarism - Royalty Slashed' : 'Creative Inspiration - Split Paid'}
                  </span>
                )}

                {selectedDispute.status === 'FAILED' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
                    <span className="verdict-banner-stamp plagiarism" style={{ borderStyle: 'solid' }}>Arbitration Failed</span>
                    <button 
                      className="neon-blue-btn"
                      style={{ padding: '0.8rem 2rem' }}
                      onClick={() => handleResolve(selectedDispute.id)}
                      disabled={loading || !address}
                    >
                      Retry Consensus Audit
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* DISPUTES RECORD / HISTORY TABLE */}
      <section className="registry-section">
        <h2 className="section-label">
          <Clock size={16} /> Copyright Dispute Records
        </h2>
        <div className="table-deck">
          <table className="synth-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Original Artist</th>
                <th>Accused Artist</th>
                <th>Stakes Pool</th>
                <th>Status</th>
                <th>Royalty Split</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {disputes.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    No disputes registered on-chain. Create one using the form.
                  </td>
                </tr>
              ) : (
                disputes.map((dis) => (
                  <tr 
                    key={dis.id} 
                    className={selectedDisputeId === dis.id ? 'active-row' : ''}
                    onClick={() => setSelectedDisputeId(dis.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>#{dis.id}</td>
                    <td>{dis.original_artist.substring(0, 10)}...</td>
                    <td>{dis.accused_artist.substring(0, 10)}...</td>
                    <td>{formatGen(BigInt(dis.original_stake) + BigInt(dis.accused_stake))} GEN</td>
                    <td>
                      <span className={`status-indicator ${dis.status.toLowerCase()}`}>
                        {dis.status}
                      </span>
                    </td>
                    <td>
                      {dis.status === 'RESOLVED' ? `${Number(dis.original_artist_split)}% / ${100 - Number(dis.original_artist_split)}%` : '—'}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button 
                        className="neon-blue-btn" 
                        onClick={() => setSelectedDisputeId(dis.id)}
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* RETRO EXPLAINER PANEL */}
      <section className="explainer-deck">
        <h2 className="explainer-title">Why VibeSplit DIES Without GenLayer</h2>
        <div className="explainer-grid">
          <div className="explainer-column">
            <h3>The Copyright Arbitration Problem</h3>
            <p>
              Independent musicians face massive legal bills when protecting their creations. Centralized streaming algorithms or centralized platforms make binary decisions without transparency. 
              On standard blockchain platforms like Ethereum, smart contracts are completely isolated from the internet and cannot read genius lyrics, review blog articles, or run qualitative AI musicological evaluations.
            </p>
            <p>
              Relying on standard Web2 oracles is insecure because they are controlled by centralized servers, introducing corruption risk.
            </p>
          </div>
          <div className="explainer-column">
            <h3>The GenLayer Intelligent Solution</h3>
            <p>
              VibeSplit leverages GenLayer's <strong>Intelligent Contracts</strong> to run trustless, transparent copyright audits:
            </p>
            <ul>
              <li>
                <strong>Double Web Scraping:</strong> AI nodes scrape both track breakdown pages in real time via <code>gl.nondet.web.render</code>.
              </li>
              <li>
                <strong>AI Musicologist Judge:</strong> Evaluates lyrical structures, musical progression patterns, and melodic overlaps in natural language.
              </li>
              <li>
                <strong>Consensus on a Spectrum:</strong> Instead of strict equality, VibeSplit uses a custom consensus validator allowing splits to deviate up to 10% between validators while enforcing a uniform plagiarism verdict.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* LOGS DRAWER TOGGLE */}
      <button 
        className="logs-console-toggle" 
        onClick={() => setIsLogsOpen(!isLogsOpen)}
        title="View Inspector Logs"
      >
        <Terminal size={22} />
      </button>

      {/* LOGS DRAWER CONSOLE */}
      <div className={`logs-drawer ${isLogsOpen ? 'open' : ''}`}>
        <div className="logs-header">
          <h3 className="logs-title">System & transaction logs</h3>
          <button className="logs-close-btn" onClick={() => setIsLogsOpen(false)}>×</button>
        </div>
        <div className="logs-body">
          {logs.length === 0 ? (
            <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No system logs yet. Submit a transaction or audit a dispute.</div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className="log-entry">
                <span className="log-time">[{log.timestamp}]</span>
                <span className="log-msg">{log.message}</span>
                {log.hash && (
                  <span className="log-sub">
                    Tx Hash: {log.hash}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
