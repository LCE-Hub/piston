import { useState, useEffect } from 'react';
import { fetchRegistry, getRawFileUrl } from './api/registry';
import type { RegistryResponse, MetaJson } from './api/types';
import { Key, X, Download, Upload, ExternalLink } from 'lucide-react';
import UploadModal from './UploadModal';
const GITHUB_CLIENT_ID = 'Ov23lioBHF1VmiCOoYui';
function App() {
  const [registry, setRegistry] = useState<RegistryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pat, setPat] = useState<string>('');
  const [showLogin, setShowLogin] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MetaJson | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  useEffect(() => {
    const savedPat = localStorage.getItem('piston_pat');
    if (savedPat) setPat(savedPat);

    fetchRegistry()
      .then(setRegistry)
      .catch(e => setError(e.message));
  }, []);

  const resolvePath = (path: string) => {
    if (path === '') return 'Game Root';
    let p = path;
    p = p.replace(/{MediaDir}/g, 'Windows64Media');
    p = p.replace(/{GameHDD}/g, 'Windows64/GameHDD');
    p = p.replace(/{DLCDir}/g, 'Windows64Media/DLC');
    p = p.replace(/{MobDir}/g, 'Common/res/mob');
    return p;
  };

  const [userCode, setUserCode] = useState<string | null>(null);
  const [verificationUri, setVerificationUri] = useState<string | null>(null);
  const [loginStatus, setLoginStatus] = useState<string>('');
  const [pollingInterval, setPollingInterval] = useState<number | null>(null);
  const initiateDeviceFlow = async () => {
    try {
      setLoginStatus('Requesting code...');
      const proxyRoute = import.meta.env.DEV ? '/github-proxy' : 'https://corsproxy.io/?url=https://github.com';
      const res = await fetch(`${proxyRoute}/login/device/code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          scope: 'public_repo'
        })
      });
      const data = await res.json();
      if (data.user_code) {
        setUserCode(data.user_code);
        setVerificationUri(data.verification_uri);
        setLoginStatus('Waiting for authorization...');
        pollForToken(data.device_code, data.interval);
      } else {
        setLoginStatus('Failed: ' + (data.error || 'Unknown error'));
      }
    } catch (e: any) {
      setLoginStatus('Error: ' + e.message);
    }
  };

  const pollForToken = (dCode: string, initialIntervalSecs: number) => {
    let currentInterval = initialIntervalSecs;
    let timeoutId: number;
    const poll = async () => {
      try {
        const proxyRoute = import.meta.env.DEV ? '/github-proxy' : 'https://corsproxy.io/?url=https://github.com';
        const res = await fetch(`${proxyRoute}/login/oauth/access_token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            client_id: GITHUB_CLIENT_ID,
            device_code: dCode,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          })
        });
        const data = await res.json();

        if (data.access_token) {
          setPat(data.access_token);
          localStorage.setItem('piston_pat', data.access_token);
          closeLogin();
          return;
        } else if (data.error === 'authorization_pending') {
          //neo: still waiting for auth ig
        } else if (data.error === 'slow_down') {
          if (data.interval) currentInterval = data.interval;
        } else {
          setLoginStatus('Login failed: ' + data.error);
          return;
        }
      } catch (e) {
        setLoginStatus('Polling error.');
        return;
      }

      timeoutId = window.setTimeout(poll, currentInterval * 1000);
      setPollingInterval(timeoutId);
    };

    timeoutId = window.setTimeout(poll, currentInterval * 1000);
    setPollingInterval(timeoutId);
  };

  const closeLogin = () => {
    setShowLogin(false);
    setUserCode(null);
    setVerificationUri(null);
    setLoginStatus('');
    if (pollingInterval) window.clearTimeout(pollingInterval);
  };

  const handleLogout = () => {
    setPat('');
    localStorage.removeItem('piston_pat');
  };

  return (
    <div className="mc-container">
      <header style={{
        background: '#373737',
        padding: '1rem 2rem',
        margin: '-2rem -2rem 2rem -2rem',
        borderBottom: '6px solid #1d1d1d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src="./piston.png" width={45} height={45} />
          <h1 style={{ margin: 0, textShadow: '2px 2px 0 #1d1d1d', color: '#fff', fontSize: '2.5rem', letterSpacing: '2px' }}>Piston</h1>
          <span style={{ color: '#aaa', fontSize: '1.2rem', marginTop: '0.5rem', marginLeft: '0.5rem' }}>Emerald Workshop</span>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          {pat ? (
            <>
              <button className="mc-button" onClick={() => setShowUpload(true)}>
                <Upload size={18} style={{ verticalAlign: 'middle', marginRight: '5px' }} /> Upload
              </button>
              <button className="mc-button" onClick={handleLogout}>Log out</button>
            </>
          ) : (
            <button className="mc-button" onClick={() => setShowLogin(true)}>
              <Key size={18} style={{ verticalAlign: 'middle', marginRight: '5px' }} /> Login
            </button>
          )}
        </div>
      </header>

      {error && (
        <div style={{ background: '#ff5555', color: 'white', padding: '1rem', border: '4px solid #aa0000', marginBottom: '1rem' }}>
          Error: {error}
        </div>
      )}

      {!selectedItem ? (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto' }}>
            <button
              className="mc-button"
              style={{ backgroundColor: filter === null ? 'var(--mc-btn-active)' : 'var(--mc-btn)' }}
              onClick={() => setFilter(null)}>
              All
            </button>
            {Array.from(new Set(registry?.packages.flatMap(pkg => Array.isArray(pkg.category) ? pkg.category : [pkg.category]) || [])).map(c => (
              <button
                key={c}
                className="mc-button"
                style={{ backgroundColor: filter === c ? 'var(--mc-btn-active)' : 'var(--mc-btn)' }}
                onClick={() => setFilter(c)}>
                {c}
              </button>
            ))}
          </div>
          <div className="mc-grid">
            {registry?.packages.filter(pkg => filter ? (Array.isArray(pkg.category) ? pkg.category.includes(filter) : pkg.category === filter) : true).map((pkg) => (
              <div key={pkg.id} className="mc-card" onClick={() => setSelectedItem(pkg)} style={{ cursor: 'pointer' }}>
                <img src={getRawFileUrl(pkg.id, pkg.thumbnail)} alt={pkg.name} />
                <h3 style={{ margin: '0.5rem 0' }}>{pkg.name}</h3>
                <div style={{ color: '#ddd', fontSize: '0.9rem' }}>by {pkg.author}</div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {(Array.isArray(pkg.category) ? pkg.category : [pkg.category]).map(c => (
                    <span key={c} className="mc-badge">{c}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="mc-detail-view">
          <div className="mc-detail-header">
            <button className="mc-button" onClick={() => setSelectedItem(null)}>← Back to Gallery</button>
          </div>

          <div className="mc-detail-content">
            <div className="mc-detail-left">
              <img src={getRawFileUrl(selectedItem.id, selectedItem.thumbnail)} alt={selectedItem.name} className="mc-detail-img" />

              <div className="mc-badges">
                {(Array.isArray(selectedItem.category) ? selectedItem.category : [selectedItem.category]).map(c => (
                  <span key={c} className="mc-badge">{c}</span>
                ))}
              </div>
            </div>

            <div className="mc-detail-right">
              <h2 className="mc-title">{selectedItem.name} <span className="mc-version">v{selectedItem.version}</span></h2>
              <p className="mc-author">by <strong>{selectedItem.author}</strong></p>

              <div className="mc-description">
                {selectedItem.description}
              </div>

              <h3 style={{ marginTop: '2rem' }}>Downloads & Installation</h3>
              <div className="mc-download-list">
                {Object.entries(selectedItem.zips).map(([zipName, extractPath]) => (
                  <div key={zipName} className="mc-download-item">
                    <div className="mc-download-info">
                      <strong>{zipName}</strong>
                      <div className="mc-download-path">Extract to <code>{resolvePath(extractPath)}</code></div>
                    </div>
                    <a href={getRawFileUrl(selectedItem.id, zipName)} target="_blank" rel="noreferrer" className="mc-button mc-download-btn">
                      <Download size={24} />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showLogin && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div className="mc-container" style={{ width: '500px', margin: 0, position: 'relative', textAlign: 'center' }}>
            <button style={{ position: 'absolute', top: '-20px', right: '-20px', background: 'red', border: '4px solid #800', color: 'white', padding: '0.5rem', cursor: 'pointer' }} onClick={closeLogin}><X size={24} /></button>
            <h2>GitHub Login</h2>
            {!userCode ? (
              <>
                <p style={{ fontSize: '1.1rem', color: '#373737', marginBottom: '2rem' }}>
                  We use GitHub's Device Flow so you don't need to paste tokens or passwords.
                </p>
                <div style={{ color: '#900', fontWeight: 'bold', marginBottom: '1rem' }}>{loginStatus}</div>
                <button className="mc-button" style={{ fontSize: '1.5rem' }} onClick={initiateDeviceFlow}>Login with GitHub</button>
              </>
            ) : (
              <>
                <p style={{ fontSize: '1.2rem', color: '#555', marginBottom: '1rem' }}>
                  Your verification code is:
                </p>
                <div style={{ fontSize: '3rem', fontWeight: 'bold', letterSpacing: '8px', color: '#fff', background: '#373737', padding: '1rem', border: '4px solid #1d1d1d', margin: '0 2rem 2rem 2rem', userSelect: 'all' }}>
                  {userCode}
                </div>
                <p style={{ marginBottom: '1rem' }}>{loginStatus}</p>
                <a href={verificationUri || 'https://github.com/login/device'} target="_blank" rel="noreferrer" className="mc-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                  Open GitHub <ExternalLink size={20} />
                </a>
              </>
            )}

          </div>
        </div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} pat={pat} />}
    </div>
  );
}

export default App;
