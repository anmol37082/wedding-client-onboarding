'use client';
import { useEffect, useRef, useState } from 'react';

// Live capture only: there is deliberately no file/gallery input.
export default function CameraCapture({ value, onChange, error }) {
  const [mode, setMode] = useState(value ? 'preview' : 'idle'); // idle | live | preview
  const [shot, setShot] = useState(value || null);
  const [msg, setMsg] = useState('');
  const video = useRef(null); const stream = useRef(null);

  const stop = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; };
  useEffect(() => stop, []);
  useEffect(() => { if (mode === 'live' && video.current && stream.current) video.current.srcObject = stream.current; }, [mode]);

  async function open() {
    setMsg('');
    if (!navigator.mediaDevices?.getUserMedia) { setMsg('Camera is not available. Open this page over HTTPS in a supported browser.'); return; }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } }, audio: false });
      setMode('live');
    } catch (e) {
      setMsg(e.name === 'NotAllowedError' ? 'Camera permission was denied. Allow camera access in your browser settings and try again.' : 'We could not start the camera. Check that no other app is using it.');
    }
  }
  function capture() {
    const v = video.current; if (!v?.videoWidth) return;
    const c = document.createElement('canvas'); const w = Math.min(720, v.videoWidth);
    c.width = w; c.height = Math.round(w * (v.videoHeight / v.videoWidth));
    const ctx = c.getContext('2d'); ctx.translate(c.width, 0); ctx.scale(-1, 1); ctx.drawImage(v, 0, 0, c.width, c.height); // un-mirror to match the preview
    setShot(c.toDataURL('image/jpeg', 0.85)); stop(); setMode('preview'); onChange(null);
  }
  const retake = () => { setShot(null); onChange(null); open(); };

  return (
    <div>
      <div className="cam">
        {mode === 'live' && <video ref={video} autoPlay playsInline muted aria-label="Camera preview" />}
        {mode === 'preview' && shot && <img src={shot} alt="Your captured photo" />}
        {mode === 'idle' && <p style={{ padding: 24 }}>Your camera will open here.<br />Face the camera in good light.</p>}
      </div>
      <div className="row" style={{ justifyContent: 'center', marginTop: 14 }}>
        {mode === 'idle' && <button type="button" className="btn btn-primary" onClick={open}>Take live photo</button>}
        {mode === 'live' && <button type="button" className="btn btn-gold" onClick={capture}>Capture</button>}
        {mode === 'preview' && !value && <>
          <button type="button" className="btn" onClick={retake}>Retake</button>
          <button type="button" className="btn btn-primary" onClick={() => onChange(shot)}>Use this photo</button>
        </>}
        {mode === 'preview' && value && <><span className="badge b-ok">✓ Photo confirmed</span><button type="button" className="btn btn-sm" onClick={retake}>Retake</button></>}
      </div>
      {msg && <p className="err center" role="alert">{msg}</p>}
      {error && !msg && <p className="err center" role="alert">{error}</p>}
    </div>
  );
}
