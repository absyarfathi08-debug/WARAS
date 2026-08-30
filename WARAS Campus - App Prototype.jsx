import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Leaf, ScanLine, Home, Package, History, User, Store, ClipboardList, TrendingUp,
  MapPin, CheckCircle2, Droplets, RefreshCw, Plus, X, ChevronRight, ChevronLeft,
  Camera, Award, Users, ShoppingBag, AlertCircle, Sparkles, RotateCcw, Send, Check,
  ShieldCheck, Trophy, Clock, Utensils, Trash2, Loader2, QrCode as QrCodeIcon
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';

/* =========================================================================
   CONSTANTS & UTILITIES
   ========================================================================= */

const CORE_KEY = 'waras-core-v1';
const STUDENT_KEY = 'waras-student-profile-v1';
const KANTIN_KEY = 'waras-kantin-profile-v1';

const KANTIN_LIST = ['Kantin Utama', 'Kantin Fakultas Teknik', 'Kantin Perpustakaan'];

const RETURN_POINTS = [
  { id: 'rp1', name: 'Dekat Kantin Utama', desc: 'Sebelah pintu masuk kantin utama' },
  { id: 'rp2', name: 'Perpustakaan', desc: 'Lobi lantai 1, area loker' },
  { id: 'rp3', name: 'Gedung Perkuliahan', desc: 'Lobi utama gedung kuliah' },
  { id: 'rp4', name: 'Area Resmi Kampus', desc: 'Titik drop-off dekat gerbang kampus' },
];

const SEED_NAMES = ['Rizky A.', 'Dinda P.', 'Farhan M.', 'Salsa K.', 'Bagus W.', 'Intan R.', 'Yoga S.', 'Nadia F.', 'Fajar T.', 'Citra L.'];

const PACKAGES = [
  { id: 'p20', label: 'Paket 20 Wadah', qty: 20, price: 75000 },
  { id: 'p40', label: 'Paket 40 Wadah', qty: 40, price: 130000 },
  { id: 'p60', label: 'Paket 60 Wadah', qty: 60, price: 180000 },
];

const STATUS_META = {
  'tersedia': { label: 'Tersedia', tone: 'green' },
  'dipinjam': { label: 'Dipinjam', tone: 'gold' },
  'menunggu-cuci': { label: 'Menunggu Cuci', tone: 'slate' },
  'dicuci': { label: 'Sudah Dicuci', tone: 'teal' },
};

const LEVELS = [
  { min: 0, label: 'Pemula Hijau' },
  { min: 50, label: 'Peduli Lingkungan' },
  { min: 150, label: 'Eco Warrior' },
  { min: 300, label: 'Duta WARAS' },
];

function uid() { return Math.random().toString(36).slice(2, 10); }

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
  return h;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function relTime(ts) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'baru saja';
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  return `${day} hari lalu`;
}

function fmtDateShort(ts) {
  return new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

function fmtRupiah(n) {
  return 'Rp' + n.toLocaleString('id-ID');
}

function levelFor(points) {
  let cur = LEVELS[0];
  for (const l of LEVELS) if (points >= l.min) cur = l;
  const idx = LEVELS.indexOf(cur);
  const next = LEVELS[idx + 1] || null;
  return { label: cur.label, next };
}

/* =========================================================================
   SEED DATA
   ========================================================================= */

function seedState() {
  const now = Date.now();
  const rng = mulberry32(42);
  const totalContainers = 24;
  const statusPlan = [
    'tersedia', 'tersedia', 'tersedia', 'tersedia', 'tersedia', 'tersedia', 'tersedia', 'tersedia', 'tersedia',
    'dipinjam', 'dipinjam', 'dipinjam', 'dipinjam', 'dipinjam', 'dipinjam', 'dipinjam', 'dipinjam',
    'menunggu-cuci', 'menunggu-cuci', 'menunggu-cuci', 'menunggu-cuci',
    'dicuci', 'dicuci', 'dicuci',
  ];

  const containers = [];
  const activeTransactions = [];

  for (let i = 0; i < totalContainers; i++) {
    const code = `WRC-${String(i + 1).padStart(4, '0')}`;
    const kantin = KANTIN_LIST[i % KANTIN_LIST.length];
    const status = statusPlan[i];
    const cycleCount = 8 + Math.floor(rng() * 130);
    let holderName = null;
    if (status === 'dipinjam') {
      holderName = SEED_NAMES[i % SEED_NAMES.length];
      const borrowedAt = now - Math.floor(rng() * 1000 * 60 * 60 * 30);
      activeTransactions.push({
        id: uid(), containerId: code, studentName: holderName, kantin,
        borrowedAt, returnedAt: null, returnPoint: null, status: 'aktif',
      });
    }
    containers.push({
      id: code, kantinAsal: kantin, status, holderName, cycleCount,
      lastAction: now - Math.floor(rng() * 1000 * 60 * 60 * 24),
    });
  }

  const historyTransactions = [];
  for (let i = 0; i < 70; i++) {
    const daysAgo = Math.floor(rng() * 14);
    const container = containers[Math.floor(rng() * totalContainers)];
    const student = SEED_NAMES[Math.floor(rng() * SEED_NAMES.length)];
    const borrowedAt = now - daysAgo * 86400000 - Math.floor(rng() * 6 * 3600000) - 3600000 * 6;
    const returnedAt = borrowedAt + Math.floor(20 * 60000 + rng() * 3 * 3600000);
    const rp = RETURN_POINTS[Math.floor(rng() * RETURN_POINTS.length)];
    historyTransactions.push({
      id: uid(), containerId: container.id, studentName: student, kantin: container.kantinAsal,
      borrowedAt, returnedAt, returnPoint: rp.name, status: 'selesai',
    });
  }

  const points = {};
  historyTransactions.forEach(t => { points[t.studentName] = (points[t.studentName] || 0) + 10; });

  return {
    containers,
    transactions: [...activeTransactions, ...historyTransactions].sort((a, b) => b.borrowedAt - a.borrowedAt),
    requests: [],
    points,
    kantinPackages: { 'Kantin Utama': 'p40', 'Kantin Fakultas Teknik': 'p20', 'Kantin Perpustakaan': 'p20' },
    seededAt: now,
  };
}

/* =========================================================================
   PURE STATE TRANSITIONS
   ========================================================================= */

function doPickup(state, { containerId, studentName, kantin }) {
  const containers = state.containers.map(c => c.id === containerId
    ? { ...c, status: 'dipinjam', holderName: studentName, lastAction: Date.now() } : c);
  const tx = { id: uid(), containerId, studentName, kantin, borrowedAt: Date.now(), returnedAt: null, returnPoint: null, status: 'aktif' };
  return { ...state, containers, transactions: [tx, ...state.transactions] };
}

function doReturn(state, { containerId, returnPointName }) {
  const containers = state.containers.map(c => c.id === containerId
    ? { ...c, status: 'menunggu-cuci', holderName: null, cycleCount: c.cycleCount + 1, lastAction: Date.now() } : c);
  let studentName = null;
  const transactions = state.transactions.map(t => {
    if (t.containerId === containerId && t.status === 'aktif') {
      studentName = t.studentName;
      return { ...t, returnedAt: Date.now(), returnPoint: returnPointName, status: 'selesai' };
    }
    return t;
  });
  const points = { ...state.points };
  if (studentName) points[studentName] = (points[studentName] || 0) + 10;
  return { ...state, containers, transactions, points };
}

function doMarkWashed(state, containerId) {
  return { ...state, containers: state.containers.map(c => c.id === containerId ? { ...c, status: 'dicuci', lastAction: Date.now() } : c) };
}

function doMarkReady(state, containerId) {
  return { ...state, containers: state.containers.map(c => c.id === containerId ? { ...c, status: 'tersedia', lastAction: Date.now() } : c) };
}

function doAddContainer(state, kantin) {
  const nums = state.containers.map(c => parseInt(c.id.split('-')[1], 10)).filter(n => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  const code = `WRC-${String(next).padStart(4, '0')}`;
  const containers = [...state.containers, { id: code, kantinAsal: kantin, status: 'tersedia', holderName: null, cycleCount: 0, lastAction: Date.now() }];
  return { ...state, containers };
}

function doRequestContainers(state, { kantin, qty, note }) {
  const req = { id: uid(), kantin, qty, note: note || '', status: 'pending', createdAt: Date.now() };
  return { ...state, requests: [req, ...state.requests] };
}

function doFulfillRequest(state, requestId) {
  const req = state.requests.find(r => r.id === requestId);
  if (!req) return state;
  let next = state;
  for (let i = 0; i < req.qty; i++) next = doAddContainer(next, req.kantin);
  const requests = next.requests.map(r => r.id === requestId ? { ...r, status: 'fulfilled', fulfilledAt: Date.now() } : r);
  return { ...next, requests };
}

function doSetKantinPackage(state, { kantin, packageId }) {
  return { ...state, kantinPackages: { ...state.kantinPackages, [kantin]: packageId } };
}

function computeImpact(containers) {
  const totalCycles = containers.reduce((s, c) => s + c.cycleCount, 0);
  const plasticKg = (totalCycles * 15) / 1000;
  const costSaved = totalCycles * 500;
  const co2Kg = (totalCycles * 50) / 1000;
  return { totalCycles, plasticKg, costSaved, co2Kg };
}

function buildDailyTrend(transactions) {
  const days = [];
  const now = new Date(); now.setHours(0, 0, 0, 0);
  for (let i = 13; i >= 0; i--) days.push(now.getTime() - i * 86400000);
  return days.map(dayStart => {
    const dayEnd = dayStart + 86400000;
    const dayTx = transactions.filter(t => t.borrowedAt >= dayStart && t.borrowedAt < dayEnd);
    return { date: new Date(dayStart).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' }), transaksi: dayTx.length };
  });
}

/* =========================================================================
   SMALL SHARED UI PIECES
   ========================================================================= */

function PseudoQR({ value, size = 96 }) {
  const n = 7;
  const cell = size / n;
  const seed = Math.abs(hashCode(value));
  const rng = mulberry32(seed);
  const isFinder = (r, c) => (r < 3 && c < 3) || (r < 3 && c > n - 4) || (r > n - 4 && c < 3);
  const cells = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (isFinder(r, c)) continue;
    if (rng() > 0.5) cells.push([r, c]);
  }
  const finder = (ox, oy, key) => (
    <g key={key}>
      <rect x={ox} y={oy} width={3 * cell} height={3 * cell} fill="#1B2620" rx={cell * 0.35} />
      <rect x={ox + cell * 0.55} y={oy + cell * 0.55} width={3 * cell - cell * 1.1} height={3 * cell - cell * 1.1} fill="#FCFAF3" rx={cell * 0.25} />
      <rect x={ox + cell * 1.1} y={oy + cell * 1.1} width={3 * cell - cell * 2.2} height={3 * cell - cell * 2.2} fill="#1B2620" rx={cell * 0.18} />
    </g>
  );
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Kode wadah ${value}`}>
      <rect width={size} height={size} fill="#FCFAF3" rx={size * 0.1} />
      {cells.map(([r, c]) => (
        <rect key={`${r}-${c}`} x={c * cell + cell * 0.08} y={r * cell + cell * 0.08} width={cell * 0.84} height={cell * 0.84} fill="#1B2620" rx={cell * 0.15} />
      ))}
      {finder(cell * 0.15, cell * 0.15, 'f1')}
      {finder((n - 3) * cell + cell * 0.15, cell * 0.15, 'f2')}
      {finder(cell * 0.15, (n - 3) * cell + cell * 0.15, 'f3')}
    </svg>
  );
}

function Badge({ children, tone = 'default' }) {
  return <span className={`wc-badge tone-${tone}`}>{children}</span>;
}

function StatCard({ label, value, icon }) {
  return (
    <div className="wc-statcard">
      <div className="wc-statcard-icon">{icon}</div>
      <div className="wc-statcard-value">{value}</div>
      <div className="wc-statcard-label">{label}</div>
    </div>
  );
}

function EmptyState({ icon, title, desc, action }) {
  return (
    <div className="wc-empty">
      <div className="wc-empty-icon">{icon}</div>
      <div className="wc-empty-title">{title}</div>
      {desc && <div className="wc-empty-desc">{desc}</div>}
      {action}
    </div>
  );
}

function TopBar({ title, subtitle, icon, onSwitch, switchLabel = 'Ganti' }) {
  return (
    <div className="wc-topbar">
      <div className="wc-topbar-id">
        <span className="wc-topbar-icon">{icon}</span>
        <div>
          <div className="wc-topbar-title">{title}</div>
          {subtitle && <div className="wc-topbar-subtitle">{subtitle}</div>}
        </div>
      </div>
      {onSwitch && <button className="wc-linkbtn" onClick={onSwitch}>{switchLabel}</button>}
    </div>
  );
}

function BottomNav({ tabs, active, onChange }) {
  return (
    <nav className="wc-bottomnav">
      {tabs.map(t => {
        const Icon = t.icon;
        return (
          <button key={t.id} className={`wc-navbtn ${active === t.id ? 'active' : ''}`} onClick={() => onChange(t.id)}>
            <span className="wc-navicon-wrap">
              <Icon size={19} strokeWidth={active === t.id ? 2.4 : 2} />
              {t.badge ? <span className="wc-navbadge">{t.badge}</span> : null}
            </span>
            <span className="wc-navlabel">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function Segmented({ options, value, onChange }) {
  return (
    <div className="wc-segmented">
      {options.map(o => (
        <button key={o.value} className={`wc-segmented-btn ${value === o.value ? 'active' : ''}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ConfirmModal({ title, desc, confirmLabel = 'Ya, lanjutkan', danger, onConfirm, onCancel }) {
  return (
    <div className="wc-modal-backdrop" onClick={onCancel}>
      <div className="wc-modal" onClick={e => e.stopPropagation()}>
        <div className="wc-modal-title">{title}</div>
        {desc && <div className="wc-modal-desc">{desc}</div>}
        <div className="wc-modal-actions">
          <button className="wc-btn-ghost" onClick={onCancel}>Batal</button>
          <button className={danger ? 'wc-btn-danger' : 'wc-btn-primary'} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   SCANNER (simulated + best-effort real camera)
   ========================================================================= */

function Scanner({ subtitle, autoCode, notFoundMessage, onDetect, onManualToggleHint }) {
  const videoRef = useRef(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const [status, setStatus] = useState('Mencari kode wadah...');
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          if (cancelled) { stream.getTracks().forEach(tr => tr.stop()); return; }
          streamRef.current = stream;
          if (videoRef.current) { videoRef.current.srcObject = stream; }
          setHasCamera(true);
        })
        .catch(() => { /* no camera available in this environment, fall back silently */ });
    }
    return () => {
      cancelled = true;
      if (streamRef.current) streamRef.current.getTracks().forEach(tr => tr.stop());
    };
  }, []);

  useEffect(() => {
    if (!autoCode) { setStatus(notFoundMessage || 'Tidak ada wadah untuk dipindai.'); return; }
    setStatus('Mencari kode wadah...');
    timerRef.current = setTimeout(() => {
      setStatus('Kode terdeteksi!');
      setTimeout(() => onDetect(autoCode), 350);
    }, 1500);
    return () => clearTimeout(timerRef.current);
  }, [autoCode]);

  function detectNow() {
    clearTimeout(timerRef.current);
    if (!autoCode) return;
    setStatus('Kode terdeteksi!');
    setTimeout(() => onDetect(autoCode), 200);
  }

  return (
    <div className="wc-scanner">
      <div className="wc-scanner-view">
        {hasCamera ? (
          <video ref={videoRef} autoPlay playsInline muted className="wc-scanner-video" />
        ) : (
          <div className="wc-scanner-fallback" />
        )}
        <div className="wc-scanner-dim" />
        <div className="wc-scanner-frame">
          <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
          {autoCode && <div className="wc-scanline" />}
        </div>
      </div>
      <div className="wc-scanner-status">
        {autoCode ? <Loader2 size={15} className="wc-spin" /> : <AlertCircle size={15} />}
        <span>{status}</span>
      </div>
      {subtitle && <div className="wc-scanner-subtitle">{subtitle}</div>}
      {autoCode && (
        <button className="wc-btn-primary wc-scanner-btn" onClick={detectNow}>
          <Camera size={16} /> Deteksi Sekarang
        </button>
      )}
      {!manualOpen ? (
        <button className="wc-linkbtn wc-scanner-manual-link" onClick={() => setManualOpen(true)}>
          Tidak bisa scan? Masukkan kode manual
        </button>
      ) : (
        <div className="wc-scanner-manual">
          <input className="wc-input" placeholder="Contoh: WRC-0007" value={manualValue}
            onChange={e => setManualValue(e.target.value.toUpperCase())} />
          <button className="wc-btn-primary" disabled={!manualValue.trim()}
            onClick={() => onDetect(manualValue.trim())}>Gunakan Kode</button>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   MAHASISWA APP
   ========================================================================= */

function MahasiswaApp({ state, updateState, profile, setProfile, showToast }) {
  const [tab, setTab] = useState('home');
  const [nameInput, setNameInput] = useState('');
  const [presetReturnId, setPresetReturnId] = useState(null);

  if (!profile || !profile.name) {
    return (
      <div className="wc-gate">
        <div className="wc-gate-icon"><Leaf size={34} /></div>
        <h2>Selamat datang di WARAS Campus</h2>
        <p>Masukkan namamu untuk mulai memakai wadah pakai ulang di kantin kampus.</p>
        <input className="wc-input" placeholder="Nama kamu" value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && nameInput.trim()) setProfile({ name: nameInput.trim() }); }} />
        <button className="wc-btn-primary wc-gate-btn" disabled={!nameInput.trim()}
          onClick={() => setProfile({ name: nameInput.trim() })}>Mulai Pakai WARAS</button>
      </div>
    );
  }

  const myActive = state.containers.filter(c => c.status === 'dipinjam' && c.holderName === profile.name);
  const myHistory = state.transactions.filter(t => t.studentName === profile.name).sort((a, b) => b.borrowedAt - a.borrowedAt);
  const myPoints = state.points[profile.name] || 0;
  const myCycles = myHistory.filter(t => t.status === 'selesai').length;

  function goReturn(containerId) {
    setPresetReturnId(containerId);
    setTab('scan');
  }

  return (
    <div className="wc-role">
      <TopBar title="WARAS Campus" subtitle={`Halo, ${profile.name}`} icon={<Leaf size={17} />}
        onSwitch={() => setProfile(null)} />
      <div className="wc-tabcontent">
        {tab === 'home' && (
          <StudentHome profile={profile} myActive={myActive} myPoints={myPoints} myCycles={myCycles}
            onGoScan={() => { setPresetReturnId(null); setTab('scan'); }} onGoWadah={() => setTab('wadah')} />
        )}
        {tab === 'scan' && (
          <StudentScanFlow state={state} updateState={updateState} profile={profile} showToast={showToast}
            presetReturnId={presetReturnId} clearPreset={() => setPresetReturnId(null)}
            onFinish={(t) => { setPresetReturnId(null); setTab(t); }} />
        )}
        {tab === 'wadah' && (
          <StudentWadah myActive={myActive} onReturn={goReturn} onGoScan={() => { setPresetReturnId(null); setTab('scan'); }} />
        )}
        {tab === 'riwayat' && (
          <StudentRiwayat myHistory={myHistory} myPoints={myPoints} myCycles={myCycles} />
        )}
        {tab === 'profil' && (
          <StudentProfil profile={profile} setProfile={setProfile} myPoints={myPoints} myCycles={myCycles} />
        )}
      </div>
      <BottomNav active={tab} onChange={(t) => { if (t !== 'scan') setPresetReturnId(null); setTab(t); }} tabs={[
        { id: 'home', label: 'Beranda', icon: Home },
        { id: 'scan', label: 'Scan', icon: ScanLine },
        { id: 'wadah', label: 'Wadah Saya', icon: Package, badge: myActive.length || null },
        { id: 'riwayat', label: 'Riwayat', icon: History },
        { id: 'profil', label: 'Profil', icon: User },
      ]} />
    </div>
  );
}

function StudentHome({ profile, myActive, myPoints, myCycles, onGoScan, onGoWadah }) {
  const lvl = levelFor(myPoints);
  return (
    <div className="wc-screen">
      <div className="wc-banner">
        <div className="wc-banner-text">
          <div className="wc-banner-eyebrow"><Sparkles size={13} /> Kurangi sampah, mulai dari makan siang</div>
          <div className="wc-banner-title">Pakai wadah, kembalikan, ulangi.</div>
          <button className="wc-btn-onbanner" onClick={onGoScan}><ScanLine size={16} /> Scan Wadah Sekarang</button>
        </div>
      </div>

      <div className="wc-statrow">
        <StatCard label="Wadah Aktif" value={myActive.length} icon={<Package size={16} />} />
        <StatCard label="Total Siklus" value={myCycles} icon={<RefreshCw size={16} />} />
        <StatCard label="Poin" value={myPoints} icon={<Trophy size={16} />} />
      </div>

      {myActive.length > 0 && (
        <div className="wc-card wc-clickable" onClick={onGoWadah}>
          <div className="wc-card-row">
            <div className="wc-card-icon tone-gold"><Package size={16} /></div>
            <div className="wc-card-grow">
              <div className="wc-card-title">Kamu punya {myActive.length} wadah aktif</div>
              <div className="wc-card-sub">Jangan lupa dikembalikan ya, {lvl.label}!</div>
            </div>
            <ChevronRight size={18} className="wc-muted" />
          </div>
        </div>
      )}

      <div className="wc-section-title">Cara Kerja</div>
      <div className="wc-steps">
        {[
          { icon: ShoppingBag, label: 'Beli makanan di kantin partner' },
          { icon: ScanLine, label: 'Scan wadah saat menerima pesanan' },
          { icon: Utensils, label: 'Makan dengan nyaman, wadah food grade' },
          { icon: RefreshCw, label: 'Kembalikan & scan lagi di titik pengembalian' },
        ].map((s, i) => (
          <div className="wc-step" key={i}>
            <div className="wc-step-icon"><s.icon size={16} /></div>
            <div className="wc-step-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="wc-section-title">Titik Pengembalian Terdekat</div>
      <div className="wc-list">
        {RETURN_POINTS.slice(0, 3).map(rp => (
          <div className="wc-list-item" key={rp.id}>
            <div className="wc-list-icon"><MapPin size={15} /></div>
            <div className="wc-grow">
              <div className="wc-list-title">{rp.name}</div>
              <div className="wc-list-sub">{rp.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentScanFlow({ state, updateState, profile, showToast, presetReturnId, clearPreset, onFinish }) {
  const presetContainer = presetReturnId ? state.containers.find(c => c.id === presetReturnId) : null;
  const [mode, setMode] = useState(presetContainer ? 'return' : 'pickup');
  const [step, setStep] = useState(presetContainer ? 'scan-return' : 'kantin');
  const [kantin, setKantin] = useState(null);
  const [selectedContainerId, setSelectedContainerId] = useState(presetContainer ? presetContainer.id : null);
  const [detected, setDetected] = useState(null);
  const [point, setPoint] = useState(null);

  useEffect(() => {
    if (presetContainer) {
      setMode('return'); setSelectedContainerId(presetContainer.id); setStep('scan-return');
    }
    // eslint-disable-next-line
  }, [presetReturnId]);

  const myActiveContainers = state.containers.filter(c => c.status === 'dipinjam' && c.holderName === profile.name);

  function switchMode(m) {
    setMode(m); setKantin(null); setSelectedContainerId(null); setDetected(null); setPoint(null);
    setStep(m === 'pickup' ? 'kantin' : (myActiveContainers.length === 1 ? 'scan-return' : 'pick-container'));
    if (m === 'return' && myActiveContainers.length === 1) setSelectedContainerId(myActiveContainers[0].id);
    clearPreset();
  }

  function pickupAutoCode() {
    const avail = state.containers.filter(c => c.status === 'tersedia' && c.kantinAsal === kantin);
    if (!avail.length) return null;
    const idx = Math.abs(hashCode(kantin + Date.now())) % avail.length;
    return avail[idx].id;
  }
  const [pickupCode, setPickupCode] = useState(null);
  useEffect(() => {
    if (step === 'scan-pickup') setPickupCode(pickupAutoCode());
    // eslint-disable-next-line
  }, [step, kantin]);

  function handlePickupDetect(code) {
    const c = state.containers.find(x => x.id === code && x.status === 'tersedia' && x.kantinAsal === kantin);
    if (!c) { showToast('Kode tidak valid atau wadah sudah tidak tersedia', 'error'); return; }
    setDetected(c); setStep('confirm-pickup');
  }

  function handleReturnDetect(code) {
    if (code !== selectedContainerId) { showToast('Kode tidak cocok dengan wadah yang dipilih', 'error'); return; }
    setStep('choose-point');
  }

  function confirmPickup() {
    updateState(prev => doPickup(prev, { containerId: detected.id, studentName: profile.name, kantin }));
    showToast(`Wadah ${detected.id} berhasil diambil. Selamat makan!`, 'success');
    onFinish('wadah');
  }

  function confirmReturn() {
    updateState(prev => doReturn(prev, { containerId: selectedContainerId, returnPointName: point.name }));
    showToast('Wadah dikembalikan. +10 poin untukmu!', 'success');
    onFinish('riwayat');
  }

  return (
    <div className="wc-screen">
      <Segmented value={mode} onChange={switchMode} options={[
        { value: 'pickup', label: 'Ambil Wadah' },
        { value: 'return', label: 'Kembalikan Wadah' },
      ]} />

      {mode === 'pickup' && step === 'kantin' && (
        <>
          <div className="wc-section-title">Beli makanan di kantin mana?</div>
          <div className="wc-choicelist">
            {KANTIN_LIST.map(k => {
              const availCount = state.containers.filter(c => c.status === 'tersedia' && c.kantinAsal === k).length;
              return (
                <button key={k} className="wc-choice" onClick={() => { setKantin(k); setStep('scan-pickup'); }} disabled={availCount === 0}>
                  <span className="wc-choice-icon"><Store size={16} /></span>
                  <span className="wc-grow">
                    <div className="wc-choice-title">{k}</div>
                    <div className="wc-choice-sub">{availCount} wadah tersedia</div>
                  </span>
                  <ChevronRight size={16} className="wc-muted" />
                </button>
              );
            })}
          </div>
        </>
      )}

      {mode === 'pickup' && step === 'scan-pickup' && (
        <>
          <button className="wc-linkbtn wc-back" onClick={() => setStep('kantin')}><ChevronLeft size={14} /> Pilih kantin lain</button>
          <div className="wc-section-title">Scan wadah di {kantin}</div>
          <Scanner
            subtitle="Arahkan kamera ke QR pada wadah WARAS yang kamu terima."
            autoCode={pickupCode}
            notFoundMessage={`Stok wadah di ${kantin} sedang kosong. Coba kantin lain.`}
            onDetect={handlePickupDetect}
          />
        </>
      )}

      {mode === 'pickup' && step === 'confirm-pickup' && detected && (
        <div className="wc-confirm">
          <div className="wc-confirm-icon tone-green"><CheckCircle2 size={28} /></div>
          <div className="wc-confirm-title">Wadah Terdeteksi</div>
          <div className="wc-qr-wrap"><PseudoQR value={detected.id} /></div>
          <div className="wc-confirm-code">{detected.id}</div>
          <div className="wc-confirm-sub">{kantin}</div>
          <button className="wc-btn-primary wc-confirm-btn" onClick={confirmPickup}>Konfirmasi Ambil Wadah</button>
        </div>
      )}

      {mode === 'return' && step === 'pick-container' && (
        myActiveContainers.length === 0 ? (
          <EmptyState icon={<Package size={30} />} title="Belum ada wadah aktif"
            desc="Kamu belum meminjam wadah WARAS. Yuk ambil wadah dulu saat beli makan." />
        ) : (
          <>
            <div className="wc-section-title">Pilih wadah yang mau dikembalikan</div>
            <div className="wc-choicelist">
              {myActiveContainers.map(c => (
                <button key={c.id} className="wc-choice" onClick={() => { setSelectedContainerId(c.id); setStep('scan-return'); }}>
                  <span className="wc-choice-icon"><Package size={16} /></span>
                  <span className="wc-grow">
                    <div className="wc-choice-title">{c.id}</div>
                    <div className="wc-choice-sub">Dari {c.kantinAsal} &middot; {relTime(c.lastAction)}</div>
                  </span>
                  <ChevronRight size={16} className="wc-muted" />
                </button>
              ))}
            </div>
          </>
        )
      )}

      {mode === 'return' && step === 'scan-return' && selectedContainerId && (
        <>
          {myActiveContainers.length > 1 && (
            <button className="wc-linkbtn wc-back" onClick={() => setStep('pick-container')}><ChevronLeft size={14} /> Pilih wadah lain</button>
          )}
          <div className="wc-section-title">Scan wadah {selectedContainerId}</div>
          <Scanner
            subtitle="Pindai QR pada wadah yang ingin kamu kembalikan."
            autoCode={selectedContainerId}
            onDetect={handleReturnDetect}
          />
        </>
      )}

      {mode === 'return' && step === 'choose-point' && (
        <>
          <div className="wc-section-title">Kembalikan di titik mana?</div>
          <div className="wc-choicelist">
            {RETURN_POINTS.map(rp => (
              <button key={rp.id} className={`wc-choice ${point?.id === rp.id ? 'selected' : ''}`} onClick={() => setPoint(rp)}>
                <span className="wc-choice-icon"><MapPin size={16} /></span>
                <span className="wc-grow">
                  <div className="wc-choice-title">{rp.name}</div>
                  <div className="wc-choice-sub">{rp.desc}</div>
                </span>
                {point?.id === rp.id && <Check size={16} className="wc-accent" />}
              </button>
            ))}
          </div>
          <button className="wc-btn-primary wc-confirm-btn" disabled={!point} onClick={confirmReturn}>
            Konfirmasi Pengembalian
          </button>
        </>
      )}
    </div>
  );
}

function StudentWadah({ myActive, onReturn, onGoScan }) {
  return (
    <div className="wc-screen">
      <div className="wc-section-title">Wadah Sedang Kamu Pinjam</div>
      {myActive.length === 0 ? (
        <EmptyState icon={<Package size={30} />} title="Belum ada wadah aktif"
          desc="Ambil wadah saat kamu membeli makanan di kantin partner WARAS."
          action={<button className="wc-btn-primary" onClick={onGoScan}><ScanLine size={16} /> Scan Wadah</button>} />
      ) : (
        <div className="wc-list">
          {myActive.map(c => (
            <div className="wc-card" key={c.id}>
              <div className="wc-card-row">
                <div className="wc-qr-wrap small"><PseudoQR value={c.id} size={56} /></div>
                <div className="wc-grow">
                  <div className="wc-card-title">{c.id}</div>
                  <div className="wc-card-sub">{c.kantinAsal} &middot; diambil {relTime(c.lastAction)}</div>
                </div>
              </div>
              <button className="wc-btn-secondary wc-full" onClick={() => onReturn(c.id)}>
                <RefreshCw size={15} /> Kembalikan Wadah
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentRiwayat({ myHistory, myPoints, myCycles }) {
  const lvl = levelFor(myPoints);
  const plasticSavedG = myCycles * 15;
  return (
    <div className="wc-screen">
      <div className="wc-card wc-levelcard">
        <div className="wc-card-row">
          <div className="wc-card-icon tone-gold"><Award size={18} /></div>
          <div className="wc-grow">
            <div className="wc-card-title">{lvl.label}</div>
            <div className="wc-card-sub">{myPoints} poin &middot; {myCycles} siklus selesai</div>
          </div>
        </div>
        {lvl.next && (
          <div className="wc-progress-wrap">
            <div className="wc-progress-track"><div className="wc-progress-fill" style={{ width: `${Math.min(100, (myPoints / lvl.next.min) * 100)}%` }} /></div>
            <div className="wc-progress-label">{lvl.next.min - myPoints} poin lagi menuju {lvl.next.label}</div>
          </div>
        )}
      </div>

      <div className="wc-statrow">
        <StatCard label="Plastik Dihindari" value={`${plasticSavedG} g`} icon={<Leaf size={16} />} />
        <StatCard label="Total Siklus" value={myCycles} icon={<RefreshCw size={16} />} />
      </div>

      <div className="wc-section-title">Riwayat Transaksi</div>
      {myHistory.length === 0 ? (
        <EmptyState icon={<History size={30} />} title="Belum ada riwayat" desc="Riwayat pemakaian wadahmu akan muncul di sini." />
      ) : (
        <div className="wc-list">
          {myHistory.map(t => (
            <div className="wc-list-item" key={t.id}>
              <div className="wc-list-icon"><Package size={15} /></div>
              <div className="wc-grow">
                <div className="wc-list-title">{t.containerId} &middot; {t.kantin}</div>
                <div className="wc-list-sub">
                  {fmtDateShort(t.borrowedAt)} &middot; {t.status === 'selesai' ? `Dikembalikan di ${t.returnPoint}` : 'Sedang dipinjam'}
                </div>
              </div>
              <Badge tone={t.status === 'selesai' ? 'green' : 'gold'}>{t.status === 'selesai' ? 'Selesai' : 'Aktif'}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentProfil({ profile, setProfile, myPoints, myCycles }) {
  return (
    <div className="wc-screen">
      <div className="wc-profile-hero">
        <div className="wc-profile-avatar"><User size={26} /></div>
        <div className="wc-profile-name">{profile.name}</div>
        <div className="wc-profile-sub">{levelFor(myPoints).label}</div>
      </div>
      <div className="wc-statrow">
        <StatCard label="Poin" value={myPoints} icon={<Trophy size={16} />} />
        <StatCard label="Siklus" value={myCycles} icon={<RefreshCw size={16} />} />
      </div>
      <div className="wc-card">
        <div className="wc-card-title">Tentang WARAS Campus</div>
        <div className="wc-card-desc">
          WARAS Campus adalah sistem wadah makan pakai ulang untuk kantin kampus. Wadah dipakai, dikembalikan
          di titik yang tersedia, dicuci oleh tim WARAS, lalu dipakai kembali oleh mahasiswa lain &mdash; jadi satu
          wadah bisa bermanfaat ratusan kali, bukan sekali buang.
        </div>
      </div>
      <button className="wc-btn-ghost wc-full" onClick={() => setProfile(null)}>Ganti Nama Pengguna</button>
    </div>
  );
}

/* =========================================================================
   KANTIN APP
   ========================================================================= */

function KantinApp({ state, updateState, profile, setProfile, showToast }) {
  const [tab, setTab] = useState('dashboard');

  if (!profile || !profile.name) {
    return (
      <div className="wc-gate">
        <div className="wc-gate-icon"><Store size={34} /></div>
        <h2>Masuk sebagai Kantin Partner</h2>
        <p>Pilih kantin yang kamu wakili untuk mengelola stok wadah WARAS.</p>
        <div className="wc-choicelist">
          {KANTIN_LIST.map(k => (
            <button key={k} className="wc-choice" onClick={() => setProfile({ name: k })}>
              <span className="wc-choice-icon"><Store size={16} /></span>
              <span className="wc-choice-title">{k}</span>
              <ChevronRight size={16} className="wc-muted" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  const myContainers = state.containers.filter(c => c.kantinAsal === profile.name);
  const myTx = state.transactions.filter(t => t.kantin === profile.name).sort((a, b) => b.borrowedAt - a.borrowedAt);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayCount = myTx.filter(t => t.borrowedAt >= todayStart.getTime()).length;

  return (
    <div className="wc-role">
      <TopBar title={profile.name} subtitle="Mitra WARAS Campus" icon={<Store size={17} />} onSwitch={() => setProfile(null)} />
      <div className="wc-tabcontent">
        {tab === 'dashboard' && <KantinDashboard profile={profile} myContainers={myContainers} todayCount={todayCount} updateState={updateState} showToast={showToast} />}
        {tab === 'stok' && <KantinStok myContainers={myContainers} />}
        {tab === 'riwayat' && <KantinRiwayat myTx={myTx} />}
        {tab === 'paket' && <KantinPaket state={state} profile={profile} updateState={updateState} showToast={showToast} />}
      </div>
      <BottomNav active={tab} onChange={setTab} tabs={[
        { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
        { id: 'stok', label: 'Stok Wadah', icon: Package },
        { id: 'riwayat', label: 'Riwayat', icon: History },
        { id: 'paket', label: 'Langganan', icon: ClipboardList },
      ]} />
    </div>
  );
}

function KantinDashboard({ profile, myContainers, todayCount, updateState, showToast }) {
  const [reqOpen, setReqOpen] = useState(false);
  const [qty, setQty] = useState(10);
  const counts = {
    tersedia: myContainers.filter(c => c.status === 'tersedia').length,
    dipinjam: myContainers.filter(c => c.status === 'dipinjam').length,
    'menunggu-cuci': myContainers.filter(c => c.status === 'menunggu-cuci').length,
    dicuci: myContainers.filter(c => c.status === 'dicuci').length,
  };

  function submitRequest() {
    updateState(prev => doRequestContainers(prev, { kantin: profile.name, qty: Number(qty) || 1 }));
    showToast('Permintaan wadah tambahan dikirim ke Tim WARAS', 'success');
    setReqOpen(false);
  }

  return (
    <div className="wc-screen">
      <div className="wc-statrow">
        <StatCard label="Wadah Tersedia" value={counts.tersedia} icon={<Package size={16} />} />
        <StatCard label="Sedang Dipinjam" value={counts.dipinjam} icon={<Users size={16} />} />
        <StatCard label="Transaksi Hari Ini" value={todayCount} icon={<ShoppingBag size={16} />} />
      </div>

      <div className="wc-section-title">Status Stok Wadahmu</div>
      <div className="wc-statusbars">
        {Object.entries(counts).map(([k, v]) => (
          <div className="wc-statusbar-row" key={k}>
            <span className={`wc-dot tone-${STATUS_META[k].tone}`} />
            <span className="wc-statusbar-label">{STATUS_META[k].label}</span>
            <span className="wc-statusbar-value">{v}</span>
          </div>
        ))}
      </div>

      <div className="wc-card">
        <div className="wc-card-title">Butuh wadah tambahan?</div>
        <div className="wc-card-desc">Ajukan permintaan wadah baru ke Tim WARAS jika stok mulai menipis.</div>
        {!reqOpen ? (
          <button className="wc-btn-secondary wc-full" onClick={() => setReqOpen(true)}><Send size={15} /> Minta Tambahan Wadah</button>
        ) : (
          <div className="wc-inline-form">
            <input type="number" min="1" className="wc-input" value={qty} onChange={e => setQty(e.target.value)} />
            <button className="wc-btn-primary" onClick={submitRequest}>Kirim</button>
          </div>
        )}
      </div>
    </div>
  );
}

function KantinStok({ myContainers }) {
  const [filter, setFilter] = useState('semua');
  const filtered = filter === 'semua' ? myContainers : myContainers.filter(c => c.status === filter);
  return (
    <div className="wc-screen">
      <div className="wc-chiprow">
        {['semua', 'tersedia', 'dipinjam', 'menunggu-cuci', 'dicuci'].map(f => (
          <button key={f} className={`wc-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'semua' ? 'Semua' : STATUS_META[f].label}
          </button>
        ))}
      </div>
      <div className="wc-list">
        {filtered.map(c => (
          <div className="wc-list-item" key={c.id}>
            <div className="wc-list-icon"><Package size={15} /></div>
            <div className="wc-grow">
              <div className="wc-list-title">{c.id}</div>
              <div className="wc-list-sub">{c.holderName ? `Dipegang ${c.holderName}` : `${c.cycleCount}x siklus`}</div>
            </div>
            <Badge tone={STATUS_META[c.status].tone}>{STATUS_META[c.status].label}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function KantinRiwayat({ myTx }) {
  return (
    <div className="wc-screen">
      <div className="wc-section-title">Riwayat Transaksi di Kantinmu</div>
      {myTx.length === 0 ? (
        <EmptyState icon={<History size={30} />} title="Belum ada transaksi" />
      ) : (
        <div className="wc-list">
          {myTx.map(t => (
            <div className="wc-list-item" key={t.id}>
              <div className="wc-list-icon"><ShoppingBag size={15} /></div>
              <div className="wc-grow">
                <div className="wc-list-title">{t.containerId} &middot; {t.studentName}</div>
                <div className="wc-list-sub">{fmtDateShort(t.borrowedAt)} &middot; {t.status === 'selesai' ? 'Selesai' : 'Sedang dipinjam'}</div>
              </div>
              <Badge tone={t.status === 'selesai' ? 'green' : 'gold'}>{t.status === 'selesai' ? 'Selesai' : 'Aktif'}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KantinPaket({ state, profile, updateState, showToast }) {
  const current = state.kantinPackages[profile.name];
  return (
    <div className="wc-screen">
      <div className="wc-section-title">Paket Langganan Kantin</div>
      <div className="wc-list">
        {PACKAGES.map(p => (
          <button key={p.id} className={`wc-package ${current === p.id ? 'active' : ''}`}
            onClick={() => { updateState(prev => doSetKantinPackage(prev, { kantin: profile.name, packageId: p.id })); showToast(`Paket diubah ke ${p.label}`); }}>
            <div className="wc-package-row">
              <div>
                <div className="wc-package-title">{p.label}</div>
                <div className="wc-package-sub">{p.qty} wadah dikelola</div>
              </div>
              <div className="wc-package-price">{fmtRupiah(p.price)}<span>/bulan</span></div>
            </div>
            {current === p.id && <div className="wc-package-active-tag"><Check size={13} /> Paket Aktif</div>}
          </button>
        ))}
      </div>
      <div className="wc-note">*Harga fleksibel menyesuaikan skala kampus. Mencakup pencucian, distribusi, dan monitoring wadah.</div>
    </div>
  );
}

/* =========================================================================
   ADMIN (TIM WARAS) APP
   ========================================================================= */

function AdminApp({ state, updateState, showToast }) {
  const [tab, setTab] = useState('ringkasan');
  const pendingReq = state.requests.filter(r => r.status === 'pending').length;

  return (
    <div className="wc-role">
      <TopBar title="Tim WARAS" subtitle="Panel Operasional" icon={<ShieldCheck size={17} />} />
      <div className="wc-tabcontent">
        {tab === 'ringkasan' && <AdminRingkasan state={state} />}
        {tab === 'wadah' && <AdminWadah state={state} updateState={updateState} showToast={showToast} />}
        {tab === 'permintaan' && <AdminPermintaan state={state} updateState={updateState} showToast={showToast} />}
        {tab === 'dampak' && <AdminDampak state={state} updateState={updateState} showToast={showToast} />}
      </div>
      <BottomNav active={tab} onChange={setTab} tabs={[
        { id: 'ringkasan', label: 'Ringkasan', icon: TrendingUp },
        { id: 'wadah', label: 'Wadah', icon: Package },
        { id: 'permintaan', label: 'Permintaan', icon: ClipboardList, badge: pendingReq || null },
        { id: 'dampak', label: 'Dampak', icon: Leaf },
      ]} />
    </div>
  );
}

function AdminRingkasan({ state }) {
  const totalSelesai = state.transactions.filter(t => t.status === 'selesai').length;
  const totalAktif = state.transactions.filter(t => t.status === 'aktif').length;
  const rate = totalSelesai + totalAktif > 0 ? Math.round((totalSelesai / (totalSelesai + totalAktif)) * 100) : 0;
  const totalCycles = state.containers.reduce((s, c) => s + c.cycleCount, 0);
  const trend = useMemo(() => buildDailyTrend(state.transactions), [state.transactions]);
  const counts = {
    tersedia: state.containers.filter(c => c.status === 'tersedia').length,
    dipinjam: state.containers.filter(c => c.status === 'dipinjam').length,
    'menunggu-cuci': state.containers.filter(c => c.status === 'menunggu-cuci').length,
    dicuci: state.containers.filter(c => c.status === 'dicuci').length,
  };

  return (
    <div className="wc-screen">
      <div className="wc-statrow">
        <StatCard label="Tingkat Pengembalian" value={`${rate}%`} icon={<RefreshCw size={16} />} />
        <StatCard label="Wadah Beredar" value={state.containers.length} icon={<Package size={16} />} />
        <StatCard label="Sedang Dipinjam" value={totalAktif} icon={<Users size={16} />} />
      </div>

      <div className="wc-section-title">Transaksi 14 Hari Terakhir</div>
      <div className="wc-chart-card">
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={trend} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1B262015" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#6B7A70' }} axisLine={false} tickLine={false} interval={2} />
            <YAxis tick={{ fontSize: 9, fill: '#6B7A70' }} axisLine={false} tickLine={false} width={24} />
            <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
            <Bar dataKey="transaksi" radius={[5, 5, 0, 0]} fill="#2F5E42" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="wc-section-title">Distribusi Status Wadah</div>
      <div className="wc-statusbars">
        {Object.entries(counts).map(([k, v]) => (
          <div className="wc-statusbar-row" key={k}>
            <span className={`wc-dot tone-${STATUS_META[k].tone}`} />
            <span className="wc-statusbar-label">{STATUS_META[k].label}</span>
            <span className="wc-statusbar-value">{v}</span>
          </div>
        ))}
      </div>

      <div className="wc-statrow">
        <StatCard label="Total Siklus Pakai Ulang" value={totalCycles} icon={<Trophy size={16} />} />
      </div>
    </div>
  );
}

function AdminWadah({ state, updateState, showToast }) {
  const [filter, setFilter] = useState('semua');
  const [addOpen, setAddOpen] = useState(false);
  const [addKantin, setAddKantin] = useState(KANTIN_LIST[0]);
  const [confirmReset, setConfirmReset] = useState(false);

  const filtered = filter === 'semua' ? state.containers : state.containers.filter(c => c.status === filter);

  function addContainer() {
    updateState(prev => doAddContainer(prev, addKantin));
    showToast('Wadah baru ditambahkan');
    setAddOpen(false);
  }

  function resetDemo() {
    updateState(() => seedState());
    showToast('Data demo direset');
    setConfirmReset(false);
  }

  return (
    <div className="wc-screen">
      <div className="wc-chiprow">
        {['semua', 'tersedia', 'dipinjam', 'menunggu-cuci', 'dicuci'].map(f => (
          <button key={f} className={`wc-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'semua' ? 'Semua' : STATUS_META[f].label}
          </button>
        ))}
      </div>

      <div className="wc-list">
        {filtered.map(c => (
          <div className="wc-card" key={c.id}>
            <div className="wc-card-row">
              <div className="wc-qr-wrap small"><PseudoQR value={c.id} size={48} /></div>
              <div className="wc-grow">
                <div className="wc-card-title">{c.id} <Badge tone={STATUS_META[c.status].tone}>{STATUS_META[c.status].label}</Badge></div>
                <div className="wc-card-sub">{c.kantinAsal} &middot; {c.cycleCount}x siklus{c.holderName ? ` \u00b7 ${c.holderName}` : ''}</div>
              </div>
            </div>
            {c.status === 'menunggu-cuci' && (
              <button className="wc-btn-secondary wc-full" onClick={() => { updateState(prev => doMarkWashed(prev, c.id)); showToast(`${c.id} ditandai sudah dicuci`); }}>
                <Droplets size={15} /> Tandai Sudah Dicuci
              </button>
            )}
            {c.status === 'dicuci' && (
              <button className="wc-btn-secondary wc-full" onClick={() => { updateState(prev => doMarkReady(prev, c.id)); showToast(`${c.id} siap dipakai kembali`); }}>
                <Sparkles size={15} /> Set Siap Pakai (Tersedia)
              </button>
            )}
          </div>
        ))}
      </div>

      {!addOpen ? (
        <button className="wc-btn-primary wc-full" onClick={() => setAddOpen(true)}><Plus size={16} /> Tambah Wadah Baru</button>
      ) : (
        <div className="wc-card">
          <div className="wc-card-title">Tambah wadah untuk kantin:</div>
          <select className="wc-input" value={addKantin} onChange={e => setAddKantin(e.target.value)}>
            {KANTIN_LIST.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <div className="wc-modal-actions">
            <button className="wc-btn-ghost" onClick={() => setAddOpen(false)}>Batal</button>
            <button className="wc-btn-primary" onClick={addContainer}>Tambahkan</button>
          </div>
        </div>
      )}

      <button className="wc-btn-danger-outline wc-full" onClick={() => setConfirmReset(true)}>
        <Trash2 size={15} /> Reset Data Demo
      </button>

      {confirmReset && (
        <ConfirmModal title="Reset semua data demo?" desc="Semua wadah, transaksi, dan poin akan dikembalikan ke kondisi awal simulasi."
          confirmLabel="Ya, Reset" danger onConfirm={resetDemo} onCancel={() => setConfirmReset(false)} />
      )}
    </div>
  );
}

function AdminPermintaan({ state, updateState, showToast }) {
  const pending = state.requests.filter(r => r.status === 'pending');
  const fulfilled = state.requests.filter(r => r.status === 'fulfilled');

  function fulfill(id) {
    updateState(prev => doFulfillRequest(prev, id));
    showToast('Permintaan dipenuhi, wadah baru ditambahkan');
  }

  return (
    <div className="wc-screen">
      <div className="wc-section-title">Menunggu Diproses</div>
      {pending.length === 0 ? (
        <EmptyState icon={<ClipboardList size={30} />} title="Tidak ada permintaan" desc="Semua permintaan wadah dari kantin sudah diproses." />
      ) : (
        <div className="wc-list">
          {pending.map(r => (
            <div className="wc-card" key={r.id}>
              <div className="wc-card-row">
                <div className="wc-card-icon tone-gold"><Store size={16} /></div>
                <div className="wc-grow">
                  <div className="wc-card-title">{r.kantin}</div>
                  <div className="wc-card-sub">Minta {r.qty} wadah &middot; {relTime(r.createdAt)}</div>
                </div>
              </div>
              <button className="wc-btn-primary wc-full" onClick={() => fulfill(r.id)}><Check size={15} /> Penuhi Permintaan</button>
            </div>
          ))}
        </div>
      )}

      {fulfilled.length > 0 && (
        <>
          <div className="wc-section-title">Riwayat Dipenuhi</div>
          <div className="wc-list">
            {fulfilled.map(r => (
              <div className="wc-list-item faded" key={r.id}>
                <div className="wc-list-icon"><Check size={15} /></div>
                <div className="wc-grow">
                  <div className="wc-list-title">{r.kantin}</div>
                  <div className="wc-list-sub">{r.qty} wadah &middot; {fmtDateShort(r.fulfilledAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AdminDampak({ state }) {
  const impact = computeImpact(state.containers);
  const perKantin = KANTIN_LIST.map(k => {
    const cs = state.containers.filter(c => c.kantinAsal === k);
    return { kantin: k, ...computeImpact(cs) };
  });

  return (
    <div className="wc-screen">
      <div className="wc-impact-hero">
        <Leaf size={26} />
        <div className="wc-impact-hero-value">{impact.plasticKg.toFixed(1)} kg</div>
        <div className="wc-impact-hero-label">sampah plastik sekali pakai dihindari</div>
      </div>
      <div className="wc-statrow">
        <StatCard label="Biaya Dihemat" value={fmtRupiah(impact.costSaved)} icon={<Sparkles size={16} />} />
        <StatCard label="CO\u2082 Diturunkan" value={`${impact.co2Kg.toFixed(1)} kg`} icon={<Leaf size={16} />} />
      </div>

      <div className="wc-section-title">Dampak per Kantin</div>
      <div className="wc-list">
        {perKantin.map(p => (
          <div className="wc-list-item" key={p.kantin}>
            <div className="wc-list-icon"><Store size={15} /></div>
            <div className="wc-grow">
              <div className="wc-list-title">{p.kantin}</div>
              <div className="wc-list-sub">{p.totalCycles} siklus &middot; {p.plasticKg.toFixed(1)} kg plastik dihindari</div>
            </div>
          </div>
        ))}
      </div>
      <div className="wc-note">*Estimasi berdasarkan asumsi 15g plastik, Rp500 biaya kemasan, dan 50g CO\u2082 per siklus wadah. Angka dapat berbeda sesuai kondisi nyata.</div>
    </div>
  );
}

/* =========================================================================
   SPLASH & STYLES
   ========================================================================= */

function SplashScreen() {
  return (
    <div className="wc-outer">
      <GlobalStyles />
      <div className="wc-splash">
        <div className="wc-splash-icon"><Leaf size={30} /></div>
        <div className="wc-splash-title">WARAS CAMPUS</div>
        <div className="wc-splash-sub">Menyiapkan sistem wadah pakai ulang...</div>
      </div>
    </div>
  );
}

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');

      .wc-outer, .wc-outer * { box-sizing: border-box; }
      .wc-outer {
        --forest-950:#10261B; --forest-800:#1B3B2A; --forest-700:#234A34; --forest-600:#2F5E42; --forest-500:#3E7550;
        --sage-300:#A9C39F; --sage-200:#C9DCC2;
        --cream-100:#F7F2E7; --cream-50:#FCFAF3;
        --tan-300:#DCC49C;
        --gold-500:#C9A227; --gold-100:#F3E7BE;
        --teal-500:#4C8C7D; --slate-400:#8B98A6;
        --red-500:#C1443C;
        --ink-900:#1B2620; --ink-600:#4B5A50; --ink-400:#6B7A70;
        width:100%; min-height:100vh; display:flex; align-items:center; justify-content:center;
        padding:28px 16px; font-family:'Inter',system-ui,sans-serif;
        background: radial-gradient(circle at 30% 20%, var(--forest-700), var(--forest-950) 70%);
        position:relative;
      }
      .wc-phone {
        width:100%; max-width:420px; height:860px; max-height:92vh;
        background:var(--cream-100); border-radius:38px; overflow:hidden;
        box-shadow: 0 30px 80px rgba(0,0,0,0.45), 0 0 0 8px #0000001a;
        display:flex; flex-direction:column; position:relative;
      }
      @media (max-width:480px) {
        .wc-outer { padding:0; }
        .wc-phone { max-width:100%; height:100vh; max-height:100vh; border-radius:0; box-shadow:none; }
      }

      .wc-protobar { display:flex; gap:4px; padding:8px 10px; background:var(--forest-950); flex-shrink:0; }
      .wc-proto-btn { flex:1; border:none; background:transparent; color:#ffffff80; font-family:'Inter'; font-size:11px; font-weight:600;
        padding:7px 4px; border-radius:8px; cursor:pointer; transition:.15s; }
      .wc-proto-btn.active { background:var(--forest-700); color:#fff; }

      .wc-role { display:flex; flex-direction:column; height:100%; min-height:0; }
      .wc-topbar { display:flex; align-items:center; justify-content:space-between; padding:14px 18px 12px; background:var(--forest-950); flex-shrink:0; }
      .wc-topbar-id { display:flex; align-items:center; gap:10px; }
      .wc-topbar-icon { width:32px; height:32px; border-radius:10px; background:var(--forest-700); color:var(--gold-100); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
      .wc-topbar-title { font-family:'Poppins'; font-weight:700; font-size:14.5px; color:#fff; letter-spacing:.2px; }
      .wc-topbar-subtitle { font-size:11.5px; color:#ffffffaa; margin-top:1px; }
      .wc-linkbtn { background:none; border:none; color:var(--gold-100); font-size:12px; font-weight:600; cursor:pointer; padding:4px; }

      .wc-tabcontent { flex:1; min-height:0; overflow-y:auto; -webkit-overflow-scrolling:touch; }
      .wc-screen { padding:16px 16px 24px; display:flex; flex-direction:column; gap:14px; animation: wc-fadein .25s ease; }
      @media (prefers-reduced-motion: reduce) { .wc-screen { animation:none; } }
      @keyframes wc-fadein { from{opacity:0; transform:translateY(4px);} to{opacity:1; transform:none;} }

      .wc-bottomnav { display:flex; border-top:1px solid #1b262014; background:var(--cream-50); flex-shrink:0; padding-bottom:4px; }
      .wc-navbtn { flex:1; display:flex; flex-direction:column; align-items:center; gap:3px; padding:9px 2px 7px; background:none; border:none; cursor:pointer; color:var(--ink-400); }
      .wc-navbtn.active { color:var(--forest-600); }
      .wc-navicon-wrap { position:relative; }
      .wc-navbadge { position:absolute; top:-5px; right:-8px; background:var(--gold-500); color:#fff; font-size:9px; font-weight:700; border-radius:8px; min-width:15px; height:15px; display:flex; align-items:center; justify-content:center; padding:0 3px; }
      .wc-navlabel { font-size:9.5px; font-weight:600; }

      h2 { font-family:'Poppins'; font-weight:700; color:var(--ink-900); margin:14px 0 4px; font-size:19px; }
      p { color:var(--ink-600); font-size:13.5px; line-height:1.5; margin:0 0 14px; }

      .wc-gate { display:flex; flex-direction:column; align-items:center; text-align:center; padding:60px 26px; height:100%; justify-content:center; }
      .wc-gate-icon { width:64px; height:64px; border-radius:20px; background:var(--forest-800); color:var(--gold-100); display:flex; align-items:center; justify-content:center; margin-bottom:6px; }
      .wc-gate-btn { margin-top:10px; width:100%; }

      .wc-input { width:100%; border:1.5px solid #1b262022; background:#fff; border-radius:12px; padding:11px 13px; font-size:14px; font-family:'Inter'; color:var(--ink-900); outline:none; }
      .wc-input:focus { border-color:var(--forest-500); }

      .wc-btn-primary, .wc-btn-secondary, .wc-btn-ghost, .wc-btn-danger, .wc-btn-danger-outline {
        display:flex; align-items:center; justify-content:center; gap:7px; font-family:'Inter'; font-weight:700; font-size:13.5px;
        border-radius:13px; padding:12px 16px; cursor:pointer; border:none; transition:.15s;
      }
      .wc-btn-primary { background:var(--forest-600); color:#fff; }
      .wc-btn-primary:hover { background:var(--forest-700); }
      .wc-btn-primary:disabled { background:#1b262022; color:#ffffff00; cursor:not-allowed; opacity:.5; }
      .wc-btn-secondary { background:var(--gold-100); color:var(--forest-800); }
      .wc-btn-ghost { background:transparent; color:var(--ink-600); border:1.5px solid #1b262022; }
      .wc-btn-danger { background:var(--red-500); color:#fff; }
      .wc-btn-danger-outline { background:transparent; color:var(--red-500); border:1.5px solid #C1443C33; }
      .wc-full { width:100%; }

      .wc-banner { background:linear-gradient(135deg, var(--forest-700), var(--forest-950)); border-radius:20px; padding:20px; position:relative; overflow:hidden; }
      .wc-banner-eyebrow { display:flex; align-items:center; gap:6px; color:var(--sage-200); font-size:11px; font-weight:600; margin-bottom:8px; }
      .wc-banner-title { font-family:'Poppins'; font-weight:700; color:#fff; font-size:19px; line-height:1.3; margin-bottom:14px; }
      .wc-btn-onbanner { display:inline-flex; align-items:center; gap:7px; background:var(--gold-500); color:#fff; border:none; border-radius:12px; padding:11px 16px; font-weight:700; font-size:13px; cursor:pointer; }

      .wc-statrow { display:flex; gap:9px; }
      .wc-statcard { flex:1; background:#fff; border-radius:14px; padding:12px 10px; text-align:center; box-shadow:0 1px 3px #1b262010; }
      .wc-statcard-icon { color:var(--forest-600); display:flex; justify-content:center; margin-bottom:4px; }
      .wc-statcard-value { font-family:'Poppins'; font-weight:700; font-size:16px; color:var(--ink-900); }
      .wc-statcard-label { font-size:9.5px; color:var(--ink-400); margin-top:2px; font-weight:600; }

      .wc-section-title { font-family:'Poppins'; font-weight:700; font-size:13.5px; color:var(--ink-900); margin-top:4px; }

      .wc-steps { display:flex; flex-direction:column; gap:8px; }
      .wc-step { display:flex; align-items:center; gap:10px; background:#fff; border-radius:12px; padding:10px 12px; }
      .wc-step-icon { width:30px; height:30px; border-radius:9px; background:var(--sage-200); color:var(--forest-800); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
      .wc-step-label { font-size:12.5px; color:var(--ink-600); font-weight:500; }

      .wc-list { display:flex; flex-direction:column; gap:8px; }
      .wc-list-item { display:flex; align-items:center; gap:10px; background:#fff; border-radius:13px; padding:11px 12px; }
      .wc-list-item.faded { opacity:.55; }
      .wc-list-icon { width:30px; height:30px; border-radius:9px; background:var(--cream-100); color:var(--forest-700); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
      .wc-list-title { font-size:12.5px; font-weight:700; color:var(--ink-900); }
      .wc-list-sub { font-size:11px; color:var(--ink-400); margin-top:1px; }
      .wc-grow { flex:1; min-width:0; }
      .wc-muted { color:var(--ink-400); flex-shrink:0; }
      .wc-accent { color:var(--forest-600); flex-shrink:0; }

      .wc-card { background:#fff; border-radius:15px; padding:14px; display:flex; flex-direction:column; gap:10px; box-shadow:0 1px 3px #1b262010; }
      .wc-clickable { cursor:pointer; }
      .wc-card-row { display:flex; align-items:center; gap:10px; }
      .wc-card-icon { width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
      .wc-card-icon.tone-green { background:var(--sage-200); color:var(--forest-800); }
      .wc-card-icon.tone-gold { background:var(--gold-100); color:#8a6d10; }
      .wc-card-title { font-size:13.5px; font-weight:700; color:var(--ink-900); display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
      .wc-card-sub { font-size:11.5px; color:var(--ink-400); margin-top:2px; }
      .wc-card-desc { font-size:12px; color:var(--ink-600); line-height:1.5; }

      .wc-badge { font-size:9.5px; font-weight:700; padding:3px 8px; border-radius:20px; display:inline-block; }
      .tone-green.wc-badge { background:#E4EFDF; color:#2F5E42; }
      .tone-gold.wc-badge { background:var(--gold-100); color:#8a6d10; }
      .tone-slate.wc-badge { background:#E8EBED; color:#5b6b76; }
      .tone-teal.wc-badge { background:#DCEEEA; color:#2f6154; }
      .wc-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; }
      .wc-dot.tone-green { background:#3E7550; }
      .wc-dot.tone-gold { background:var(--gold-500); }
      .wc-dot.tone-slate { background:var(--slate-400); }
      .wc-dot.tone-teal { background:var(--teal-500); }

      .wc-empty { display:flex; flex-direction:column; align-items:center; text-align:center; padding:32px 16px; gap:8px; color:var(--ink-400); }
      .wc-empty-icon { color:var(--sage-300); }
      .wc-empty-title { font-weight:700; color:var(--ink-600); font-size:13.5px; }
      .wc-empty-desc { font-size:12px; max-width:240px; }

      .wc-segmented { display:flex; background:#1b262012; border-radius:12px; padding:3px; }
      .wc-segmented-btn { flex:1; border:none; background:transparent; padding:9px 4px; border-radius:9px; font-size:12.5px; font-weight:700; color:var(--ink-600); cursor:pointer; }
      .wc-segmented-btn.active { background:#fff; color:var(--forest-700); box-shadow:0 1px 3px #1b262020; }

      .wc-choicelist { display:flex; flex-direction:column; gap:8px; }
      .wc-choice { display:flex; align-items:center; gap:10px; background:#fff; border:1.5px solid transparent; border-radius:13px; padding:12px; cursor:pointer; text-align:left; width:100%; }
      .wc-choice:disabled { opacity:.4; cursor:not-allowed; }
      .wc-choice.selected { border-color:var(--forest-500); }
      .wc-choice-icon { width:30px; height:30px; border-radius:9px; background:var(--cream-100); color:var(--forest-700); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
      .wc-choice-title { font-size:13px; font-weight:700; color:var(--ink-900); }
      .wc-choice-sub { font-size:11px; color:var(--ink-400); margin-top:1px; }

      .wc-back { align-self:flex-start; display:flex; align-items:center; gap:2px; padding:0; color:var(--forest-600); }

      .wc-scanner { display:flex; flex-direction:column; align-items:center; gap:10px; }
      .wc-scanner-view { width:100%; aspect-ratio:1/1; max-width:260px; border-radius:20px; background:#0d1a13; position:relative; overflow:hidden; }
      .wc-scanner-video, .wc-scanner-fallback { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
      .wc-scanner-fallback { background: repeating-linear-gradient(45deg, #14261c, #14261c 10px, #0f1e16 10px, #0f1e16 20px); }
      .wc-scanner-dim { position:absolute; inset:0; background:radial-gradient(circle, transparent 40%, rgba(0,0,0,0.55) 100%); }
      .wc-scanner-frame { position:absolute; top:18%; left:18%; right:18%; bottom:18%; }
      .wc-scanner-frame .corner { position:absolute; width:22px; height:22px; border:3px solid var(--gold-500); }
      .corner.tl { top:0; left:0; border-right:none; border-bottom:none; border-radius:8px 0 0 0; }
      .corner.tr { top:0; right:0; border-left:none; border-bottom:none; border-radius:0 8px 0 0; }
      .corner.bl { bottom:0; left:0; border-right:none; border-top:none; border-radius:0 0 0 8px; }
      .corner.br { bottom:0; right:0; border-left:none; border-top:none; border-radius:0 0 8px 0; }
      .wc-scanline { position:absolute; left:2%; right:2%; height:2px; background:var(--gold-500); box-shadow:0 0 8px var(--gold-500); animation:wc-scan 1.6s ease-in-out infinite; }
      @keyframes wc-scan { 0%{top:4%;} 50%{top:94%;} 100%{top:4%;} }
      @media (prefers-reduced-motion: reduce) { .wc-scanline { animation:none; top:50%; } }
      .wc-scanner-status { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; color:var(--ink-600); }
      .wc-spin { animation: wc-spin 1s linear infinite; }
      @keyframes wc-spin { to { transform:rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) { .wc-spin { animation:none; } }
      .wc-scanner-subtitle { font-size:11.5px; color:var(--ink-400); text-align:center; max-width:260px; }
      .wc-scanner-btn { width:100%; max-width:260px; }
      .wc-scanner-manual-link { font-size:11.5px; }
      .wc-scanner-manual { width:100%; max-width:260px; display:flex; gap:8px; }
      .wc-scanner-manual .wc-input { flex:1; }

      .wc-confirm { display:flex; flex-direction:column; align-items:center; text-align:center; gap:6px; padding:10px 0; }
      .wc-confirm-icon { width:52px; height:52px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:4px; }
      .wc-confirm-icon.tone-green { background:#E4EFDF; color:#2F5E42; }
      .wc-confirm-title { font-family:'Poppins'; font-weight:700; font-size:15px; color:var(--ink-900); }
      .wc-qr-wrap { margin:8px 0; padding:10px; background:#fff; border-radius:16px; box-shadow:0 1px 4px #1b262015; }
      .wc-qr-wrap.small { padding:6px; border-radius:12px; flex-shrink:0; }
      .wc-confirm-code { font-family:'Poppins'; font-weight:700; font-size:16px; letter-spacing:.5px; color:var(--ink-900); }
      .wc-confirm-sub { font-size:12px; color:var(--ink-400); margin-bottom:10px; }
      .wc-confirm-btn { width:100%; }

      .wc-inline-form { display:flex; gap:8px; }
      .wc-inline-form .wc-input { flex:1; }

      .wc-chiprow { display:flex; gap:6px; overflow-x:auto; padding-bottom:2px; }
      .wc-chip { flex-shrink:0; background:#fff; border:1.5px solid #1b262018; border-radius:20px; padding:6px 13px; font-size:11.5px; font-weight:600; color:var(--ink-600); cursor:pointer; }
      .wc-chip.active { background:var(--forest-600); border-color:var(--forest-600); color:#fff; }

      .wc-statusbars { display:flex; flex-direction:column; gap:9px; background:#fff; border-radius:14px; padding:12px 14px; }
      .wc-statusbar-row { display:flex; align-items:center; gap:9px; }
      .wc-statusbar-label { flex:1; font-size:12px; font-weight:600; color:var(--ink-600); }
      .wc-statusbar-value { font-weight:700; font-size:12.5px; color:var(--ink-900); }

      .wc-chart-card { background:#fff; border-radius:14px; padding:10px 6px 4px; }

      .wc-package { text-align:left; background:#fff; border:1.5px solid transparent; border-radius:14px; padding:13px; cursor:pointer; }
      .wc-package.active { border-color:var(--forest-500); background:#F4F8F2; }
      .wc-package-row { display:flex; justify-content:space-between; align-items:center; }
      .wc-package-title { font-weight:700; font-size:13.5px; color:var(--ink-900); }
      .wc-package-sub { font-size:11.5px; color:var(--ink-400); margin-top:2px; }
      .wc-package-price { font-family:'Poppins'; font-weight:700; font-size:13.5px; color:var(--forest-700); text-align:right; }
      .wc-package-price span { display:block; font-size:9px; font-weight:500; color:var(--ink-400); }
      .wc-package-active-tag { display:flex; align-items:center; gap:4px; margin-top:8px; font-size:11px; font-weight:700; color:var(--forest-600); }

      .wc-note { font-size:10.5px; color:var(--ink-400); line-height:1.5; padding:0 2px; }

      .wc-levelcard { gap:12px; }
      .wc-progress-wrap { display:flex; flex-direction:column; gap:5px; }
      .wc-progress-track { height:7px; background:#1b262014; border-radius:6px; overflow:hidden; }
      .wc-progress-fill { height:100%; background:var(--gold-500); border-radius:6px; }
      .wc-progress-label { font-size:10.5px; color:var(--ink-400); font-weight:600; }

      .wc-profile-hero { display:flex; flex-direction:column; align-items:center; padding:18px 0 6px; gap:4px; }
      .wc-profile-avatar { width:58px; height:58px; border-radius:50%; background:var(--forest-800); color:var(--gold-100); display:flex; align-items:center; justify-content:center; }
      .wc-profile-name { font-family:'Poppins'; font-weight:700; font-size:16px; color:var(--ink-900); margin-top:4px; }
      .wc-profile-sub { font-size:11.5px; color:var(--ink-400); font-weight:600; }

      .wc-impact-hero { display:flex; flex-direction:column; align-items:center; text-align:center; gap:4px; background:linear-gradient(135deg,var(--forest-700),var(--forest-950)); border-radius:18px; padding:24px 16px; color:#fff; }
      .wc-impact-hero-value { font-family:'Poppins'; font-weight:800; font-size:26px; margin-top:4px; }
      .wc-impact-hero-label { font-size:12px; color:var(--sage-200); max-width:220px; }

      .wc-modal-backdrop { position:absolute; inset:0; background:rgba(16,38,27,0.55); display:flex; align-items:center; justify-content:center; padding:24px; z-index:50; }
      .wc-modal { background:#fff; border-radius:18px; padding:20px; width:100%; max-width:300px; }
      .wc-modal-title { font-family:'Poppins'; font-weight:700; font-size:15px; color:var(--ink-900); margin-bottom:6px; }
      .wc-modal-desc { font-size:12.5px; color:var(--ink-600); line-height:1.5; margin-bottom:16px; }
      .wc-modal-actions { display:flex; gap:8px; justify-content:flex-end; }
      .wc-modal-actions .wc-btn-ghost, .wc-modal-actions .wc-btn-primary, .wc-modal-actions .wc-btn-danger { padding:9px 14px; font-size:12.5px; }

      .wc-toast { position:absolute; top:14px; left:14px; right:14px; background:var(--ink-900); color:#fff; padding:12px 16px; border-radius:13px; font-size:12.5px; font-weight:600; text-align:center; z-index:60; box-shadow:0 8px 20px rgba(0,0,0,0.3); animation: wc-toastin .2s ease; }
      .wc-toast.error { background:var(--red-500); }
      @keyframes wc-toastin { from{opacity:0; transform:translateY(-8px);} to{opacity:1; transform:none;} }

      .wc-splash { display:flex; flex-direction:column; align-items:center; gap:8px; color:#fff; }
      .wc-splash-icon { width:60px; height:60px; border-radius:18px; background:var(--forest-700); display:flex; align-items:center; justify-content:center; margin-bottom:6px; }
      .wc-splash-title { font-family:'Poppins'; font-weight:800; font-size:20px; letter-spacing:1px; }
      .wc-splash-sub { font-size:12px; color:#ffffffaa; }
    `}</style>
  );
}

/* =========================================================================
   ROOT APP
   ========================================================================= */

export default function App() {
  const [state, setState] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [role, setRole] = useState('mahasiswa');
  const [studentProfile, setStudentProfileState] = useState(null);
  const [kantinProfile, setKantinProfileState] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      let core = null;
      try {
        const res = await window.storage.get(CORE_KEY, true);
        core = res ? JSON.parse(res.value) : null;
      } catch (e) { core = null; }
      if (!core) {
        core = seedState();
        try { await window.storage.set(CORE_KEY, JSON.stringify(core), true); } catch (e) { /* best effort */ }
      }
      let sp = null, kp = null;
      try { const r = await window.storage.get(STUDENT_KEY, false); sp = r ? JSON.parse(r.value) : null; } catch (e) { sp = null; }
      try { const r = await window.storage.get(KANTIN_KEY, false); kp = r ? JSON.parse(r.value) : null; } catch (e) { kp = null; }
      if (!cancelled) {
        setState(core); setStudentProfileState(sp); setKantinProfileState(kp); setLoaded(true);
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  const updateState = useCallback((updater) => {
    setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      window.storage.set(CORE_KEY, JSON.stringify(next), true).catch(() => {});
      return next;
    });
  }, []);

  const setStudentProfile = useCallback((p) => {
    setStudentProfileState(p);
    window.storage.set(STUDENT_KEY, JSON.stringify(p), false).catch(() => {});
  }, []);

  const setKantinProfile = useCallback((p) => {
    setKantinProfileState(p);
    window.storage.set(KANTIN_KEY, JSON.stringify(p), false).catch(() => {});
  }, []);

  if (!loaded || !state) return <SplashScreen />;

  return (
    <div className="wc-outer">
      <GlobalStyles />
      <div className="wc-phone">
        <div className="wc-protobar">
          {[
            { id: 'mahasiswa', label: 'Mahasiswa' },
            { id: 'kantin', label: 'Kantin' },
            { id: 'admin', label: 'Tim WARAS' },
          ].map(r => (
            <button key={r.id} className={`wc-proto-btn ${role === r.id ? 'active' : ''}`} onClick={() => setRole(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
        {role === 'mahasiswa' && (
          <MahasiswaApp state={state} updateState={updateState} profile={studentProfile} setProfile={setStudentProfile} showToast={showToast} />
        )}
        {role === 'kantin' && (
          <KantinApp state={state} updateState={updateState} profile={kantinProfile} setProfile={setKantinProfile} showToast={showToast} />
        )}
        {role === 'admin' && (
          <AdminApp state={state} updateState={updateState} showToast={showToast} />
        )}
        {toast && <div className={`wc-toast ${toast.type}`}>{toast.message}</div>}
      </div>
    </div>
  );
}
