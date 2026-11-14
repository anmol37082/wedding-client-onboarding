'use client';
import { useEffect, useRef, useState } from 'react';

const W = 900, H = 300;
// Pointer events cover touch, mouse and stylus with one code path.
export default function SignaturePad({ value, onChange, error }) {
  const canvas = useRef(null); const drawing = useRef(false); const last = useRef(null);
  const [hasInk, setHasInk] = useState(false);

  const reset = () => {
    const ctx = canvas.current.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111';
  };
  useEffect(reset, []);
  const pos = (e) => {
    const r = canvas.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  };
  function down(e) {
    if (value) return;
    e.preventDefault(); canvas.current.setPointerCapture(e.pointerId);
    drawing.current = true; last.current = pos(e);
    const ctx = canvas.current.getContext('2d'); ctx.beginPath(); ctx.arc(last.current.x, last.current.y, 1.8, 0, 7); ctx.fillStyle = '#111'; ctx.fill();
    setHasInk(true);
  }
  function move(e) {
    if (!drawing.current) return; e.preventDefault();
    const p = pos(e); const ctx = canvas.current.getContext('2d');
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last.current = p;
  }
  const up = () => { drawing.current = false; };
  const clear = () => { reset(); setHasInk(false); onChange(null); };

  return (
    <div>
      <div className="sig">
        <canvas ref={canvas} width={W} height={H} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label="Signature drawing area" />
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <button type="button" className="btn btn-sm" onClick={clear} disabled={!hasInk}>Clear</button>
        {!value && <button type="button" className="btn btn-sm btn-primary" disabled={!hasInk} onClick={() => onChange(canvas.current.toDataURL('image/png'))}>Save signature</button>}
        {value && <span className="badge b-ok">✓ Signature saved</span>}
      </div>
      {!hasInk && !value && <span className="hint">Sign with your finger, stylus or mouse.</span>}
      {error && <span className="err" role="alert">{error}</span>}
    </div>
  );
}
