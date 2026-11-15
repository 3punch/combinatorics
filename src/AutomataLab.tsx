import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import {
  AlertTriangle, Atom, Check, CheckCircle2, ChevronLeft, ChevronRight,
  CircleDot, Code2, Flag, GitBranch, Hand, LayoutGrid, Link2, MousePointer2,
  Pause, Play, Plus, Redo2, RotateCcw, Save, Sparkles, Table2, Trash2,
  Undo2, X, ZoomIn, ZoomOut,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Automaton, AutomatonTransition, SimResult } from './automata'
import {
  analyzeAutomaton, automatonPresets, displaySymbol, layoutAutomaton,
  minimizeDfaDetailed, nfaToDfaWithSubsets, normalizeAutomaton, normalizeSymbol,
  regexToNfa, sampleDfaMod3A, simulateDFA, simulateNFA,
} from './automata'

const fa = (n: number) => n.toLocaleString('fa-IR')

type Tool = 'select' | 'state' | 'transition' | 'delete'
type PreviewKind = 'lab' | 'conversion' | 'minimized' | 'regex'
type PanelTab = 'simulate' | 'table' | 'operations'

type GroupedEdge = {
  key: string
  from: number
  to: number
  transitions: AutomatonTransition[]
  label: string
}

function getInitialAutomaton(): Automaton {
  try {
    const raw = localStorage.getItem('tarkib-automaton')
    if (raw) {
      const parsed = JSON.parse(raw) as Automaton
      if (parsed && Array.isArray(parsed.states) && Array.isArray(parsed.transitions)) {
        return normalizeAutomaton(parsed)
      }
    }
  } catch {
    // ignore storage errors
  }
  return sampleDfaMod3A
}

function AutomatonCanvas({
  automaton,
  setAutomaton,
  pushHistory,
  undo,
  redo,
  canUndo,
  canRedo,
  tool,
  setTool,
  selectedState,
  setSelectedState,
  editable,
  activeStates,
  traversedTransitionIds,
  finalVerdict,
  previewInfo,
  onApplyPreview,
  onCancelPreview,
  onToast,
}: {
  automaton: Automaton
  setAutomaton: (a: Automaton) => void
  pushHistory: (a: Automaton) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  tool: Tool
  setTool: (t: Tool) => void
  selectedState: number | null
  setSelectedState: (s: number | null) => void
  editable: boolean
  activeStates: number[]
  traversedTransitionIds: number[]
  finalVerdict: 'none' | 'accept' | 'reject'
  previewInfo: { title: string; subtitle: string } | null
  onApplyPreview: () => void
  onCancelPreview: () => void
  onToast: (msg: string) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState<number | null>(null)
  const [dragOriginSaved, setDragOriginSaved] = useState(false)
  const [transitionSource, setTransitionSource] = useState<number | null>(null)
  const [pendingEdge, setPendingEdge] = useState<{ from: number; to: number } | null>(null)
  const [symbolInput, setSymbolInput] = useState('a')
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    if (!editable) {
      setTransitionSource(null)
      setPendingEdge(null)
    }
  }, [editable])

  const point = (e: ReactPointerEvent<SVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect()
    const rawX = ((e.clientX - rect.left) * 700) / rect.width
    const rawY = ((e.clientY - rect.top) * 410) / rect.height
    return {
      x: rawX / zoom + 350 * (1 - 1 / zoom),
      y: rawY / zoom + 205 * (1 - 1 / zoom),
    }
  }

  const canvasDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.target === svgRef.current && tool === 'select') {
      setSelectedState(null)
      return
    }
    if (!editable || tool !== 'state' || e.target !== svgRef.current) return
    setTransitionSource(null)
    setPendingEdge(null)
    const p = point(e)
    const id = Math.max(0, ...automaton.states.map(s => s.id)) + 1
    pushHistory(automaton)
    const next = normalizeAutomaton({
      ...automaton,
      states: [
        ...automaton.states,
        {
          id,
          x: Math.max(48, Math.min(652, Math.round(p.x))),
          y: Math.max(48, Math.min(362, Math.round(p.y))),
          accepting: false,
        },
      ],
      initialStateId: automaton.initialStateId ?? id,
    })
    setAutomaton(next)
    setSelectedState(id)
    onToast(`حالت ${fa(id)} به بوم اضافه شد`)
  }

  const stateDown = (e: ReactPointerEvent<SVGGElement>, id: number) => {
    e.stopPropagation()
    if (!editable) {
      setSelectedState(id)
      return
    }
    if (tool === 'delete') {
      pushHistory(automaton)
      const remainingStates = automaton.states.filter(s => s.id !== id)
      const nextInitial =
        automaton.initialStateId === id
          ? (remainingStates[0]?.id ?? null)
          : automaton.initialStateId
      setAutomaton(
        normalizeAutomaton({
          ...automaton,
          states: remainingStates,
          transitions: automaton.transitions.filter(t => t.from !== id && t.to !== id),
          initialStateId: nextInitial,
        }),
      )
      if (selectedState === id) setSelectedState(null)
      if (transitionSource === id) setTransitionSource(null)
      onToast(`حالت ${fa(id)} و گذارهای متصل حذف شدند`)
      return
    }
    if (tool === 'transition') {
      if (transitionSource === null) {
        setTransitionSource(id)
        setPendingEdge(null)
        onToast(`مبدأ گذار: حالت ${fa(id)} — حالا مقصد را انتخاب کنید`)
      } else {
        setPendingEdge({ from: transitionSource, to: id })
        setSymbolInput('a')
        setTransitionSource(null)
      }
      return
    }
    if (tool === 'select') {
      setSelectedState(id)
      setDragging(id)
      setDragOriginSaved(false)
      e.currentTarget.setPointerCapture(e.pointerId)
    }
  }

  const stateMove = (e: ReactPointerEvent<SVGGElement>, id: number) => {
    if (!editable || dragging !== id) return
    if (!dragOriginSaved) {
      pushHistory(automaton)
      setDragOriginSaved(true)
    }
    const p = point(e)
    setAutomaton({
      ...automaton,
      states: automaton.states.map(s =>
        s.id === id
          ? {
            ...s,
            x: Math.max(48, Math.min(652, Math.round(p.x))),
            y: Math.max(48, Math.min(362, Math.round(p.y))),
          }
          : s,
      ),
    })
  }

  const stateDoubleClick = (id: number) => {
    if (!editable) return
    pushHistory(automaton)
    setAutomaton({
      ...automaton,
      states: automaton.states.map(s => (s.id === id ? { ...s, accepting: !s.accepting } : s)),
    })
    const cur = automaton.states.find(s => s.id === id)
    onToast(cur?.accepting ? `حالت ${fa(id)} عادی شد` : `حالت ${fa(id)} به‌عنوان پذیرش علامت خورد`)
  }

  const confirmAddTransition = (rawValue?: string) => {
    if (!pendingEdge) return
    const text = (rawValue ?? symbolInput).trim()
    const rawParts = text === '' ? [''] : text.split(/[,،\s]+/).filter(Boolean)
    const parts = rawParts.length ? rawParts : ['']

    let nextId = Math.max(0, ...automaton.transitions.map(t => t.id)) + 1
    const added: AutomatonTransition[] = []
    for (const part of parts) {
      const sym = normalizeSymbol(part)
      const exists = automaton.transitions.some(
        t => t.from === pendingEdge.from && t.to === pendingEdge.to && t.symbol === sym,
      )
      if (!exists) {
        added.push({ id: nextId++, from: pendingEdge.from, to: pendingEdge.to, symbol: sym })
      }
    }

    if (added.length) {
      pushHistory(automaton)
      setAutomaton(
        normalizeAutomaton({
          ...automaton,
          transitions: [...automaton.transitions, ...added],
        }),
      )
      onToast(
        `گذار ${added.map(a => displaySymbol(a.symbol)).join('، ')} از ${fa(pendingEdge.from)} به ${fa(pendingEdge.to)} افزوده شد`,
      )
    } else {
      onToast('این گذار از قبل وجود دارد')
    }
    setPendingEdge(null)
  }

  const handleEdgeClick = (group: GroupedEdge) => {
    if (!editable) return
    if (tool === 'delete') {
      pushHistory(automaton)
      const removeIds = new Set(group.transitions.map(t => t.id))
      setAutomaton(
        normalizeAutomaton({
          ...automaton,
          transitions: automaton.transitions.filter(t => !removeIds.has(t.id)),
        }),
      )
      onToast(`گذار ${group.label} بین ${fa(group.from)} و ${fa(group.to)} حذف شد`)
    } else if (tool === 'select') {
      setPendingEdge({ from: group.from, to: group.to })
      setSymbolInput(group.transitions.map(t => displaySymbol(t.symbol)).join(', '))
    }
  }

  const toggleAcceptingSelected = () => {
    if (!editable || selectedState === null) return
    pushHistory(automaton)
    setAutomaton({
      ...automaton,
      states: automaton.states.map(s =>
        s.id === selectedState ? { ...s, accepting: !s.accepting } : s,
      ),
    })
  }

  const setInitialSelected = () => {
    if (!editable || selectedState === null) return
    pushHistory(automaton)
    setAutomaton({ ...automaton, initialStateId: selectedState })
    onToast(`حالت ${fa(selectedState)} به‌عنوان آغاز تنظیم شد`)
  }

  const deleteSelectedState = () => {
    if (!editable || selectedState === null) return
    pushHistory(automaton)
    const remaining = automaton.states.filter(s => s.id !== selectedState)
    setAutomaton(
      normalizeAutomaton({
        ...automaton,
        states: remaining,
        transitions: automaton.transitions.filter(
          t => t.from !== selectedState && t.to !== selectedState,
        ),
        initialStateId:
          automaton.initialStateId === selectedState
            ? (remaining[0]?.id ?? null)
            : automaton.initialStateId,
      }),
    )
    setSelectedState(null)
    onToast('حالت انتخاب‌شده حذف شد')
  }

  const autoArrange = () => {
    if (!automaton.states.length) return
    if (editable) pushHistory(automaton)
    setAutomaton(layoutAutomaton(automaton))
    onToast('چیدمان حالت‌ها به‌صورت خودکار مرتب شد')
  }

  const groupedEdges = useMemo<GroupedEdge[]>(() => {
    const map = new Map<string, GroupedEdge>()
    for (const t of automaton.transitions) {
      const key = `${t.from}->${t.to}`
      if (!map.has(key)) {
        map.set(key, { key, from: t.from, to: t.to, transitions: [], label: '' })
      }
      map.get(key)!.transitions.push(t)
    }
    for (const g of map.values()) {
      g.label = g.transitions.map(t => displaySymbol(t.symbol)).join('، ')
    }
    return [...map.values()]
  }, [automaton.transitions])

  const selectedStateObj = automaton.states.find(s => s.id === selectedState) || null

  const tools: { id: Tool; icon: LucideIcon; label: string }[] = [
    { id: 'select', icon: MousePointer2, label: 'جابه‌جایی' },
    { id: 'state', icon: CircleDot, label: 'افزودن حالت' },
    { id: 'transition', icon: Link2, label: 'افزودن گذار' },
    { id: 'delete', icon: Trash2, label: 'حذف' },
  ]

  const traversedSet = new Set(traversedTransitionIds)
  const activeSet = new Set(activeStates)

  return (
    <section className="canvas-card">
      <div className="card-head canvas-head">
        <div>
          <Atom size={19} />
          <h2>بوم اتوماتا</h2>
          <span className="live-badge">
            <i /> {automaton.initialStateId ? 'زنده' : 'بدون حالت آغاز'}
          </span>
        </div>
        <div className="history-actions">
          <button onClick={autoArrange} disabled={!automaton.states.length} title="چیدمان خودکار">
            <LayoutGrid size={16} />
          </button>
          <button disabled={!editable || !canUndo} onClick={undo} title="واگرد (Ctrl+Z)">
            <Undo2 size={17} />
          </button>
          <button disabled={!editable || !canRedo} onClick={redo} title="ازنو">
            <Redo2 size={17} />
          </button>
        </div>
      </div>

      {previewInfo && (
        <div className="auto-preview-banner">
          <div>
            <Sparkles size={16} />
            <span>
              <strong>{previewInfo.title}:</strong> {previewInfo.subtitle}
            </span>
          </div>
          <div className="auto-preview-actions">
            <button className="primary-btn" onClick={onApplyPreview}>
              <Check size={14} /> اعمال روی بوم اصلی
            </button>
            <button className="secondary-btn" onClick={onCancelPreview}>
              بازگشت
            </button>
          </div>
        </div>
      )}

      <div className="graph-toolbar">
        {tools.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={tool === id ? 'selected' : ''}
            disabled={!editable}
            onClick={() => {
              setTool(id)
              setTransitionSource(null)
              setPendingEdge(null)
            }}
            title={label}
          >
            <Icon size={17} />
            <span>{label}</span>
          </button>
        ))}
        {transitionSource !== null && (
          <>
            <span className="toolbar-separator" />
            <button
              className="compact selected"
              onClick={() => setTransitionSource(null)}
              title="لغو انتخاب مبدأ"
            >
              <X size={15} />
              <span>لغو مبدأ ({fa(transitionSource)})</span>
            </button>
          </>
        )}
      </div>

      <div className={`graph-stage auto-stage tool-${tool === 'state' ? 'vertex' : tool}`}>
        <div className="stage-grid" />

        {pendingEdge && (
          <div className="auto-transition-composer" onPointerDown={e => e.stopPropagation()}>
            <strong>
              {pendingEdge.from === pendingEdge.to
                ? `طوقه روی حالت ${fa(pendingEdge.from)}:`
                : `گذار از ${fa(pendingEdge.from)} به ${fa(pendingEdge.to)}:`}
            </strong>
            <input
              autoFocus
              value={symbolInput}
              onChange={e => setSymbolInput(e.target.value)}
              placeholder="a یا a, b"
              onKeyDown={e => {
                if (e.key === 'Enter') confirmAddTransition()
                if (e.key === 'Escape') setPendingEdge(null)
              }}
            />
            <div className="auto-symbol-chips">
              {['a', 'b', '0', '1', 'ε'].map(sym => (
                <button key={sym} type="button" onClick={() => confirmAddTransition(sym)}>
                  {sym}
                </button>
              ))}
            </div>
            <div className="auto-composer-actions">
              <button className="primary-btn" onClick={() => confirmAddTransition()}>
                <Plus size={14} /> افزودن
              </button>
              <button className="secondary-btn" onClick={() => setPendingEdge(null)}>
                لغو
              </button>
            </div>
          </div>
        )}

        <svg
          ref={svgRef}
          viewBox="0 0 700 410"
          onPointerDown={canvasDown}
          aria-label="ویرایشگر تعاملی اتوماتا"
        >
          <defs>
            <marker id="auto-arrow" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
              <polygon points="0 0, 9 3.5, 0 7" fill="#7c9387" />
            </marker>
            <marker id="auto-arrow-active" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
              <polygon points="0 0, 9 3.5, 0 7" fill="#1e6752" />
            </marker>
            <marker id="auto-arrow-init" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
              <polygon points="0 0, 9 3.5, 0 7" fill="#1e6752" />
            </marker>
          </defs>

          <g transform={`translate(${350 * (1 - zoom)} ${205 * (1 - zoom)}) scale(${zoom})`}>
            {groupedEdges.map(group => {
              const from = automaton.states.find(s => s.id === group.from)
              const to = automaton.states.find(s => s.id === group.to)
              if (!from || !to) return null

              const isTraversed = group.transitions.some(t => traversedSet.has(t.id))
              const marker = isTraversed ? 'url(#auto-arrow-active)' : 'url(#auto-arrow)'

              let pathD = ''
              let labelX = 0
              let labelY = 0

              if (from.id === to.id) {
                const startX = from.x - 11
                const startY = from.y - 19
                const endR = to.accepting ? 27 : 24
                const endX = from.x + 0.5 * endR
                const endY = from.y - 0.866 * endR
                pathD = `M ${startX} ${startY} C ${from.x - 32} ${from.y - 68}, ${from.x + 32} ${from.y - 68}, ${endX} ${endY}`
                labelX = from.x
                labelY = from.y - 54
              } else {
                const dx = to.x - from.x
                const dy = to.y - from.y
                const dist = Math.hypot(dx, dy) || 1
                const ux = dx / dist
                const uy = dy / dist
                const nx = -uy
                const ny = ux
                const hasReverse = groupedEdges.some(
                  other => other.from === to.id && other.to === from.id,
                )
                const endPad = to.accepting ? 27 : 24

                if (hasReverse) {
                  const curve = 34
                  const cx = (from.x + to.x) / 2 + nx * curve
                  const cy = (from.y + to.y) / 2 + ny * curve
                  const sdx = cx - from.x
                  const sdy = cy - from.y
                  const sdist = Math.hypot(sdx, sdy) || 1
                  const x1 = from.x + (sdx / sdist) * 22
                  const y1 = from.y + (sdy / sdist) * 22
                  const edx = to.x - cx
                  const edy = to.y - cy
                  const edist = Math.hypot(edx, edy) || 1
                  const x2 = to.x - (edx / edist) * endPad
                  const y2 = to.y - (edy / edist) * endPad
                  pathD = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`
                  labelX = 0.25 * x1 + 0.5 * cx + 0.25 * x2
                  labelY = 0.25 * y1 + 0.5 * cy + 0.25 * y2
                } else {
                  const x1 = from.x + ux * 22
                  const y1 = from.y + uy * 22
                  const x2 = to.x - ux * endPad
                  const y2 = to.y - uy * endPad
                  pathD = `M ${x1} ${y1} L ${x2} ${y2}`
                  labelX = (x1 + x2) / 2
                  labelY = (y1 + y2) / 2
                }
              }

              const pillWidth = Math.max(24, group.label.length * 9 + 12)

              return (
                <g
                  key={group.key}
                  className={`auto-edge-group ${isTraversed ? 'is-traversed' : ''}`}
                  onPointerDown={e => {
                    e.stopPropagation()
                    handleEdgeClick(group)
                  }}
                >
                  <path className="auto-edge-hit" d={pathD} />
                  <path className="auto-edge-path" d={pathD} markerEnd={marker} />
                  <g transform={`translate(${labelX} ${labelY})`}>
                    <rect
                      className="auto-edge-pill"
                      x={-pillWidth / 2}
                      y={-11}
                      width={pillWidth}
                      height={22}
                      rx={7}
                    />
                    <text className="auto-edge-label" textAnchor="middle" dy="4">
                      {group.label}
                    </text>
                  </g>
                </g>
              )
            })}

            {automaton.states.map(s => {
              const isInitial = s.id === automaton.initialStateId
              const isSelected = selectedState === s.id || transitionSource === s.id
              const isActive = activeSet.has(s.id)
              const activeClass = !isActive
                ? ''
                : finalVerdict === 'accept'
                  ? 'is-active-accept'
                  : finalVerdict === 'reject'
                    ? 'is-active-reject'
                    : 'is-active'

              return (
                <g
                  key={s.id}
                  className={`auto-state ${s.accepting ? 'is-accepting' : ''} ${isSelected ? 'is-selected' : ''} ${activeClass}`}
                  transform={`translate(${s.x} ${s.y})`}
                  onPointerDown={e => stateDown(e, s.id)}
                  onPointerMove={e => stateMove(e, s.id)}
                  onPointerUp={() => { if (dragging) setDragging(null) }}
                  onPointerCancel={() => setDragging(null)}
                  onDoubleClick={() => stateDoubleClick(s.id)}
                >
                  {isInitial && (
                    <line
                      className="auto-init-arrow"
                      x1={-58}
                      y1={0}
                      x2={s.accepting ? -27 : -24}
                      y2={0}
                      markerEnd="url(#auto-arrow-init)"
                    />
                  )}
                  {isActive && (
                    <circle
                      className={`auto-active-halo ${finalVerdict === 'reject' ? 'reject' : ''}`}
                      r={s.accepting ? 31 : 28}
                    />
                  )}
                  {isSelected && <circle className="selection-ring" r={30} />}
                  <circle className="vertex-shadow" r={22} />
                  {s.accepting && <circle className="auto-state-outer-accept" r={25} />}
                  <circle className="auto-state-circle" r={22} />
                  <text className="auto-state-label" textAnchor="middle" dy="5">
                    {fa(s.id)}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>

        {!automaton.states.length && (
          <div className="empty-canvas">
            <CircleDot size={32} />
            <strong>بوم اتوماتا خالی است</strong>
            <span>ابزار «افزودن حالت» را برگزینید و روی بوم کلیک کنید یا یک نمونه بارگذاری نمایید.</span>
          </div>
        )}

        <div className="canvas-hint">
          <Hand size={14} />
          <span>
            {!editable
              ? 'در حال پیش‌نمایش نتیجه هستید؛ برای ویرایش، آن را روی بوم اصلی اعمال کنید'
              : tool === 'select'
                ? 'حالت‌ها را بکشید؛ با دوبار کلیک وضعیت پذیرش تغییر می‌کند'
                : tool === 'state'
                  ? 'روی نقطهٔ دلخواه بوم کلیک کنید تا حالت تازه ساخته شود'
                  : tool === 'transition'
                    ? transitionSource !== null
                      ? `مبدأ ${fa(transitionSource)} انتخاب شد؛ روی حالت مقصد (یا همان حالت برای طوقه) کلیک کنید`
                      : 'ابتدا حالت مبدأ و سپس حالت مقصد گذار را کلیک کنید'
                    : 'روی هر حالت یا پیکان گذار کلیک کنید تا حذف شود'}
          </span>
        </div>

        <div className="zoom-controls">
          <button onClick={() => setZoom(Math.min(1.5, zoom + 0.1))} title="بزرگ‌نمایی">
            <ZoomIn size={16} />
          </button>
          <span>{fa(Math.round(zoom * 100))}٪</span>
          <button onClick={() => setZoom(Math.max(0.7, zoom - 0.1))} title="کوچک‌نمایی">
            <ZoomOut size={16} />
          </button>
        </div>
      </div>

      {editable && selectedStateObj && (
        <div className="auto-state-bar">
          <span>
            حالت انتخاب‌شده: <strong>{fa(selectedStateObj.id)}</strong>
            {selectedStateObj.label ? ` (${selectedStateObj.label})` : ''}
          </span>
          <div className="auto-state-bar-actions">
            <button
              className={`auto-chip-btn ${automaton.initialStateId === selectedStateObj.id ? 'active' : ''}`}
              onClick={setInitialSelected}
            >
              <Flag size={13} /> تنظیم به‌عنوان آغاز
            </button>
            <button
              className={`auto-chip-btn ${selectedStateObj.accepting ? 'active' : ''}`}
              onClick={toggleAcceptingSelected}
            >
              <CheckCircle2 size={13} /> {selectedStateObj.accepting ? 'حذف پذیرش' : 'علامت پذیرش'}
            </button>
            <button className="auto-chip-btn danger" onClick={deleteSelectedState}>
              <Trash2 size={13} /> حذف حالت
            </button>
          </div>
        </div>
      )}

      <div className="canvas-footer">
        <span>
          <CircleDot size={11} />
          کلیک دوبار روی حالت: تغییر پذیرش · الفبا: {automaton.alphabet.length ? `{${automaton.alphabet.join('، ')}}` : 'تهی'}
        </span>
        {editable && (
          <button onClick={autoArrange}>مرتب‌سازی خودکار بوم</button>
        )}
      </div>
    </section>
  )
}

export default function AutomataLab({
  onBack,
  onToast,
  onOpenPumping,
}: {
  onBack: () => void
  onToast?: (msg: string) => void
  onOpenPumping?: () => void
}) {
  const [mode, setMode] = useState<'dfa' | 'nfa'>('dfa')
  const [view, setView] = useState<PreviewKind>('lab')
  const [tab, setTab] = useState<PanelTab>('simulate')
  const [automaton, setAutomatonState] = useState<Automaton>(getInitialAutomaton)
  const [past, setPast] = useState<Automaton[]>([])
  const [future, setFuture] = useState<Automaton[]>([])
  const [tool, setTool] = useState<Tool>('select')
  const [selectedState, setSelectedState] = useState<number | null>(1)
  const [inputString, setInputString] = useState('abaab')
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [activePresetId, setActivePresetId] = useState<string>(() => {
    try {
      return localStorage.getItem('tarkib-automaton') ? '' : 'mod3a'
    } catch {
      return 'mod3a'
    }
  })

  const [previewAutomaton, setPreviewAutomaton] = useState<Automaton | null>(null)
  const [previewInfo, setPreviewInfo] = useState<{ title: string; subtitle: string } | null>(null)
  const [subsetDetails, setSubsetDetails] = useState<Record<number, number[]> | null>(null)
  const [minDetails, setMinDetails] = useState<{ originalCount: number; minimizedCount: number } | null>(null)

  const [regexInput, setRegexInput] = useState('(a|b)*abb')
  const [regexError, setRegexError] = useState('')

  const notify = (msg: string) => {
    if (onToast) onToast(msg)
  }

  const pushHistory = (snapshot: Automaton) => {
    setPast(p => [...p.slice(-24), snapshot])
    setFuture([])
    setActivePresetId('')
  }

  const undo = () => {
    if (!past.length) return
    const prev = past[past.length - 1]
    setFuture(f => [automaton, ...f])
    setAutomatonState(prev)
    setPast(p => p.slice(0, -1))
  }

  const redo = () => {
    if (!future.length) return
    const next = future[0]
    setPast(p => [...p, automaton])
    setAutomatonState(next)
    setFuture(f => f.slice(1))
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const activeAutomaton = view !== 'lab' && previewAutomaton ? previewAutomaton : automaton
  const analysis = useMemo(() => analyzeAutomaton(activeAutomaton), [activeAutomaton])

  const result: SimResult = useMemo(
    () => (mode === 'dfa' ? simulateDFA(activeAutomaton, inputString) : simulateNFA(activeAutomaton, inputString)),
    [activeAutomaton, inputString, mode],
  )

  useEffect(() => {
    setCurrentStep(0)
    setIsPlaying(false)
  }, [inputString, mode, activeAutomaton])

  useEffect(() => {
    if (!isPlaying) return
    if (currentStep >= result.steps.length - 1) {
      setIsPlaying(false)
      return
    }
    const timer = window.setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= result.steps.length - 1) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, 850)
    return () => window.clearInterval(timer)
  }, [isPlaying, currentStep, result.steps.length])

  const currentSimStep = result.steps[Math.min(currentStep, result.steps.length - 1)]
  const isAtFinalStep = currentStep === result.steps.length - 1
  const finalVerdict: 'none' | 'accept' | 'reject' =
    !isAtFinalStep || result.error
      ? 'none'
      : result.accepted
        ? 'accept'
        : 'reject'

  const runNfaToDfa = () => {
    if (!activeAutomaton.states.length || activeAutomaton.initialStateId === null) {
      notify('ابتدا یک اتوماتا با حالت آغاز بسازید')
      return
    }
    const conv = nfaToDfaWithSubsets(activeAutomaton)
    setPreviewAutomaton(conv.automaton)
    setSubsetDetails(conv.stateSubsets)
    setMinDetails(null)
    setPreviewInfo({
      title: 'تبدیل زیرمجموعه‌ای NFA به DFA',
      subtitle: `${fa(conv.automaton.states.length)} وضعیت معادل قطعی ساخته شد.`,
    })
    setView('conversion')
    setMode('dfa')
    setSelectedState(conv.automaton.initialStateId)
    notify('DFA معادل با روش زیرمجموعه‌ای ساخته شد')
  }

  const runMinimizeDfa = () => {
    if (!activeAutomaton.states.length || activeAutomaton.initialStateId === null) {
      notify('ابتدا یک اتوماتا با حالت آغاز بسازید')
      return
    }
    const min = minimizeDfaDetailed(activeAutomaton)
    setPreviewAutomaton(min.automaton)
    setMinDetails({ originalCount: min.originalCount, minimizedCount: min.minimizedCount })
    setSubsetDetails(null)
    setPreviewInfo({
      title: 'کمینه‌سازی DFA',
      subtitle: `تعداد وضعیت‌ها از ${fa(min.originalCount)} به ${fa(min.minimizedCount)} کاهش یافت.`,
    })
    setView('minimized')
    setMode('dfa')
    setSelectedState(min.automaton.initialStateId)
    notify('اتوماتا با الگوریتم افراز کمینه شد')
  }

  const runRegexToNfa = (expr?: string) => {
    const targetExpr = expr ?? regexInput
    if (expr !== undefined) setRegexInput(expr)
    try {
      const nfa = regexToNfa(targetExpr)
      setRegexError('')
      setPreviewAutomaton(nfa)
      setSubsetDetails(null)
      setMinDetails(null)
      setPreviewInfo({
        title: `ساخت تامپسون برای «${targetExpr}»`,
        subtitle: `${fa(nfa.states.length)} وضعیت و ${fa(nfa.transitions.length)} گذار ساخته شد.`,
      })
      setView('regex')
      setMode('nfa')
      setSelectedState(nfa.initialStateId)
      notify('ε-NFA معادل عبارت منظم ساخته شد')
    } catch (err) {
      setRegexError(err instanceof Error ? err.message : 'خطا در تحلیل عبارت منظم')
    }
  }

  const applyPreview = () => {
    if (!previewAutomaton) return
    pushHistory(automaton)
    setAutomatonState(previewAutomaton)
    setView('lab')
    setPreviewAutomaton(null)
    setPreviewInfo(null)
    setActivePresetId('')
    notify('اتوماتای ساخته‌شده روی بوم اصلی اعمال شد')
  }

  const cancelPreview = () => {
    setView('lab')
    setPreviewAutomaton(null)
    setPreviewInfo(null)
    setSubsetDetails(null)
    setMinDetails(null)
  }

  const loadPreset = (presetId: string) => {
    const preset = automatonPresets.find(p => p.id === presetId)
    if (!preset) return
    pushHistory(automaton)
    setAutomatonState(preset.automaton)
    setMode(preset.mode)
    setActivePresetId(preset.id)
    setInputString(preset.sampleInputs[0] ?? '')
    setSelectedState(preset.automaton.initialStateId)
    cancelPreview()
    notify(`نمونهٔ «${preset.title}» بارگذاری شد`)
  }

  const clearCanvas = () => {
    pushHistory(automaton)
    setAutomatonState({ states: [], transitions: [], alphabet: [], initialStateId: null })
    setSelectedState(null)
    setActivePresetId('')
    cancelPreview()
    notify('یک بوم تازه برای اتوماتا آماده شد')
  }

  const deleteSingleTransition = (id: number) => {
    if (view !== 'lab') return
    pushHistory(automaton)
    setAutomatonState(
      normalizeAutomaton({
        ...automaton,
        transitions: automaton.transitions.filter(t => t.id !== id),
      }),
    )
    notify('گذار حذف شد')
  }

  const activePreset = automatonPresets.find(p => p.id === activePresetId)
  const quickTestStrings = activePreset?.sampleInputs ?? ['', 'a', 'ab', 'aaab', 'abaab']
  const tableSymbols = [
    ...activeAutomaton.alphabet,
    ...(analysis.hasEpsilon ? [''] : []),
  ]

  return (
    <div className="automata-lab-view">
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span /> طراحی، شبیه‌سازی و تبدیل خودکار</div>
          <h1>آزمایشگاه اتوماتا</h1>
          <p>ماشین بساز، رشتهٔ ورودی را روی نوار گام‌به‌گام ردیابی کن و تبدیل‌های استاندارد را ببین.</p>
        </div>
        <div className="page-actions">
          <div className="auto-mode-switch" role="group" aria-label="نوع ماشین">
            <button
              className={mode === 'dfa' ? 'active' : ''}
              onClick={() => setMode('dfa')}
            >
              قطعی (DFA)
            </button>
            <button
              className={mode === 'nfa' ? 'active' : ''}
              onClick={() => setMode('nfa')}
            >
              غیرقطعی (NFA / ε-NFA)
            </button>
          </div>
          <button className="secondary-btn" onClick={clearCanvas}>
            <Plus size={16} /> بوم جدید
          </button>
          <button
            className="primary-btn"
            onClick={() => {
              localStorage.setItem('tarkib-automaton', JSON.stringify(automaton))
              notify('اتوماتا در مرورگر شما ذخیره شد')
            }}
          >
            <Save size={16} /> ذخیره
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon green"><CircleDot size={21} /></div>
          <div><span>تعداد وضعیت‌ها</span><strong>{fa(activeAutomaton.states.length)}</strong></div>
          <small>|Q|</small>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><Link2 size={21} /></div>
          <div><span>تعداد گذارها</span><strong>{fa(activeAutomaton.transitions.length)}</strong></div>
          <small>|δ|</small>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><CheckCircle2 size={21} /></div>
          <div><span>وضعیت‌های پذیرش</span><strong>{fa(analysis.acceptingCount)}</strong></div>
          <small>|F|</small>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><Atom size={21} /></div>
          <div>
            <span>ماهیت ساختار</span>
            <strong style={{ fontSize: 17 }}>
              {analysis.hasEpsilon ? 'ε-NFA' : analysis.isDeterministic ? 'DFA' : 'NFA'}
            </strong>
          </div>
          <small>{activeAutomaton.alphabet.length ? `{${activeAutomaton.alphabet.join(',')}}` : 'Σ = ∅'}</small>
        </div>
      </div>

      <div className="auto-workspace">
        <AutomatonCanvas
          automaton={activeAutomaton}
          setAutomaton={setAutomatonState}
          pushHistory={pushHistory}
          undo={undo}
          redo={redo}
          canUndo={past.length > 0}
          canRedo={future.length > 0}
          tool={tool}
          setTool={setTool}
          selectedState={selectedState}
          setSelectedState={setSelectedState}
          editable={view === 'lab'}
          activeStates={currentSimStep?.activeStates ?? []}
          traversedTransitionIds={currentSimStep?.traversedTransitionIds ?? []}
          finalVerdict={finalVerdict}
          previewInfo={previewInfo}
          onApplyPreview={applyPreview}
          onCancelPreview={cancelPreview}
          onToast={notify}
        />

        <aside className="auto-panel">
          <div className="auto-panel-tabs">
            <button className={tab === 'simulate' ? 'active' : ''} onClick={() => setTab('simulate')}>
              شبیه‌سازی
            </button>
            <button className={tab === 'table' ? 'active' : ''} onClick={() => setTab('table')}>
              جدول گذار و تحلیل
            </button>
            <button className={tab === 'operations' ? 'active' : ''} onClick={() => setTab('operations')}>
              تبدیل‌ها و Regex
            </button>
          </div>

          {tab === 'simulate' && (
            <div className="auto-panel-body">
              <div className="auto-field">
                <label>رشتهٔ ورودی برای آزمون</label>
                <div className="auto-input-row">
                  <input
                    value={inputString}
                    onChange={e => setInputString(e.target.value)}
                    placeholder="رشته را وارد کنید (مثلاً abaab)"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        setCurrentStep(0)
                        setIsPlaying(true)
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="auto-eps-btn"
                    onClick={() => setInputString('')}
                    title="آزمون رشتهٔ تهی ε"
                  >
                    رشتهٔ ε
                  </button>
                </div>
                <div className="auto-sample-pills">
                  <span>نمونه:</span>
                  {quickTestStrings.map(s => (
                    <button
                      key={s || 'eps'}
                      className={inputString === s ? 'active' : ''}
                      onClick={() => setInputString(s)}
                    >
                      {s === '' ? 'ε' : s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="auto-field">
                <label>نوار ورودی</label>
                <div className="auto-tape">
                  {inputString.length === 0 ? (
                    <span className="auto-tape-cell epsilon current">ε (رشتهٔ تهی)</span>
                  ) : (
                    inputString.split('').map((ch, idx) => {
                      const readPosition = currentSimStep?.position ?? 0
                      const cls =
                        idx + 1 === readPosition
                          ? 'current'
                          : idx + 1 < readPosition
                            ? 'done'
                            : ''
                      return (
                        <span key={idx} className={`auto-tape-cell ${cls}`}>
                          {ch}
                        </span>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="auto-playback">
                <button
                  disabled={currentStep <= 0}
                  onClick={() => { setIsPlaying(false); setCurrentStep(p => Math.max(0, p - 1)) }}
                  title="گام قبل"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  className={`auto-play-main ${isPlaying ? 'playing' : ''}`}
                  disabled={result.steps.length <= 1}
                  onClick={() => {
                    if (isPlaying) {
                      setIsPlaying(false)
                    } else {
                      if (currentStep >= result.steps.length - 1) setCurrentStep(0)
                      setIsPlaying(true)
                    }
                  }}
                  title={isPlaying ? 'توقف' : 'پخش خودکار'}
                >
                  {isPlaying ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}
                </button>
                <button
                  disabled={currentStep >= result.steps.length - 1}
                  onClick={() => { setIsPlaying(false); setCurrentStep(p => Math.min(result.steps.length - 1, p + 1)) }}
                  title="گام بعد"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => { setIsPlaying(false); setCurrentStep(0) }}
                  title="بازگشت به ابتدا"
                >
                  <RotateCcw size={15} />
                </button>
                <span className="auto-step-label">
                  گام {fa(currentStep + 1)} از {fa(result.steps.length)}
                </span>
              </div>

              {result.error ? (
                <div className="auto-verdict warning">
                  <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong>نیازمند حالت NFA</strong>
                    <p>{result.error}</p>
                    <button
                      className="text-btn"
                      style={{ paddingRight: 0, marginTop: 4 }}
                      onClick={() => setMode('nfa')}
                    >
                      تغییر به حالت NFA / ε-NFA <ChevronLeft size={13} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`auto-verdict ${result.accepted ? 'accepted' : 'rejected'}`}>
                  {result.accepted
                    ? <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                    : <X size={18} style={{ flexShrink: 0, marginTop: 2 }} />}
                  <div>
                    <strong>{result.accepted ? 'رشته پذیرفته شد' : 'رشته رد شد'}</strong>
                    <p>
                      {result.accepted
                        ? `ماشین در پایان رشتهٔ «${inputString || 'ε'}» به وضعیت پذیرش رسید.`
                        : `ماشین در پایان رشتهٔ «${inputString || 'ε'}» در وضعیت پذیرش قرار نگرفت.`}
                    </p>
                  </div>
                </div>
              )}

              <div className="auto-trace-head">
                <span>ردپای اجرای گام‌به‌گام</span>
                <small>برای مشاهده روی بوم کلیک کنید</small>
              </div>
              <div className="auto-trace-list">
                {result.steps.map((step, i) => (
                  <button
                    key={i}
                    className={`auto-trace-step ${i === currentStep ? 'active' : ''} ${step.status}`}
                    onClick={() => { setIsPlaying(false); setCurrentStep(i) }}
                  >
                    <span className="auto-trace-badge">{fa(i + 1)}</span>
                    <span className="auto-trace-body">
                      <strong>{step.description}</strong>
                      <small>
                        وضعیت‌های فعال: {step.activeStates.length ? step.activeStates.map(fa).join('، ') : '∅'}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'table' && (
            <div className="auto-panel-body">
              <div className="properties-list">
                <div className="property">
                  <span>قطعیت (DFA معتبر)</span>
                  <strong className={analysis.isDeterministic ? 'yes' : 'no'}>
                    {analysis.isDeterministic ? <Check size={13} /> : <X size={13} />}
                    {analysis.isDeterministic ? 'بله' : 'خیر (غیرقطعی)'}
                  </strong>
                </div>
                <div className="property">
                  <span>گذارهای اپسیلون (ε)</span>
                  <strong className={!analysis.hasEpsilon ? 'yes' : 'no'}>
                    {analysis.hasEpsilon ? 'دارد' : 'ندارد'}
                  </strong>
                </div>
                <div className="property">
                  <span>وضعیت‌های دسترس‌ناپذیر</span>
                  <strong className={analysis.unreachableIds.length === 0 ? 'yes' : 'no'}>
                    {analysis.unreachableIds.length ? analysis.unreachableIds.map(fa).join('، ') : 'ندارد'}
                  </strong>
                </div>
                <div className="property">
                  <span>وضعیت‌های بن‌بست</span>
                  <strong>{analysis.deadIds.length ? analysis.deadIds.map(fa).join('، ') : 'ندارد'}</strong>
                </div>
              </div>

              <div className="auto-trace-head">
                <span><Table2 size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> جدول تابع گذار δ</span>
                <small>→ آغاز · * پذیرش</small>
              </div>

              {activeAutomaton.states.length > 0 && tableSymbols.length > 0 ? (
                <div className="auto-table-wrap">
                  <table className="auto-delta-table">
                    <thead>
                      <tr>
                        <th>حالت</th>
                        {tableSymbols.map(sym => (
                          <th key={sym || 'eps'}>{displaySymbol(sym)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeAutomaton.states.map(st => {
                        const prefix = `${st.id === activeAutomaton.initialStateId ? '→ ' : ''}${st.accepting ? '* ' : ''}`
                        return (
                          <tr key={st.id}>
                            <td>{prefix}{fa(st.id)}</td>
                            {tableSymbols.map(sym => {
                              const targets = activeAutomaton.transitions
                                .filter(t => t.from === st.id && t.symbol === sym)
                                .map(t => fa(t.to))
                              return <td key={sym || 'eps'}>{targets.length ? targets.join('، ') : '—'}</td>
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ fontSize: 10, color: '#7e8f85', margin: 0 }}>
                  برای نمایش جدول گذار، دست‌کم یک حالت و یک گذار اضافه کنید.
                </p>
              )}

              {view === 'lab' && automaton.transitions.length > 0 && (
                <>
                  <div className="auto-trace-head">
                    <span>فهرست گذارها (حذف سریع)</span>
                  </div>
                  <div className="auto-trans-chips">
                    {automaton.transitions.map(t => (
                      <span key={t.id} className="auto-trans-chip">
                        <span>
                          {fa(t.from)} به {fa(t.to)} <b dir="ltr">({displaySymbol(t.symbol)})</b>
                        </span>
                        <button onClick={() => deleteSingleTransition(t.id)} title="حذف گذار">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'operations' && (
            <div className="auto-panel-body">
              <div className="auto-op-card">
                <h3><Code2 size={15} /> تبدیل عبارت منظم به ε-NFA</h3>
                <p>با الگوریتم تامپسون هر عبارت منظم (پشتیبانی از |، *، +، ?، پرانتز و ε) را به اتوماتا تبدیل کنید.</p>
                <div className="auto-input-row">
                  <input
                    value={regexInput}
                    onChange={e => { setRegexInput(e.target.value); setRegexError('') }}
                    placeholder="(a|b)*abb"
                    onKeyDown={e => { if (e.key === 'Enter') runRegexToNfa() }}
                  />
                  <button className="primary-btn" style={{ padding: '0 12px' }} onClick={() => runRegexToNfa()}>
                    ساخت
                  </button>
                </div>
                <div className="auto-sample-pills">
                  <span>مثال:</span>
                  {['(a|b)*abb', 'a*b*', '(ab)+', 'a(b|ε)'].map(expr => (
                    <button key={expr} onClick={() => runRegexToNfa(expr)}>
                      {expr}
                    </button>
                  ))}
                </div>
                {regexError && <div className="auto-error-box">{regexError}</div>}
              </div>

              <div className="auto-op-card">
                <h3><GitBranch size={15} /> تبدیل‌ها و بهینه‌سازی</h3>
                <p>ساخت زیرمجموعه‌ای NFA را قطعی می‌کند و افراز هاپکرافت وضعیت‌های معادل DFA را ادغام می‌کند.</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="secondary-btn" style={{ flex: 1 }} onClick={runNfaToDfa}>
                    تبدیل NFA به DFA
                  </button>
                  <button className="secondary-btn" style={{ flex: 1 }} onClick={runMinimizeDfa}>
                    کمینه‌سازی DFA
                  </button>
                </div>
                {subsetDetails && view === 'conversion' && (
                  <div className="auto-subset-badges">
                    {Object.entries(subsetDetails).map(([id, set]) => (
                      <span key={id}>
                        {fa(Number(id))} = {'{'}{set.map(fa).join('، ')}{'}'}
                      </span>
                    ))}
                  </div>
                )}
                {minDetails && view === 'minimized' && (
                  <p style={{ color: '#1e6752', fontWeight: 600 }}>
                    کاهش از {fa(minDetails.originalCount)} وضعیت به {fa(minDetails.minimizedCount)} وضعیت کمینه.
                  </p>
                )}
              </div>

              <div className="auto-op-card">
                <h3><Sparkles size={15} /> نمونه‌های آماده</h3>
                <div className="auto-preset-list">
                  {automatonPresets.map(p => (
                    <button
                      key={p.id}
                      className={`auto-preset-btn ${activePresetId === p.id && view === 'lab' ? 'active' : ''}`}
                      onClick={() => loadPreset(p.id)}
                    >
                      <span>
                        <strong>{p.title}</strong>
                        <small>{p.description}</small>
                      </span>
                      <em>{p.mode.toUpperCase()}</em>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      <footer className="page-footer">
        <span>
          <span className="brand" /> <i>الگوریتم‌های قطعی شبیه‌سازی، تامپسون، زیرمجموعه‌ای و کمینه‌سازی.</i>
        </span>
        {onOpenPumping ? (
          <button onClick={onOpenPumping}>
            رفتن به آزمایشگاه لم پمپاژ <ChevronLeft size={14} />
          </button>
        ) : (
          <button onClick={onBack}>
            بازگشت به آزمایشگاه گراف <ChevronLeft size={14} />
          </button>
        )}
      </footer>
    </div>
  )
}
