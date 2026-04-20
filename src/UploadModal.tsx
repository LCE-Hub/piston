import React, { useState } from 'react';
import { X, UploadCloud, CheckCircle } from 'lucide-react';
import { GitHubAPI } from './api/github';
import type { UploadFile } from './api/github';
import type { MetaJson } from './api/types';
interface UploadModalProps {
  onClose: () => void;
  pat: string;
}

const CATEGORIES = ["Skin", "Texture", "World", "Mod", "DLC"];
const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve((reader.result as string).split(',')[1]);
  reader.onerror = error => reject(error);
});

export default function UploadModal({ onClose, pat }: UploadModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successLink, setSuccessLink] = useState<string | null>(null);
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [category, setCategory] = useState<string[]>(['Skin']);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [zipFiles, setZipFiles] = useState<{ file: File, extractPath: string }[]>([]);

  const handleZipFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        file,
        extractPath: '{DLCDir}'
      }));
      setZipFiles(prev => [...prev, ...newFiles]);
    }
  };

  const updateZipPath = (index: number, path: string) => {
    const updated = [...zipFiles];
    updated[index].extractPath = path;
    setZipFiles(updated);
  };

  const removeZip = (index: number) => {
    const updated = [...zipFiles];
    updated.splice(index, 1);
    setZipFiles(updated);
  };

  const toggleCategory = (cat: string) => {
    setCategory(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thumbnail) {
      setError("Please provide a thumbnail.");
      return;
    }
    if (category.length === 0) {
      setError("Please select at least one category.");
      return;
    }
    if (zipFiles.length === 0) {
      setError("Please provide at least one .zip file.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const api = new GitHubAPI(pat);
      await api.init();
      const filesToUpload: UploadFile[] = [];
      const zipsMapping: Record<string, string> = {};
      for (const zf of zipFiles) {
        zipsMapping[zf.file.name] = zf.extractPath;
        const b64 = await toBase64(zf.file);
        filesToUpload.push({
          path: `${id}/${zf.file.name}`,
          content: b64,
          isBase64: true
        });
      }

      const thumbB64 = await toBase64(thumbnail);
      filesToUpload.push({
        path: `${id}/${thumbnail.name}`,
        content: thumbB64,
        isBase64: true
      });

      const metaObj: MetaJson = {
        id,
        name,
        author: api.username,
        description,
        extended_description: "", //neo: TODO: implement
        category,
        thumbnail: thumbnail.name,
        zips: zipsMapping,
        version
      };

      filesToUpload.push({
        path: `${id}/meta.json`,
        content: JSON.stringify(metaObj, null, 2),
        isBase64: false
      });

      const prUrl = await api.forkAndPR(
        id,
        filesToUpload,
        `Add "${name}" (${id})`,
        `This PR adds "${name}" to Emerald Workshop. Submitted automatically via [Piston](https://lce-hub.github.io/piston)`
      );

      setSuccessLink(prUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to upload');
    } finally {
      setLoading(false);
    }
  };

  if (successLink) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: '1rem' }}>
        <div className="mc-container" style={{ width: '600px', margin: 0, position: 'relative', textAlign: 'center', background: 'var(--mc-bg)', border: '6px solid var(--mc-border)' }}>
          <button type="button" style={{ position: 'absolute', top: '-24px', right: '-24px', background: '#ff5555', border: '4px solid #aa0000', color: 'white', padding: '0.5rem', cursor: 'pointer', boxShadow: '2px 2px 0 rgba(0,0,0,0.5)' }} onClick={onClose}><X size={24} /></button>

          <CheckCircle size={80} color="#55ff55" style={{ margin: '0 auto 1.5rem', display: 'block', filter: 'drop-shadow(2px 2px 0 #1d1d1d)' }} />
          <h2 style={{ color: '#55ff55', fontSize: '2.5rem', textShadow: '2px 2px 0 #1d1d1d', marginBottom: '1rem', letterSpacing: '1px' }}>Upload Successful!</h2>

          <div style={{ background: '#373737', padding: '1.5rem', border: '4px solid #1d1d1d', margin: '2rem 0', color: '#fff', fontSize: '1.1rem', lineHeight: '1.5', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)' }}>
            Your content has been uploaded and sent to the Emerald Workshop repository. It is now awaiting review from our moderators.
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
            <a href={successLink} target="_blank" rel="noreferrer" className="mc-button" style={{ textDecoration: 'none' }}>View Pull Request</a>
            <button type="button" onClick={onClose} className="mc-button">Continue</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, overflowY: 'auto', padding: '2rem 0' }}>
      <div className="mc-container" style={{ width: '600px', margin: 'auto', position: 'relative' }}>
        <button type="button" style={{ position: 'absolute', top: '-16px', right: '-16px', background: '#ff5555', border: '4px solid #aa0000', color: 'white', padding: '0.5rem', cursor: 'pointer', boxShadow: '2px 2px 0 rgba(0,0,0,0.5)', zIndex: 10 }} onClick={onClose}><X size={24} /></button>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2rem', color: '#fff', textShadow: '2px 2px 0 #1d1d1d' }}>Upload Content</h2>

        {error && (
          <div style={{ background: '#ff5555', color: 'white', padding: '1rem', marginBottom: '1.5rem', border: '4px solid #aa0000', boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.2)', fontSize: '1.1rem', fontWeight: 'bold' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', color: '#373737' }}>ID (kebab-case)</label>
              <input type="text" className="mc-input" required value={id} onChange={e => setId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="e.g. realistic-sky" />
            </div>
            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', color: '#373737' }}>Display Name</label>
              <input type="text" className="mc-input" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Realistic Sky" />
            </div>
          </div>

          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', color: '#373737' }}>Description</label>
            <textarea className="mc-input" required rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="A brief description of your uploaded content..."></textarea>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ gridColumn: '1 / span 2' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', color: '#373737' }}>Categories</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', background: '#373737', padding: '1rem', border: '4px solid #1d1d1d' }}>
                {CATEGORIES.map(cat => (
                  <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#fff', fontSize: '0.9rem', fontWeight: 'bold' }}>
                    <input
                      type="checkbox"
                      checked={category.includes(cat)}
                      onChange={() => toggleCategory(cat)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ gridColumn: '1 / span 2' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', color: '#373737' }}>Version</label>
              <input type="text" className="mc-input" required value={version} onChange={e => setVersion(e.target.value)} style={{ width: '50%' }} />
            </div>
          </div>

          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', color: '#373737' }}>Thumbnail Image (16:9)</label>
            <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
              <div className="mc-button" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
                <UploadCloud size={20} /> Select Image
              </div>
              <input type="file" accept="image/*" required onChange={e => setThumbnail(e.target.files ? e.target.files[0] : null)} style={{ display: 'none' }} />
            </label>
            <span style={{ marginLeft: '1rem', color: '#1d1d1d', fontWeight: 'bold' }}>{thumbnail ? thumbnail.name : 'No image selected'}</span>
          </div>

          <div style={{ background: '#8b8b8b', border: '4px solid #555', padding: '1rem' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '1rem', textTransform: 'uppercase', color: '#1d1d1d' }}>ZIP Files & Extraction Paths</label>
            <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', marginBottom: '1rem' }}>
              <div className="mc-button" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
                <UploadCloud size={20} /> Add ZIPs
              </div>
              <input type="file" accept=".zip" multiple onChange={handleZipFiles} style={{ display: 'none' }} />
            </label>
            {zipFiles.map((zf, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 'bold', color: '#1d1d1d' }}>{zf.file.name}</span>
                <input type="text" className="mc-input" style={{ flex: 2, padding: '0.4rem', fontSize: '0.9rem' }} value={zf.extractPath} onChange={e => updateZipPath(idx, e.target.value)} />
                <button type="button" className="mc-button" style={{ padding: '0.4rem 0.6rem', background: '#ff5555', borderColor: '#aa0000' }} onClick={() => removeZip(idx)}><X size={16} color="#fff" /></button>
              </div>
            ))}
          </div>

          <button type="submit" className="mc-button" style={{ marginTop: '1rem', fontSize: '1.8rem', padding: '1rem', color: loading ? '#aaa' : '#fff' }} disabled={loading}>
            {loading ? 'UPLOADING...' : 'SUBMIT PULL REQUEST'}
          </button>
        </form>
      </div>
    </div>
  );
}
