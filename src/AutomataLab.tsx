import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Atom, Circle, CircleDot, Code, ChevronLeft, ChevronRight, FileText, GitBranch,
  Link2, MousePointer2, Play, RotateCcw, Save, Square, Trash2, X, ZoomIn,
  ZoomOut,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Automaton } from './automata'
import {
  minimizeDfa, nfaToDfa, regexToNfa, simulateDFA, simulateNFA,
  sampleDfaMod3A, sampleNfaEpsilon,
} from './automata'

const fa = (n: number) => n.toLocaleString('fa-IR')
type Tool = 'select' | 'state' | 'transition' | 'delete'
type View = 'lab' | 'conversion' | 'minimized' | 'regex'

function AutomatonLogo() {
  return (
    <div className="brand">
      <div className="brand-mark"><Atom size={26} strokeWidth={2.2} /></div>
      <div>
        <strong>تَرکیب</strong>
        <span>آزمایشگاه اتوماتا</span>
      </div>
    </div>
  )
}

function AutomatonCanvas({
  automaton,
  setAutomaton,
  tool,
  setTool,
  selectedState,
  setSelectedState,
  onAcceptingToggle,
  onToast,
  editable,
}: {
  automaton: Automaton
  setAutomaton: (a: Automaton) => void
  tool: Tool
  setTool: (t: Tool) => void
  selectedState: number | null
  setSelectedState: (s: number | null) => void
  onAcceptingToggle: (id: number) => void
  onToast: (s: string) => void
  editable: boolean
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState<number | null>(null)
  const [transitionSource, setTransitionSource] = useState<number | null>(null)
  const [zoom, setZoom] = useState(1)

  const point = (e: React.PointerEvent<SVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * 700 / rect.width,
      y: (e.clientY - rect.top) * 410 / rect.height,
    }
  }

  const canvasDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!editable || tool !== 'state' || e.target !== svgRef.current) return
    setTransitionSource(null)
    const p = point(e)
    const id = Math.max(0, ...automaton.states.map(s => s.id)) + 1
    setAutomaton({
      ...automaton,
      states: [...automaton.states, {
        id,
        x: p.x / zoom + 350 * (1 - 1 / zoom),
        y: p.y / zoom + 205 * (1 - 1 / zoom),
        accepting: false,
      }],
    })
    onToast(`حالت ${fa(id)} اضافه شد`)
  }

  const stateDown = (e: React.PointerEvent<SVGGElement>, id: number) => {
    e.stopPropagation()
    if (!editable) return
    if (tool === 'delete') {
      setAutomaton({
        ...automaton,
        states: automaton.states.filter(s => s.id !== id),
        transitions: automaton.transitions.filter(t => t.from !== id && t.to !== id),
      })
      setSelectedState(null)
      setTransitionSource(null)
      onToast('حذف شد')
      return
    }
    if (tool === 'transition') {
      if (transitionSource === null) {
        setTransitionSource(id)
        onToast(`مبدا: حالت ${fa(id)} — مقصد را انتخاب کنید`)
      } else if (transitionSource === id) {
        setTransitionSource(null)
      } else {
        const symbol = window.prompt('نماد گذار (a، b، یا ε برای ε-گذار):', 'a')
        if (symbol !== null) {
          setAutomaton({
            ...automaton,
            transitions: [...automaton.transitions, {
              id: Math.max(0, ...automaton.transitions.map(t => t.id)) + 1,
              from: transitionSource,
              to: id,
              symbol: symbol.trim() === '' ? 'ε' : symbol.trim(),
            }],
          })
        }
        setTransitionSource(null)
        setSelectedState(null)
      }
      return
    }
    if (tool === 'select') {
      setSelectedState(id)
      setDragging(id)
      e.currentTarget.setPointerCapture(e.pointerId)
    }
  }

  const stateMove = (e: React.PointerEvent<SVGGElement>, id: number) => {
    if (!editable || dragging !== id) return
    const p = point(e)
    setAutomaton({
      ...automaton,
      states: automaton.states.map(s =>
        s.id === id
          ? {
            ...s,
            x: Math.max(32, Math.min(668, p.x / zoom + 350 * (1 - 1 / zoom))),
            y: Math.max(32, Math.min(378, p.y / zoom + 205 * (1 - 1 / zoom))),
          }
          : s
      ),
    })
  }

  const tools: { id: Tool; icon: LucideIcon; label: string }[] = [
    { id: 'select', icon: MousePointer2, label: 'انتخاب' },
    { id: 'state', icon: CircleDot, label: 'افزودن حالت' },
    { id: 'transition', icon: Link2, label: 'افزودن گذار' },
    { id: 'delete', icon: Trash2, label: 'حذف' },
  ]

  return (
    <section className="automata-canvas-card">
      <div className="card-head">
        <div>
          <Atom size={19} />
          <h2>بوم اتوماتا</h2>
          <span className={`live-badge ${automaton.initialStateId ? '' : 'empty'}`}>
            <i />
            {automaton.initialStateId ? 'زنده' : 'حالت آغاز تعریف نشده'}
          </span>
        </div>
        <div className="history-actions">
          <button className="compact" onClick={() => setZoom(Math.min(1.5, zoom + 0.1))} title="بزرگنمایی"><ZoomIn size={16} /></button>
          <span>{fa(Math.round(zoom * 100))}٪</span>
          <button className="compact" onClick={() => setZoom(Math.max(0.7, zoom - 0.1))} title="کوچکنمایی"><ZoomOut size={16} /></button>
        </div>
      </div>
      <div className="graph-toolbar">
        {tools.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={tool === id ? 'selected' : ''}
            disabled={!editable}
            onClick={() => { setTool(id); setSelectedState(null); setTransitionSource(null) }}
            title={label}
          >
            <Icon size={17} /><span>{label}</span>
          </button>
        ))}
        <span className="toolbar-separator" />
        {transitionSource !== null && (
          <button className="compact warning" onClick={() => setTransitionSource(null)} title="لغو گذار"><X size={15} /></button>
        )}
      </div>
      <div className={`graph-stage tool-${tool}`}>
        <div className="stage-grid" />
        <svg
          ref={svgRef}
          viewBox="0 0 700 410"
          onPointerDown={canvasDown}
          aria-label="ویرایشگر تعاملی اتوماتا"
        >
          <g transform={`translate(${350 * (1 - zoom)} ${205 * (1 - zoom)}) scale(${zoom})`}>
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
              </marker>
            </defs>
            {automaton.transitions.map(t => {
              const from = automaton.states.find(s => s.id === t.from)
              const to = automaton.states.find(s => s.id === t.to)
              if (!from || !to) return null
              const isSelf = from.id === to.id
              const labelX = isSelf ? from.x - 28 : (from.x + to.x) / 2
              const labelY = isSelf ? from.y - 32 : (from.y + to.y) / 2 - 8
              return (
                <g key={t.id} className={`transition ${isSelf ? 'self-loop' : ''}`}>
                  {isSelf ? (
                    <path
                      className="transition-line"
                      d={`M ${from.x - 22} ${from.y - 22} A 22 22 0 1 1 ${from.x + 22} ${from.y - 22}`}
                      markerEnd="url(#arrowhead)"
                    />
                  ) : (
                    <line className="transition-line" x1={from.x} y1={from.y} x2={to.x} y2={to.y} markerEnd="url(#arrowhead)" />
                  )}
                  <text className="transition-label" x={labelX} y={labelY} textAnchor="middle">{t.symbol === 'ε' ? 'ε' : t.symbol}</text>
                </g>
              )
            })}
            {automaton.states.map(s => {
              const isInitial = s.id === automaton.initialStateId
              const isSelected = selectedState === s.id || transitionSource === s.id
              return (
                <g
                  key={s.id}
                  className={`state ${isSelected ? 'selected' : ''} ${isInitial ? 'initial' : ''} ${s.accepting ? 'accepting' : ''}`}
                  transform={`translate(${s.x} ${s.y})`}
                  onPointerDown={e => stateDown(e, s.id)}
                  onPointerMove={e => stateMove(e, s.id)}
                  onPointerUp={() => { if (dragging) setDragging(null) }}
                >
                  {isInitial && <path className="initial-marker" d="M -14 0 L 14 0 M -7 -4 L 0 0 L -7 4" stroke="#15803d" strokeWidth="3" fill="none" />}
                  <circle className="state-shadow" r="23" />
                  <circle className={`state-circle ${s.accepting ? 'accepting-circle' : ''}`} r="22" />
                  {s.accepting && <circle className="accepting-ring" r="26" stroke="currentColor" strokeWidth="2" fill="none" />}
                  <text className="state-label" textAnchor="middle" dy="6">{fa(s.id)}</text>
                </g>
              )
            })}
          </g>
        </svg>
        {!automaton.states.length && (
          <div className="empty-canvas">
            <CircleDot size={32} />
            <strong>بوم خالی است</strong>
            <span>ابزار «افزودن حالت» را انتخاب کنید و روی بوم کلیک کنید.</span>
          </div>
        )}
        <div className="canvas-hint">
          <MousePointer2 size={14} />
          <span>
            {tool === 'select' ? 'حالت‌ها را بکشید تا جابه‌جا شوند'
              : tool === 'state' ? 'روی نقطهٔ دلخواه بوم کلیک کنید'
              : tool === 'transition'
                ? transitionSource ? 'حالت هدف گذار را انتخاب کنید' : 'مبدا گذار را انتخاب کنید'
                : 'روی حالت یا گذار کلیک کنید'}
          </span>
        </div>
        <div className="canvas-footer">
          <span>
            <Circle size={9} fill="currentColor" />
            {'اتوماتای ' + (automaton.transitions.some(t => t.symbol === 'ε') ? 'غیرومتناهی (ε-NFA)' : 'متناهی (DFA)')}
          </span>
          {editable && selectedState !== null && (
            <button className="text-btn" onClick={() => onAcceptingToggle(selectedState)}>
              {automaton.states.find(s => s.id === selectedState)?.accepting ? 'حذف پذیرش' : 'علامت پذیرش'}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

/*─────────────────────────────────────────────────────────────────────────────
Main AutomataLab
─────────────────────────────────────────────────────────────────────────────*/

export default function AutomataLab({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<'dfa' | 'nfa'>('dfa')
  const [view, setView] = useState<View>('lab')
  const [automaton, setAutomatonState] = useState<Automaton>(sampleDfaMod3A)
  const [tool, setTool] = useState<Tool>('select')
  const [selectedState, setSelectedState] = useState<number | null>(null)
  const [inputString, setInputString] = useState('')
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [convertedDfa, setConvertedDfa] = useState<Automaton | null>(null)
  const [minimized, setMinimized] = useState<Automaton | null>(null)
  const [regexInput, setRegexInput] = useState('')
  const [regexError, setRegexError] = useState('')
  const [regexNfa, setRegexNfa] = useState<Automaton | null>(null)
  const playTimer = useRef<number | undefined>(undefined)

  const activeAutomaton = useMemo(() => {
    if (view === 'conversion' && convertedDfa) return convertedDfa
    if (view === 'minimized' && minimized) return minimized
    if (view === 'regex' && regexNfa) return regexNfa
    return automaton
  }, [view, automaton, convertedDfa, minimized, regexNfa])

  const result = useMemo(() => {
    if (!inputString) return null
    return mode === 'dfa' ? simulateDFA(activeAutomaton, inputString) : simulateNFA(activeAutomaton, inputString)
  }, [inputString, mode, activeAutomaton])

  useEffect(() => {
    setCurrentStep(0)
  }, [inputString, mode, activeAutomaton])

  const toggleAccepting = (id: number) => {
    setAutomatonState(prev => ({
      ...prev,
      states: prev.states.map(s => s.id === id ? { ...s, accepting: !s.accepting } : s),
    }))
  }

  const runSimulation = () => {
    if (!activeAutomaton.initialStateId) {
      window.alert('ابتدا یک حالت آغاز تعریف کنید')
      return
    }
    setCurrentStep(0)
    setIsPlaying(false)
  }

  const nextStep = () => {
    if (!result || currentStep >= result.steps.length - 1) return
    setCurrentStep(p => p + 1)
  }

  const prevStep = () => {
    setCurrentStep(p => Math.max(0, p - 1))
  }

  const togglePlay = () => {
    if (!result) return
    if (isPlaying) { setIsPlaying(false); return }
    setIsPlaying(true)
    playTimer.current = window.setInterval(() => {
      setCurrentStep(p => {
        if (p >= result!.steps.length - 1) { setIsPlaying(false); return p }
        return p + 1
      })
    }, 900)
  }

  const resetSim = () => {
    setCurrentStep(0)
    setIsPlaying(false)
    window.clearTimeout(playTimer.current)
  }

  const convertNfaToDfa = () => {
    const dfa = nfaToDfa(activeAutomaton)
    setConvertedDfa(dfa)
    setMinimized(null)
    setView('conversion')
  }

  const convertRegex = () => {
    if (!regexInput.trim()) {
      setRegexError('لطفاً عبارت منظم را وارد کنید')
      return
    }
    try {
      const nfa = regexToNfa(regexInput)
      setRegexNfa(nfa)
      setRegexError('')
      setView('regex')
    } catch (e) {
      setRegexError(e instanceof Error ? e.message : 'خطا در تبدیل عبارت منظم')
    }
  }

  const minimizeCurrent = () => {
    const m = minimizeDfa(activeAutomaton)
    setMinimized(m)
    setConvertedDfa(null)
    setView('minimized')
  }

  const backToLab = () => {
    setView('lab')
    setConvertedDfa(null)
    setMinimized(null)
  }

  const loadSample = (sample: Automaton) => {
    setAutomatonState(sample)
    setInputString('')
    setCurrentStep(0)
    setView('lab')
    setConvertedDfa(null)
    setMinimized(null)
  }

  const clearAll = () => {
    setAutomatonState({ states: [], transitions: [], alphabet: [], initialStateId: null })
    setInputString('')
    setCurrentStep(0)
    setConvertedDfa(null)
    setMinimized(null)
    setSelectedState(null)
  }

  const isLastStep = result ? currentStep >= result.steps.length - 1 : false
  const acceptingCount = activeAutomaton.states.filter(s => s.accepting).length
  const editable = view === 'lab'

  return (
    <div className="automata-lab-page">
      <aside className="automata-sidebar">
        <div className="sidebar-top">
          <AutomatonLogo />
          <button className="sidebar-close" onClick={onBack}><X size={20} /></button>
        </div>
        <div className="nav-label">پلتفرم</div>
        <nav>
          <button className={`nav-item ${mode === 'dfa' ? 'active' : ''}`} onClick={() => { setMode('dfa'); setCurrentStep(0) }}>
            <CircleDot size={17} /><span>اتوماتای متناهی (DFA)</span>
          </button>
          <button className={`nav-item ${mode === 'nfa' ? 'active' : ''}`} onClick={() => { setMode('nfa'); setCurrentStep(0) }}>
            <Circle size={17} /><span>اتوماتای غیرمتناهی (NFA / ε-NFA)</span>
          </button>
        </nav>
        <div className="nav-label">عملیات</div>
        <nav>
          <button className="nav-item" onClick={convertNfaToDfa} disabled={mode !== 'nfa' || view !== 'lab'}>
            <GitBranch size={17} /><span>تبدیل NFA → DFA</span>
          </button>
          <button className="nav-item" onClick={minimizeCurrent} disabled={mode !== 'dfa' || view !== 'lab'}>
            <Code size={17} /><span>کمینه‌سازی DFA</span>
          </button>
          <button className="nav-item" onClick={convertRegex} disabled={view !== 'lab'}>
            <Code size={17} /><span>عبارت منظم → NFA</span>
          </button>
        </nav>
        <div className="nav-label">عبارت منظم</div>
        <nav>
          <div className="regex-input-wrap">
            <input
              className="regex-input"
              value={regexInput}
              onChange={e => { setRegexInput(e.target.value); setRegexError('') }}
              placeholder="مثل: a*b|ε"
            />
            <button className="regex-btn" onClick={convertRegex} disabled={view !== 'lab'}>
              <X size={14} />
            </button>
          </div>
          {regexError && <div className="regex-error">{regexError}</div>}
        </nav>
        <div className="nav-label">نمونه‌ها</div>
        <nav>
          <button className="nav-item" onClick={() => loadSample(sampleDfaMod3A)}>
            <Square size={16} /><span>تعداد 'a' مضرب ۳ (DFA)</span>
          </button>
          <button className="nav-item" onClick={() => loadSample(sampleNfaEpsilon)}>
            <Link2 size={16} /><span>نمونه ε-NFA</span>
          </button>
        </nav>
        <div className="sidebar-spacer" />
        <div className="weekly-card">
          <div className="weekly-icon"><FileText size={19} /></div>
          <strong>حالت‌های پذیرش</strong>
          <p>{fa(acceptingCount)} حالت</p>
        </div>
      </aside>

      <main className="automata-main">
        <div className="page-heading">
          <div>
            <div className="eyebrow"><span /> ساخت و مشاهدهٔ زنده</div>
            <h1>{mode === 'dfa' ? 'آزمایشگاه اتوماتای متناهی' : 'آزمایشگاه اتوماتای غیرمتناهی'}</h1>
            <p>ساختار بساز، رشته ورودی بده و رحلة پذیرش را گام‌به‌گام ببین.</p>
          </div>
          <div className="page-actions">
            <button className="secondary-btn" onClick={clearAll}><Trash2 size={16} /> بوم جدید</button>
            <button className="primary-btn" onClick={() => { localStorage.setItem('tarkib-automaton', JSON.stringify(automaton)) }}><Save size={16} /> ذخیره</button>
          </div>
        </div>

        <div className="workspace">
          <AutomatonCanvas
            automaton={activeAutomaton}
            setAutomaton={setAutomatonState}
            tool={tool}
            setTool={setTool}
            selectedState={selectedState}
            setSelectedState={setSelectedState}
            onAcceptingToggle={toggleAccepting}
            onToast={s => window.alert(s)}
            editable={editable}
          />
          <div className="control-panel">
            <div className="input-group">
              <label>رشتهٔ ورودی</label>
              <div className="input-wrap">
                <input
                  value={inputString}
                  onChange={e => setInputString(e.target.value)}
                  placeholder="مثل: aabba"
                  onKeyDown={e => { if (e.key === 'Enter') runSimulation() }}
                />
                <button className="primary-btn compact" onClick={runSimulation}>
                  <Play size={15} fill="currentColor" />
                </button>
              </div>
              <div className="alphabet-hint">
                الفبای مجاز: <span>{activeAutomaton.alphabet.join('، ') || 'تعریف نشده'}</span>
              </div>
            </div>

            <div className="playback-controls">
              <button className="compact" disabled={!result || currentStep <= 0} onClick={prevStep}>
                <ChevronRight size={16} />
              </button>
              <button className={`play-btn ${isPlaying ? 'playing' : ''}`} onClick={togglePlay} disabled={!result}>
                {isPlaying ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg> : <Play size={16} fill="currentColor" />}
              </button>
              <button className="compact" disabled={!result || isLastStep} onClick={nextStep}>
                <ChevronLeft size={16} />
              </button>
              <button className="compact text" onClick={resetSim}><RotateCcw size={16} /></button>
              <span className="step-counter">{result ? `${fa(currentStep + 1)} از ${fa(result.steps.length)}` : '—'}</span>
            </div>

            {result && (
              <div className={`result-box ${result.accepted ? 'accepted' : 'rejected'}`}>
                <div className="result-icon">{result.accepted ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>}</div>
                <div>
                  <strong>{result.accepted ? 'پذیرفته شد ✓' : 'رد شد ✗'}</strong>
                  <p>{result.accepted ? 'رشته در زبان اتوماتا پذیرفته است.' : 'رشته در زبان اتوماتا پذیرفته نیست.'}</p>
                </div>
              </div>
            )}

            {result && result.steps.length > 0 && (
              <div className="trace-panel">
                <h3>آthaneٔ پذیرش</h3>
                <div className="trace-list">
                  {result.steps.map((s, i) => (
                    <div key={i} className={`trace-step ${i === currentStep ? 'active' : ''} ${i === result.steps.length - 1 ? 'final' : ''}`}>
                      <span className="trace-pos">{s.position}</span>
                      <span className="trace-sym">{s.symbol !== null ? `'${s.symbol}'` : '—'}</span>
                      <span className="trace-states">{s.activeStates.map(fa).join('، ')}</span>
                      <span className="trace-desc">{s.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {view !== 'lab' && (
              <div className="conversion-panel">
                <h3>{view === 'conversion' ? 'ناتیجه تبدیل NFA→DFA' : 'ناتیجه کمینه‌سازی'}</h3>
                <p>
                  حالت‌ها: <strong>{fa(activeAutomaton.states.length)}</strong> ·
                  گذارها: <strong>{fa(activeAutomaton.transitions.length)}</strong>
                </p>
                <button className="secondary-btn full" onClick={backToLab}>
                  <X size={15} /> بازگشت به بوم اصلی
                </button>
              </div>
            )}
          </div>
        </div>

        <footer className="page-footer">
          <span><AutomatonLogo /> <i>اتوماتا با دقت کامپیوتری، نه حدس و گمان.</i></span>
        </footer>
      </main>
    </div>
  )
}
