import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import {
  Atom, BarChart3, Bell, BookOpen, BrainCircuit, Check, CheckCircle2, ChevronDown,
  ChevronLeft, Circle, CircleDot, ClipboardCheck, Command, GitBranch, GraduationCap,
  Hand, HelpCircle, LibraryBig, Lightbulb, Link2, Menu, MousePointer2, Network, PanelRightClose,
  Play, Plus, Redo2, RotateCcw, Save, Search, Share2, Sparkles, Trash2,
  TrendingUp, Trophy, Undo2, X, ZoomIn, ZoomOut,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { chromaticColoring, completeGraph, conjectures, graphAnalysis, initialGraph, triangleGraph } from './graph'
import type { Graph } from './graph'
import Library from './Library'

const fa = (n: number) => n.toLocaleString('fa-IR')
type Tool = 'select' | 'vertex' | 'edge' | 'delete'
type Modal = 'ramsey' | 'notes' | 'help' | 'lessons' | null
type View = 'lab' | 'library'

function Logo() {
  return <div className="brand"><div className="brand-mark"><Network size={26} strokeWidth={2.2} /></div><div><strong>تَرکیب</strong><span>آزمایشگاه ترکیبیات</span></div></div>
}

function Sidebar({ onModal, open, setOpen, view, onView }: { onModal: (m: Modal) => void; open: boolean; setOpen: (v: boolean) => void; view: View; onView: (v: View) => void }) {
  const nav = (label: string, Icon: LucideIcon, action?: () => void, active = false, badge?: string) => (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={action}><Icon size={19} /><span>{label}</span>{badge && <em>{badge}</em>}</button>
  )
  return <>
    {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? 'mobile-open' : ''}`}>
      <div className="sidebar-top"><Logo /><button className="sidebar-close" onClick={() => setOpen(false)}><PanelRightClose size={20} /></button></div>
      <div className="nav-label">فضای کاری</div>
      <nav>
        {nav('آزمایشگاه گراف', Network, () => { onView('lab'); window.scrollTo({ top: 0, behavior: 'smooth' }); setOpen(false) }, view === 'lab')}
        {nav('جزوهٔ دانشگاه', LibraryBig, () => { onView('library'); window.scrollTo({ top: 0, behavior: 'smooth' }); setOpen(false) }, view === 'library', 'PDF')}
        {nav('مسیر یادگیری', GraduationCap, () => onModal('lessons'), false, '۳')}
        {nav('چالش‌های ترکیبیات', Trophy, () => onModal('ramsey'))}
        {nav('یادداشت‌های من', BookOpen, () => onModal('notes'))}
      </nav>
      <div className="nav-label second">کشف و بررسی</div>
      <nav>
        {nav('حدس‌ساز', BrainCircuit, () => { document.getElementById('conjecture')?.scrollIntoView({ behavior: 'smooth' }); setOpen(false) })}
        {nav('اشیاء ترکیبیاتی', Atom, () => onModal('lessons'), false, 'به‌زودی')}
      </nav>
      <div className="sidebar-spacer" />
      <div className="weekly-card">
        <div className="weekly-icon"><TrendingUp size={19} /></div>
        <strong>پیشرفت این هفته</strong>
        <p>۲ آزمایش از ۵ آزمایش</p>
        <div className="progress-track"><i /></div>
        <span>۴۰٪ تکمیل شده</span>
      </div>
      <button className="profile"><div className="avatar">ک</div><div><strong>کاوشگر ترکیبیات</strong><span>سطح: کشف‌گر</span></div><ChevronDown size={16} /></button>
    </aside>
  </>
}

function Topbar({ onMenu, onModal, onToast, view }: { onMenu: () => void; onModal: (m: Modal) => void; onToast: (s: string) => void; view: View }) {
  const [searchOpen, setSearchOpen] = useState(false)
  return <header className="topbar">
    <button className="mobile-menu icon-btn" onClick={onMenu}><Menu size={21} /></button>
    <div className="breadcrumb"><span>فضای کاری</span><ChevronLeft size={14} /><strong>{view === 'lab' ? 'آزمایشگاه گراف' : 'کتابخانهٔ ترکیبیات'}</strong></div>
    <div className="top-actions">
      <button className="search-box" onClick={() => setSearchOpen(!searchOpen)}><Search size={17} /><span>جست‌وجو در ترکیب...</span><kbd><Command size={12} /> K</kbd></button>
      <button className="icon-btn help-top" onClick={() => onModal('help')}><HelpCircle size={19} /></button>
      <button className="icon-btn notification" onClick={() => onToast('همه‌چیز به‌روز است؛ اعلان جدیدی ندارید.')}><Bell size={19} /><i /></button>
      <span className="date">دوشنبه، ۱۹ آبان</span>
    </div>
    {searchOpen && <div className="search-popover"><Search size={18} /><input autoFocus placeholder="مثلاً: درخت، Ramsey..." onKeyDown={e => { if (e.key === 'Enter') { onModal('lessons'); setSearchOpen(false) } }} /><button onClick={() => setSearchOpen(false)}><X size={17} /></button></div>}
  </header>
}

function StatCard({ icon: Icon, label, value, note, tone }: { icon: LucideIcon; label: string; value: number; note: string; tone: string }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={21} /></div><div><span>{label}</span><strong>{fa(value)}</strong></div><small>{note}</small></div>
}

function GraphCanvas({ graph, setGraph, tool, setTool, onToast, pushHistory, undo, redo, canUndo, canRedo }: {
  graph: Graph; setGraph: (g: Graph) => void; tool: Tool; setTool: (t: Tool) => void;
  onToast: (s: string) => void; pushHistory: (g: Graph) => void; undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [dragging, setDragging] = useState<number | null>(null)
  const [zoom, setZoom] = useState(1)
  const [showDegrees, setShowDegrees] = useState(false)
  const analysis = graphAnalysis(graph)
  const colors = ['#26745f', '#9a5ee8', '#df7b39', '#dc5c6b', '#3b75d9', '#b49524']
  const coloring = chromaticColoring(graph)
  const vertexColor = (id: number) => colors[coloring.get(id) ?? 0]
  const point = (e: ReactPointerEvent<SVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect()
    return { x: (e.clientX - rect.left) * 700 / rect.width, y: (e.clientY - rect.top) * 410 / rect.height }
  }
  const canvasDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (tool !== 'vertex' || e.target !== svgRef.current) return
    const p = point(e)
    const id = Math.max(0, ...graph.vertices.map(v => v.id)) + 1
    pushHistory(graph)
    setGraph({ ...graph, vertices: [...graph.vertices, { id, x: p.x / zoom + 350 * (1 - 1 / zoom), y: p.y / zoom + 205 * (1 - 1 / zoom) }] })
    onToast(`رأس ${fa(id)} اضافه شد`)
  }
  const vertexDown = (e: ReactPointerEvent<SVGGElement>, id: number) => {
    e.stopPropagation()
    if (tool === 'delete') {
      pushHistory(graph)
      setGraph({ vertices: graph.vertices.filter(v => v.id !== id), edges: graph.edges.filter(edge => edge.a !== id && edge.b !== id) })
      onToast('رأس و یال‌های متصل حذف شدند'); return
    }
    if (tool === 'edge') {
      if (selected === null) { setSelected(id); onToast('حالا رأس دوم را انتخاب کنید') }
      else if (selected === id) setSelected(null)
      else {
        if (graph.edges.some(edge => (edge.a === selected && edge.b === id) || (edge.b === selected && edge.a === id))) onToast('این یال از قبل وجود دارد')
        else {
          pushHistory(graph)
          setGraph({ ...graph, edges: [...graph.edges, { id: Math.max(0, ...graph.edges.map(edge => edge.id)) + 1, a: selected, b: id }] })
          onToast(`یال ${fa(selected)}–${fa(id)} اضافه شد`)
        }
        setSelected(null)
      }
      return
    }
    if (tool === 'select') { setDragging(id); e.currentTarget.setPointerCapture(e.pointerId) }
  }
  const vertexMove = (e: ReactPointerEvent<SVGGElement>, id: number) => {
    if (dragging !== id) return
    const p = point(e)
    setGraph({ ...graph, vertices: graph.vertices.map(v => v.id === id ? { ...v, x: Math.max(32, Math.min(668, p.x / zoom + 350 * (1 - 1 / zoom))), y: Math.max(32, Math.min(378, p.y / zoom + 205 * (1 - 1 / zoom))) } : v) })
  }
  const deleteEdge = (id: number) => {
    if (tool !== 'delete') return
    pushHistory(graph)
    setGraph({ ...graph, edges: graph.edges.filter(e => e.id !== id) })
    onToast('یال حذف شد')
  }
  const tools: { id: Tool; icon: LucideIcon; label: string }[] = [
    { id: 'select', icon: MousePointer2, label: 'جابه‌جایی' }, { id: 'vertex', icon: CircleDot, label: 'افزودن رأس' },
    { id: 'edge', icon: Link2, label: 'افزودن یال' }, { id: 'delete', icon: Trash2, label: 'حذف' },
  ]
  return <section className="canvas-card">
    <div className="card-head canvas-head"><div><Network size={19} /><h2>بوم گراف</h2><span className="live-badge"><i /> زنده</span></div><div className="history-actions"><button disabled={!canUndo} onClick={undo} title="واگرد"><Undo2 size={17} /></button><button disabled={!canRedo} onClick={redo} title="ازنو"><Redo2 size={17} /></button></div></div>
    <div className="graph-toolbar">{tools.map(({ id, icon: Icon, label }) => <button key={id} className={tool === id ? 'selected' : ''} onClick={() => { setTool(id); setSelected(null) }} title={label}><Icon size={17} /><span>{label}</span></button>)}<span className="toolbar-separator" /><button className={showDegrees ? 'selected compact' : 'compact'} onClick={() => setShowDegrees(!showDegrees)} title="نمایش درجه‌ها"><BarChart3 size={17} /></button></div>
    <div className={`graph-stage tool-${tool}`}>
      <div className="stage-grid" />
      <svg ref={svgRef} viewBox="0 0 700 410" onPointerDown={canvasDown} aria-label="ویرایشگر تعاملی گراف">
        <g transform={`translate(${350 * (1 - zoom)} ${205 * (1 - zoom)}) scale(${zoom})`}>
          {graph.edges.map(edge => {
            const a = graph.vertices.find(v => v.id === edge.a)!, b = graph.vertices.find(v => v.id === edge.b)!
            return <g key={edge.id} className="edge" onPointerDown={() => deleteEdge(edge.id)}><line className="edge-hit" x1={a.x} y1={a.y} x2={b.x} y2={b.y} /><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} /></g>
          })}
          {graph.vertices.map(v => <g key={v.id} className={`vertex ${selected === v.id ? 'edge-selected' : ''}`} transform={`translate(${v.x} ${v.y})`} onPointerDown={e => vertexDown(e, v.id)} onPointerMove={e => vertexMove(e, v.id)} onPointerUp={() => { if (dragging) setDragging(null) }}>
            {selected === v.id && <circle className="selection-ring" r="29" />}<circle className="vertex-shadow" r="23" /><circle className="vertex-circle" r="22" style={{ fill: vertexColor(v.id) }} /><text className="vertex-label" textAnchor="middle" dy="6">{fa(v.id)}</text>{showDegrees && <g transform="translate(18 -20)"><circle className="degree-circle" r="11" /><text className="degree-label" textAnchor="middle" dy="4">{fa(analysis.degrees[graph.vertices.findIndex(x => x.id === v.id)])}</text></g>}
          </g>)}
        </g>
      </svg>
      {!graph.vertices.length && <div className="empty-canvas"><CircleDot size={32} /><strong>بوم خالی است</strong><span>ابزار «افزودن رأس» را انتخاب کنید و روی بوم کلیک کنید.</span></div>}
      <div className="canvas-hint"><Hand size={14} /><span>{tool === 'select' ? 'رأس‌ها را بکشید تا جابه‌جا شوند' : tool === 'vertex' ? 'روی نقطهٔ دلخواه بوم کلیک کنید' : tool === 'edge' ? (selected ? 'رأس دوم را انتخاب کنید' : 'رأس اول یال را انتخاب کنید') : 'روی رأس یا یال کلیک کنید'}</span></div>
      <div className="zoom-controls"><button onClick={() => setZoom(Math.min(1.5, zoom + .1))}><ZoomIn size={16} /></button><span>{fa(Math.round(zoom * 100))}٪</span><button onClick={() => setZoom(Math.max(.7, zoom - .1))}><ZoomOut size={16} /></button></div>
    </div>
    <div className="canvas-footer"><span><Circle size={9} fill="currentColor" /> گراف سادهٔ بدون جهت</span><button onClick={() => { setShowDegrees(!showDegrees) }}>{showDegrees ? 'پنهان‌کردن درجه‌ها' : 'نمایش درجه‌ها'}</button></div>
  </section>
}

function AnalysisPanel({ graph }: { graph: Graph }) {
  const [tab, setTab] = useState<'properties' | 'algorithm'>('properties')
  const a = graphAnalysis(graph)
  const Property = ({ label, value, good = true }: { label: string; value: string; good?: boolean }) => <div className="property"><span>{label}</span><strong className={good ? 'yes' : 'no'}>{good ? <Check size={13} /> : <X size={13} />}{value}</strong></div>
  return <section className="analysis-card">
    <div className="analysis-tabs"><button className={tab === 'properties' ? 'active' : ''} onClick={() => setTab('properties')}>ویژگی‌های گراف</button><button className={tab === 'algorithm' ? 'active' : ''} onClick={() => setTab('algorithm')}>جزئیات بیشتر</button></div>
    {tab === 'properties' ? <div className="analysis-content">
      <div className="analysis-intro"><div className="pulse-icon"><Sparkles size={20} /></div><div><strong>تحلیل لحظه‌ای</strong><span>با هر تغییر، به‌روز می‌شود</span></div></div>
      <div className="properties-list">
        <Property label="همبند" value={a.connected ? 'بله' : 'خیر'} good={a.connected} />
        <Property label="درخت" value={a.tree ? 'بله' : 'خیر'} good={a.tree} />
        <Property label="دوبخشی" value={a.bipartite ? 'بله' : 'خیر'} good={a.bipartite} />
        <Property label="مسیر اویلری" value={a.eulerPath ? 'دارد' : 'ندارد'} good={a.eulerPath} />
        <Property label="دارای دور" value={a.cycle ? 'بله' : 'خیر'} good={a.cycle} />
      </div>
      <div className="chromatic-row"><div><span>عدد رنگی</span><small>χ(G)</small></div><div className="color-dots">{Array.from({ length: a.chromatic }, (_, i) => <i key={i} className={`color-${i}`} />)}<strong>{fa(a.chromatic)}</strong></div></div>
      <div className="degree-box"><div><span>دنبالهٔ درجاتی</span><small>به ترتیب شمارهٔ رأس‌ها</small></div><div className="degree-chips">{a.degrees.map((d, i) => <span key={i}>{fa(d)}</span>)}{!a.degrees.length && <em>بدون رأس</em>}</div></div>
      <div className="handshake"><Lightbulb size={17} /><p>جمع درجه‌ها <b>{fa(a.handshake)}</b> است؛ دقیقاً دو برابر تعداد یال‌ها.</p></div>
    </div> : <div className="analysis-content algorithm-content">
      <h3>شناسنامهٔ ریاضی گراف</h3>
      <dl><div><dt>تعداد مؤلفه‌ها</dt><dd>{fa(a.components)}</dd></div><div><dt>حداقل درجه δ(G)</dt><dd>{fa(Math.min(...a.degrees, 0))}</dd></div><div><dt>حداکثر درجه Δ(G)</dt><dd>{fa(Math.max(...a.degrees, 0))}</dd></div><div><dt>دور اویلری</dt><dd>{a.eulerCircuit ? 'دارد' : 'ندارد'}</dd></div></dl>
      <div className="algorithm-note"><GitBranch size={19} /><p>برای همبندی از جست‌وجوی عمق‌اول، برای دوبخشی از رنگ‌آمیزی دوبخشی و برای عدد رنگی از عقب‌گرد استفاده شده است.</p></div>
    </div>}
  </section>
}

function ConjectureLab({ graph, setGraph, onToast }: { graph: Graph; setGraph: (g: Graph) => void; onToast: (s: string) => void }) {
  const [selected, setSelected] = useState('even')
  const [result, setResult] = useState<'idle' | 'checking' | 'pass' | 'fail'>('idle')
  const item = conjectures.find(c => c.id === selected)!
  const run = () => {
    setResult('checking')
    window.setTimeout(() => {
      const pass = item.test(graph)
      setResult(pass ? 'pass' : 'fail')
      onToast(pass ? 'حدس روی گراف فعلی برقرار است' : 'گراف فعلی یک مثال نقض است!')
    }, 650)
  }
  return <section className="conjecture-card" id="conjecture">
    <div className="section-title"><div className="title-icon purple"><BrainCircuit size={20} /></div><div><h2>حدس‌ساز</h2><p>ایده را روی گراف خودتان محک بزنید</p></div><span className="beta-badge">آزمایشی</span></div>
    <div className="conjecture-body"><label>یک حدس انتخاب کنید</label><div className="select-wrap"><select value={selected} onChange={e => { setSelected(e.target.value); setResult('idle') }}>{conjectures.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select><ChevronDown size={16} /></div><p className="conjecture-description">{item.description}</p>
      {result !== 'idle' && <div className={`conjecture-result ${result}`}>
        {result === 'checking' ? <><span className="spinner" /> در حال بررسی گراف...</> : result === 'pass' ? <><CheckCircle2 size={18} /><span>این گراف حدس را نقض نمی‌کند. یک گراف دیگر هم امتحان کنید!</span></> : <><X size={18} /><span>مثال نقض پیدا شد؛ گراف فعلی این حدس را رد می‌کند.</span></>}
      </div>}
      <div className="conjecture-actions"><button className="primary-btn" onClick={run} disabled={result === 'checking' || !graph.vertices.length}><Play size={16} fill="currentColor" /> بررسی روی گراف من</button>{selected === 'even' && <button className="text-btn" onClick={() => { setGraph(triangleGraph); setResult('idle'); onToast('گراف مثلث بارگذاری شد؛ حالا حدس را بررسی کنید.') }}>بارگذاری مثال نقض <ChevronLeft size={15} /></button>}</div>
    </div>
  </section>
}

function ChallengeCard({ onOpen }: { onOpen: () => void }) {
  return <section className="challenge-card"><div className="challenge-art"><svg viewBox="0 0 180 120">{[[90,14],[157,53],[132,119],[48,119],[23,53]].map((p, i, arr) => arr.slice(i + 1).map((q, j) => <line key={`${i}-${j}`} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={(i + j) % 3 ? '#6b887b' : '#d9f99d'} strokeWidth="1.5" />))}{[[90,14],[157,53],[132,119],[48,119],[23,53]].map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="6" fill="#d9f99d" />)}</svg></div><span className="challenge-tag"><Trophy size={13} /> چالش هفته</span><h2>یک مثلث هم‌رنگ پیدا کن!</h2><p>یال‌های K₆ را با دو رنگ رنگ کن و ببین چرا همیشه یک مثلث هم‌رنگ وجود دارد.</p><div className="challenge-bottom"><span>R(3,3) = 6</span><button onClick={onOpen}>شروع چالش <ChevronLeft size={16} /></button></div></section>
}

function RamseyModal({ onClose, onLoad }: { onClose: () => void; onLoad: () => void }) {
  const g = completeGraph(6)
  const [colors, setColors] = useState<Record<number, 'red' | 'blue'>>({ 1: 'red', 2: 'blue', 3: 'red', 4: 'blue', 5: 'red' })
  const triangles: number[][] = []
  for (let a = 1; a <= 6; a++) for (let b = a + 1; b <= 6; b++) for (let c = b + 1; c <= 6; c++) triangles.push([a, b, c])
  const mono = triangles.filter(([a, b, c]) => {
    const get = (x: number, y: number) => g.edges.find(e => (e.a === x && e.b === y) || (e.b === x && e.a === y))!
    const es = [get(a, b), get(a, c), get(b, c)]
    return es.every(e => colors[e.id]) && es.every(e => colors[e.id] === colors[es[0].id])
  })
  const uncolored = g.edges.filter(e => !colors[e.id]).length
  return <ModalShell title="چالش مثلث هم‌رنگ" subtitle="قضیهٔ Ramsey را با دست‌های خودت کشف کن" onClose={onClose}>
    <div className="ramsey-layout"><div className="ramsey-canvas"><svg viewBox="0 0 700 410">{g.edges.map(e => { const a = g.vertices[e.a - 1], b = g.vertices[e.b - 1]; return <g key={e.id} className="ramsey-edge" onClick={() => setColors({ ...colors, [e.id]: colors[e.id] === 'red' ? 'blue' : 'red' })}><line className="ramsey-hit" x1={a.x} y1={a.y} x2={b.x} y2={b.y} /><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colors[e.id] === 'red' ? '#ed6a5e' : colors[e.id] === 'blue' ? '#6488ee' : '#bdc5c0'} strokeWidth={colors[e.id] ? 4 : 2} /></g> })}{g.vertices.map(v => <g key={v.id} transform={`translate(${v.x} ${v.y})`}><circle r="22" fill="#173e33" /><text textAnchor="middle" dy="6" fill="white" fontSize="16">{fa(v.id)}</text></g>)}</svg><p>برای تغییر رنگ، روی یال‌ها کلیک کنید</p></div><div className="ramsey-info"><span className="formula">R(3,3) = 6</span><h3>آیا می‌توانی فرار کنی؟</h3><p>هر ۱۵ یال را قرمز یا آبی کن. آیا رنگ‌آمیزی بدون مثلث هم‌رنگ ممکن است؟</p><div className="ramsey-stat"><span>یال‌های بدون رنگ</span><strong>{fa(uncolored)}</strong></div><div className="ramsey-stat"><span>مثلث‌های هم‌رنگ</span><strong className={mono.length ? 'red-text' : ''}>{fa(mono.length)}</strong></div>{!uncolored && <div className={`ramsey-message ${mono.length ? 'found' : ''}`}><Lightbulb size={19} /><p>{mono.length ? 'همیشه دست‌کم یک مثلث هم‌رنگ هست! رأس دلخواهی ۵ همسایه دارد؛ لااقل ۳ یال هم‌رنگ از آن خارج می‌شوند. حالا اصل لانه‌کبوتری کار را تمام می‌کند.' : 'هنوز مثلثی پیدا نشده؛ رنگ‌ها را تغییر بده!'}</p></div>}<button className="secondary-btn full" onClick={() => setColors({})}><RotateCcw size={16} /> شروع دوباره</button><button className="text-btn centered" onClick={onLoad}>بازکردن K₆ در آزمایشگاه <ChevronLeft size={15} /></button></div></div>
  </ModalShell>
}

function ModalShell({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><div className="modal"><div className="modal-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-btn" onClick={onClose}><X size={20} /></button></div>{children}</div></div>
}

function LessonsModal({ onClose, onLoad }: { onClose: () => void; onLoad: (type: 'tree' | 'triangle' | 'complete') => void }) {
  const lessons = [
    { icon: GitBranch, title: 'درخت‌ها و قضیهٔ دست‌دادن', text: 'با ساختن یک درخت، رابطهٔ رأس‌ها و یال‌ها را کشف کن.', level: 'مقدماتی', type: 'tree' as const },
    { icon: Share2, title: 'گراف‌های دوبخشی', text: 'یک دور فرد بساز و اثرش را بر دوبخشی بودن ببین.', level: 'مقدماتی', type: 'triangle' as const },
    { icon: Trophy, title: 'ورود به نظریهٔ Ramsey', text: 'با گراف کامل ۶ رأسی و دو رنگ آزمایش کن.', level: 'المپیادی', type: 'complete' as const },
  ]
  return <ModalShell title="مسیر یادگیری" subtitle="از مثال تا اثبات؛ هر درس یک آزمایش است" onClose={onClose}><div className="lesson-list">{lessons.map(({ icon: Icon, title, text, level, type }, i) => <button className="lesson-item" key={title} onClick={() => onLoad(type)}><span className="lesson-number">{fa(i + 1)}</span><div className="lesson-icon"><Icon size={23} /></div><div><span className="lesson-level">{level}</span><h3>{title}</h3><p>{text}</p></div><ChevronLeft size={20} /></button>)}</div><div className="coming-note"><Atom size={20} /><span>آزمایش‌های اعداد Catalan و تناظرهای بصری در نسخهٔ بعد می‌آیند.</span></div></ModalShell>
}

function NotesModal({ onClose, onToast }: { onClose: () => void; onToast: (s: string) => void }) {
  const [text, setText] = useState(() => localStorage.getItem('tarkib-note') || '')
  return <ModalShell title="دفتر کشف‌های من" subtitle="حدس، الگو یا ایدهٔ اثباتت را همین‌جا بنویس" onClose={onClose}><textarea className="notes-area" value={text} onChange={e => setText(e.target.value)} placeholder="مثلاً: به نظر می‌رسد در هر درخت، حداقل دو برگ وجود دارد..." /><div className="notes-footer"><span>{fa(text.length)} نویسه · ذخیره در همین مرورگر</span><button className="primary-btn" onClick={() => { localStorage.setItem('tarkib-note', text); onToast('یادداشت در مرورگر شما ذخیره شد'); onClose() }}><Save size={16} /> ذخیره یادداشت</button></div></ModalShell>
}

function App() {
  const [graph, setGraphState] = useState<Graph>(() => {
    try { const saved = localStorage.getItem('tarkib-graph'); return saved ? JSON.parse(saved) : initialGraph } catch { return initialGraph }
  })
  const [tool, setTool] = useState<Tool>('select')
  const [view, setView] = useState<View>('lab')
  const [modal, setModal] = useState<Modal>(null)
  const [toast, setToast] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [past, setPast] = useState<Graph[]>([])
  const [future, setFuture] = useState<Graph[]>([])
  const toastTimer = useRef<number | undefined>(undefined)
  const setGraph = (g: Graph) => { setGraphState(g); setFuture([]) }
  const pushHistory = (g: Graph) => setPast(p => [...p.slice(-29), g])
  const notify = (message: string) => { setToast(message); window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToast(''), 3200) }
  const undo = () => { if (!past.length) return; setFuture(f => [graph, ...f]); setGraphState(past[past.length - 1]); setPast(p => p.slice(0, -1)) }
  const redo = () => { if (!future.length) return; setPast(p => [...p, graph]); setGraphState(future[0]); setFuture(f => f.slice(1)) }
  const a = graphAnalysis(graph)
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setModal(null); if ((e.ctrlKey || e.metaKey) && e.key === 'z') undo() }
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key)
  })
  const loadLesson = (type: 'tree' | 'triangle' | 'complete') => {
    pushHistory(graph)
    setGraph(type === 'triangle' ? triangleGraph : type === 'complete' ? completeGraph(6) : { vertices: initialGraph.vertices, edges: initialGraph.edges.filter(e => e.id !== 8 && e.id !== 6 && e.id !== 5) })
    setModal(null); notify('مثال آموزشی روی بوم بارگذاری شد')
  }
  return <div className="app-shell">
    <Sidebar onModal={setModal} open={sidebarOpen} setOpen={setSidebarOpen} view={view} onView={setView} />
    <main className="main-shell"><Topbar onMenu={() => setSidebarOpen(true)} onModal={setModal} onToast={notify} view={view} />
      <div className="content">
        {view === 'library' ? <Library onExperiment={() => setView('lab')} /> : <>
        <div className="page-heading"><div><div className="eyebrow"><span /> فضای کشف و آزمایش</div><h1>آزمایشگاه گراف</h1><p>بساز، تغییر بده و الگوهای پنهان را کشف کن.</p></div><div className="page-actions"><button className="secondary-btn" onClick={() => { pushHistory(graph); setGraph({ vertices: [], edges: [] }); notify('یک بوم تازه ساخته شد') }}><Plus size={17} /> گراف جدید</button><button className="primary-btn" onClick={() => { localStorage.setItem('tarkib-graph', JSON.stringify(graph)); notify('گراف در مرورگر شما ذخیره شد') }}><Save size={17} /> ذخیره گراف</button></div></div>
        <div className="stats-grid"><StatCard icon={CircleDot} label="تعداد رأس‌ها" value={a.n} note="n" tone="green" /><StatCard icon={Link2} label="تعداد یال‌ها" value={a.m} note="m" tone="purple" /><StatCard icon={Network} label="مؤلفه‌های همبندی" value={a.components} note={a.connected ? 'گراف همبند است' : 'گراف ناهمبند است'} tone="orange" /><StatCard icon={BarChart3} label="عدد رنگی" value={a.chromatic} note="χ(G)" tone="blue" /></div>
        <div className="workspace"><GraphCanvas graph={graph} setGraph={setGraph} tool={tool} setTool={setTool} onToast={notify} pushHistory={pushHistory} undo={undo} redo={redo} canUndo={past.length > 0} canRedo={future.length > 0} /><AnalysisPanel graph={graph} /></div>
        <div className="below-grid"><ConjectureLab graph={graph} setGraph={g => { pushHistory(graph); setGraph(g) }} onToast={notify} /><ChallengeCard onOpen={() => setModal('ramsey')} /></div>
        <footer className="page-footer"><span><Logo /> <i>جایی برای فکر کردن، نه فقط جواب دیدن.</i></span><button onClick={() => setModal('help')}>راهنمای آزمایشگاه <ChevronLeft size={14} /></button></footer>
        </>}
      </div>
    </main>
    {modal === 'ramsey' && <RamseyModal onClose={() => setModal(null)} onLoad={() => { pushHistory(graph); setGraph(completeGraph(6)); setModal(null) }} />}
    {modal === 'notes' && <NotesModal onClose={() => setModal(null)} onToast={notify} />}
    {modal === 'lessons' && <LessonsModal onClose={() => setModal(null)} onLoad={loadLesson} />}
    {modal === 'help' && <ModalShell title="چطور آزمایش کنیم؟" subtitle="ترکیب با سه قدم ساده کار می‌کند" onClose={() => setModal(null)}><div className="help-steps"><div><span>۱</span><MousePointer2 size={24} /><h3>بساز و تغییر بده</h3><p>با ابزارهای بالای بوم رأس و یال اضافه کن. در حالت جابه‌جایی می‌توانی رأس‌ها را بکشی.</p></div><div><span>۲</span><BarChart3 size={24} /><h3>الگو را ببین</h3><p>تحلیل سمت چپ با هر تغییر به‌روز می‌شود. درجه‌ها را هم می‌توانی روی گراف نمایش بدهی.</p></div><div><span>۳</span><BrainCircuit size={24} /><h3>حدس را محک بزن</h3><p>در حدس‌ساز یک ادعا انتخاب کن و گراف فعلی را به‌عنوان نمونه یا مثال نقض بررسی کن.</p></div></div><div className="help-shortcuts"><ClipboardCheck size={18} /><span>میان‌بر واگرد: Ctrl + Z · بستن پنجره‌ها: Esc</span></div></ModalShell>}
    {toast && <div className="toast"><CheckCircle2 size={19} /><span>{toast}</span><button onClick={() => setToast('')}><X size={15} /></button></div>}
  </div>
}

export default App
