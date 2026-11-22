const W = 1080, H = 1920;
const T = +(new URLSearchParams(location.search).get('t') || 0);
const ctx = document.getElementById('c').getContext('2d');
const icon = new Image(); icon.src = 'icon.png';

// ---------- 道具 ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));           // a〜b 秒での進み 0..1
const easeOut = k => 1 - Math.pow(1 - k, 3);
const easeInOut = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const easeBack = k => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, k) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], k))).join(',')})`; };
function rand(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function line(x1, y1, x2, y2, c, w) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function stars(alpha) { if (alpha <= 0) return; const r = rand(7); for (let i = 0; i < 60; i++) { const x = r() * W, y = r() * 900, s = 2 + r() * 4, tw = .5 + .5 * Math.sin(T * 3 + i);
  ctx.globalAlpha = alpha * (.4 + .6 * tw); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, s, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; }
function sun(x, y, r, a = 1) { ctx.globalAlpha = a; const g = ctx.createRadialGradient(x, y, r * .2, x, y, r * 1.8); g.addColorStop(0, 'rgba(255,230,140,.9)'); g.addColorStop(1, 'rgba(255,230,140,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.8, 0, 7); ctx.fill(); ctx.fillStyle = '#ffd56b'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
// ---------- 人物 ----------
/* p: { x, y, s, shirt, skin, hair, face('happy'|'sleep'|'meh'|'wow'), armL, armR(肩からの角度・下が0), legL, legR, kneeL, kneeR, bob } */
function person(p) {
  const s = p.s || 1, skin = p.skin || '#f3c7a1', hair = p.hair || '#2B2A28', pants = '#3A3936';
  ctx.save(); ctx.translate(p.x, p.y + (p.bob || 0)); ctx.scale(s, s);
  const leg = (hx, ang, knee) => { const L1 = 95, L2 = 95; const kx = hx + Math.sin(ang) * L1, ky = 120 + Math.cos(ang) * L1;
    const a2 = ang - (knee || 0); const fx = kx + Math.sin(a2) * L2, fy = ky + Math.cos(a2) * L2; line(hx, 120, kx, ky, pants, 34); line(kx, ky, fx, fy, pants, 32);
    ctx.fillStyle = '#F0EDE5'; ctx.beginPath(); ctx.ellipse(fx + 10, fy + 8, 26, 14, 0, 0, 7); ctx.fill(); };
  leg(-20, p.legL || 0, p.kneeL || 0); leg(20, p.legR || 0, p.kneeR || 0);
  const arm = (sx, ang) => { const L = 105; line(sx, 5, sx + Math.sin(ang) * L, 5 + Math.cos(ang) * L, skin, 27); };
  arm(-46, p.armL ?? -0.15);
  ctx.fillStyle = p.shirt; rrect(-56, -32, 112, 172, 50); ctx.fill();
  arm(46, p.armR ?? 0.15);
  // 頭
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0, -98, 68, 0, 7); ctx.fill();
  ctx.fillStyle = hair; ctx.beginPath(); ctx.moveTo(-68, -102); ctx.quadraticCurveTo(-62, -182, 0, -176); ctx.quadraticCurveTo(62, -182, 68, -102); ctx.quadraticCurveTo(40, -144, 0, -138); ctx.quadraticCurveTo(-40, -144, -68, -102); ctx.fill();
  ctx.fillStyle = 'rgba(255,120,120,.35)'; ctx.beginPath(); ctx.arc(-40, -72, 13, 0, 7); ctx.arc(40, -72, 13, 0, 7); ctx.fill();
  ctx.strokeStyle = '#2B2A28'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath();
  const f = p.face || 'happy';
  if (f === 'sleep') { ctx.moveTo(-36, -94); ctx.lineTo(-14, -94); ctx.moveTo(14, -94); ctx.lineTo(36, -94); ctx.moveTo(-10, -62); ctx.quadraticCurveTo(0, -56, 10, -62); }
  else if (f === 'meh') { ctx.moveTo(-32, -98); ctx.lineTo(-16, -98); ctx.moveTo(16, -98); ctx.lineTo(32, -98); ctx.moveTo(-14, -64); ctx.lineTo(14, -64); }
  else if (f === 'wow') { ctx.stroke(); ctx.fillStyle = '#2B2A28'; ctx.beginPath(); ctx.arc(-24, -98, 9, 0, 7); ctx.arc(24, -98, 9, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, -60, 11, 15, 0, 0, 7); ctx.fill(); ctx.beginPath(); }
  else if (f === 'cry') { ctx.moveTo(-38, -90); ctx.quadraticCurveTo(-25, -80, -12, -90); ctx.moveTo(12, -90); ctx.quadraticCurveTo(25, -80, 38, -90); ctx.moveTo(-20, -52); ctx.quadraticCurveTo(0, -72, 20, -52);
    ctx.stroke(); ctx.fillStyle = '#7cc4ff'; [[-26, 1], [26, 1.7]].forEach(([x, o]) => { const d = ((T * 2.2 + o) % 1); ctx.beginPath(); ctx.ellipse(x, -80 + d * 60, 9, 14, 0, 0, 7); ctx.fill(); }); ctx.beginPath(); }
  else if (f === 'shock') { ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-25, -98, 17, 0, 7); ctx.arc(25, -98, 17, 0, 7); ctx.fill(); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(-25, -98, 17, 0, 7); ctx.moveTo(42, -98); ctx.arc(25, -98, 17, 0, 7); ctx.stroke();
    ctx.fillStyle = '#2B2A28'; ctx.beginPath(); ctx.arc(-25, -98, 7, 0, 7); ctx.arc(25, -98, 7, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, -56, 18, 24, 0, 0, 7); ctx.fill(); ctx.lineWidth = 7; ctx.beginPath(); }
  else { ctx.moveTo(-36, -92); ctx.quadraticCurveTo(-25, -108, -14, -92); ctx.moveTo(14, -92); ctx.quadraticCurveTo(25, -108, 36, -92); ctx.moveTo(-26, -68); ctx.quadraticCurveTo(0, -38, 26, -68); }
  ctx.stroke(); ctx.restore();
}
/* 走る姿勢(位相 ph) */
function runPose(ph, extra = {}) { const sw = Math.sin(ph); return Object.assign({ legL: sw * .75, legR: -sw * .75, kneeL: Math.max(0, -sw) * 1.1 + .2, kneeR: Math.max(0, sw) * 1.1 + .2,
  armL: -sw * .9, armR: sw * .9, bob: -Math.abs(Math.cos(ph)) * 16, face: 'happy' }, extra); }
function dog(x, y, ph, s = 1) { ctx.save(); ctx.translate(x, y - Math.abs(Math.cos(ph)) * 10); ctx.scale(s, s); const c = '#c98b5b', d = '#8a5a37';
  const legs = [[-50, 1], [-22, -1], [30, 1], [58, -1]]; legs.forEach(([lx, dir]) => line(lx, 30, lx + Math.sin(ph * 1.0 + (dir > 0 ? 0 : 3.1)) * 28, 95, c, 18));
  ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, 0, 88, 52, 0, 0, 7); ctx.fill();
  line(-80, -10, -125 + Math.sin(T * 18) * 14, -62, c, 18);                 // しっぽ
  ctx.beginPath(); ctx.arc(92, -42, 44, 0, 7); ctx.fill();
  ctx.fillStyle = d; ctx.beginPath(); ctx.ellipse(110, -76, 17, 28, .3, 0, 7); ctx.fill();
  ctx.fillStyle = '#2B2A28'; ctx.beginPath(); ctx.arc(108, -48, 7, 0, 7); ctx.arc(134, -34, 8, 0, 7); ctx.fill();
  ctx.fillStyle = '#ff8fa0'; ctx.beginPath(); ctx.ellipse(124, -14, 9, 14, 0, 0, 7); ctx.fill(); ctx.restore(); }

// ---------- 景色(走る場面で流れる) ----------
function scenery(scroll, groundCol, hillCol) {
  const r = rand(11);
  ctx.fillStyle = hillCol; ctx.beginPath(); ctx.moveTo(0, 1180);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 1110 + Math.sin((x + scroll * .25) / 160) * 40); ctx.lineTo(W, 1260); ctx.lineTo(0, 1260); ctx.fill();
  for (let i = 0; i < 9; i++) { const base = i * 260 + 60; const x = ((base - scroll * .6) % 2340 + 2340) % 2340 - 130; const h = 120 + (i % 3) * 40;
    line(x, 1230, x, 1230 - h, '#7a5a3c', 18); ctx.fillStyle = i % 2 ? '#6fbf73' : '#5aa862'; ctx.beginPath(); ctx.arc(x, 1230 - h - 40, 70 + (i % 2) * 18, 0, 7); ctx.fill(); }
  ctx.fillStyle = groundCol; ctx.fillRect(0, 1250, W, H - 1250);
  ctx.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 12; i++) { const x = ((i * 140 - scroll) % 1680 + 1680) % 1680 - 120; rrect(x, 1330, 80, 12, 6); ctx.fill(); }
}

// ---------- 文字 ----------
function caption(text, y, size = 86, a = 1, sc = 1) { if (!text) return; ctx.save(); ctx.globalAlpha = a; ctx.translate(495, y); ctx.scale(sc, sc);
  ctx.font = `800 ${size}px -apple-system, "SF Pro Display", "Helvetica Neue", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  text.split('\n').forEach((ln, i, arr) => { const yy = (i - (arr.length - 1) / 2) * size * 1.15; ctx.lineWidth = size * .14; ctx.strokeStyle = 'rgba(43,42,40,.88)'; ctx.strokeText(ln, 0, yy); ctx.fillStyle = '#fff'; ctx.fillText(ln, 0, yy); });
  ctx.restore(); }
function pop(t0) { const k = seg(T, t0, t0 + .35); return { a: clamp(k * 2), sc: lerp(.7, 1, easeBack(k)) }; }

// ---------- 小物 ----------
function notif(y, a = 1) { ctx.save(); ctx.globalAlpha = a; ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
  ctx.fillStyle = 'rgba(43,42,40,.96)'; rrect(80, y, 820, 210, 46); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#1d1c1b'; rrect(112, y + 52, 106, 106, 24); ctx.fill(); if (icon.complete) ctx.drawImage(icon, 120, y + 60, 90, 90);
  ctx.fillStyle = '#F0EDE5'; ctx.font = '700 38px -apple-system, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText('Go for a run', 246, y + 72);
  ctx.font = '500 45px -apple-system, sans-serif'; ctx.fillText('You decided to do this.', 246, y + 130); ctx.fillText('Nobody else did.', 246, y + 184);
  ctx.fillStyle = '#9d988e'; ctx.font = '30px -apple-system, sans-serif'; ctx.textAlign = 'right'; ctx.fillText('now', 870, y + 64); ctx.restore(); }
function phone(x, y, w, h, shake = 0, glow = 0) { ctx.save(); ctx.translate(x + Math.sin(T * 90) * shake, y); ctx.rotate(Math.sin(T * 70) * shake * .006);
  if (glow) { ctx.shadowColor = `rgba(255,240,200,${glow})`; ctx.shadowBlur = 60; } ctx.fillStyle = '#2B2A28'; rrect(-w / 2, -h / 2, w, h, w * .18); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#3d3b38'; rrect(-w / 2 + 12, -h / 2 + 12, w - 24, h - 24, w * .14); ctx.fill(); if (icon.complete) ctx.drawImage(icon, -w * .28, -w * .28, w * .56, w * .56); ctx.restore(); }
function sparkle(x, y, r, rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = '#fff'; ctx.beginPath();
  for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * .28 : r; const a = i * Math.PI / 4; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.fill(); ctx.restore(); }
function counter(n, y, a = 1) { ctx.save(); ctx.globalAlpha = a; ctx.font = '900 150px -apple-system, "SF Pro Display", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 18; ctx.strokeStyle = '#fff'; ctx.lineJoin = 'round'; const s = `${n} / 66`; ctx.strokeText(s, 495, y); ctx.fillStyle = '#2B2A28'; ctx.fillText(s, 495, y);
  // 進み具合のバー
  ctx.fillStyle = 'rgba(43,42,40,.18)'; rrect(140, y + 100, 710, 26, 13); ctx.fill(); ctx.fillStyle = '#2B2A28'; rrect(140, y + 100, Math.max(26, 710 * n / 66), 26, 13); ctx.fill(); ctx.restore(); }

/* 文面を変えられる通知(1〜2行) */
function notifText(y, title, l1, l2, a = 1, sc = 1) { ctx.save(); ctx.globalAlpha = a; ctx.translate(490, y + 105); ctx.scale(sc, sc); ctx.translate(-490, -(y + 105));
  ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
  ctx.fillStyle = 'rgba(43,42,40,.96)'; rrect(80, y, 820, 210, 46); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#1d1c1b'; rrect(112, y + 52, 106, 106, 24); ctx.fill(); if (icon.complete) ctx.drawImage(icon, 120, y + 60, 90, 90);
  ctx.fillStyle = '#F0EDE5'; ctx.font = '700 38px -apple-system, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(title, 246, y + 72);
  ctx.font = '500 35px -apple-system, sans-serif'; ctx.fillText(l1, 246, y + 128); if (l2) ctx.fillText(l2, 246, y + 176);
  ctx.fillStyle = '#9d988e'; ctx.font = '30px -apple-system, sans-serif'; ctx.textAlign = 'right'; ctx.fillText('now', 870, y + 64); ctx.restore(); }
/* 紙吹雪: t0 秒に (ox, oy) から n 枚 */
function confetti(t0, n, seed, ox, oy, power = 1) { const dt = T - t0; if (dt < 0) return; const r = rand(seed); const cols = ['#ff7a59', '#ffd56b', '#5ab3a8', '#7fa7d9', '#ff8fa0', '#ffffff'];
  for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (r() - .5) * 2.4, v = (900 + r() * 1300) * power, c = cols[i % cols.length], spin = (r() - .5) * 20, w = 18 + r() * 16;
    const x = ox + Math.cos(a) * v * dt + Math.sin(dt * 3 + i) * 40, y = oy + Math.sin(a) * v * dt + 1300 * dt * dt; if (y > H + 50) continue;
    ctx.save(); ctx.translate(x, y); ctx.rotate(spin * dt); ctx.scale(1, Math.cos(dt * 9 + i)); ctx.fillStyle = c; ctx.fillRect(-w / 2, -w / 4, w, w / 2); ctx.restore(); } }
