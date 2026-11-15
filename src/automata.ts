export type AutomatonState = {
  id: number
  x: number
  y: number
  accepting: boolean
  label?: string
}

export type AutomatonTransition = {
  id: number
  from: number
  to: number
  symbol: string // '' denotes epsilon (ε)
}

export type Automaton = {
  states: AutomatonState[]
  transitions: AutomatonTransition[]
  alphabet: string[]
  initialStateId: number | null
}

export type SimStepStatus = 'start' | 'move' | 'stuck' | 'accept' | 'reject' | 'error'

export type SimStep = {
  position: number
  symbol: string | null
  activeStates: number[]
  previousStates: number[]
  traversedTransitionIds: number[]
  description: string
  status: SimStepStatus
}

export type SimResult = {
  accepted: boolean
  steps: SimStep[]
  finalStates: number[]
  error?: string
}

export type AutomatonAnalysis = {
  hasEpsilon: boolean
  isDeterministic: boolean
  nondeterministicPairs: string[]
  isCompleteDfa: boolean
  reachableIds: number[]
  unreachableIds: number[]
  deadIds: number[]
  acceptingCount: number
}

/*─────────────────────────────────────────────────────────────────────────────
  Helpers & normalization
─────────────────────────────────────────────────────────────────────────────*/

const faNum = (n: number): string => n.toLocaleString('fa-IR')

const formatStates = (ids: number[]): string =>
  ids.length ? `{${ids.map(faNum).join('، ')}}` : '∅'

export function isEpsilon(symbol: string): boolean {
  const s = symbol.trim()
  return s === '' || s === 'ε' || s === 'ϵ' || s.toLowerCase() === 'eps' || s.toLowerCase() === 'epsilon'
}

export function normalizeSymbol(symbol: string): string {
  return isEpsilon(symbol) ? '' : symbol.trim()
}

export function displaySymbol(symbol: string): string {
  return isEpsilon(symbol) ? 'ε' : symbol
}

export function deriveAlphabet(automaton: Pick<Automaton, 'transitions' | 'alphabet'>): string[] {
  const set = new Set<string>()
  for (const sym of automaton.alphabet) {
    if (!isEpsilon(sym)) set.add(sym.trim())
  }
  for (const t of automaton.transitions) {
    if (!isEpsilon(t.symbol)) set.add(t.symbol.trim())
  }
  return [...set].sort()
}

export function normalizeAutomaton(automaton: Automaton): Automaton {
  const stateIds = new Set(automaton.states.map(s => s.id))
  const seen = new Set<string>()
  const transitions: AutomatonTransition[] = []

  for (const t of automaton.transitions) {
    if (!stateIds.has(t.from) || !stateIds.has(t.to)) continue
    const sym = normalizeSymbol(t.symbol)
    const key = `${t.from}->${t.to}:${sym}`
    if (seen.has(key)) continue
    seen.add(key)
    transitions.push({ ...t, symbol: sym })
  }

  const initialStateId =
    automaton.initialStateId !== null && stateIds.has(automaton.initialStateId)
      ? automaton.initialStateId
      : automaton.states[0]?.id ?? null

  return {
    states: automaton.states,
    transitions,
    alphabet: deriveAlphabet({ transitions, alphabet: automaton.alphabet }),
    initialStateId,
  }
}

function transitionsFrom(automaton: Automaton, stateId: number): AutomatonTransition[] {
  return automaton.transitions.filter(t => t.from === stateId)
}

function nextTransitionsOn(
  automaton: Automaton,
  stateIds: number[],
  symbol: string,
): { states: number[]; transitionIds: number[] } {
  const targetStates = new Set<number>()
  const transitionIds: number[] = []
  for (const sid of stateIds) {
    for (const t of transitionsFrom(automaton, sid)) {
      if (t.symbol === symbol) {
        targetStates.add(t.to)
        transitionIds.push(t.id)
      }
    }
  }
  return {
    states: [...targetStates].sort((a, b) => a - b),
    transitionIds,
  }
}

/*─────────────────────────────────────────────────────────────────────────────
  Structural analysis (DFA validity, reachability, dead states)
─────────────────────────────────────────────────────────────────────────────*/

export function analyzeAutomaton(raw: Automaton): AutomatonAnalysis {
  const automaton = normalizeAutomaton(raw)
  const hasEpsilon = automaton.transitions.some(t => isEpsilon(t.symbol))
  const pairCounts = new Map<string, number>()
  for (const t of automaton.transitions) {
    if (isEpsilon(t.symbol)) continue
    const key = `${t.from}:${t.symbol}`
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1)
  }

  const nondeterministicPairs: string[] = []
  for (const [key, count] of pairCounts.entries()) {
    if (count > 1) {
      const [sid, sym] = key.split(':')
      nondeterministicPairs.push(`δ(${faNum(Number(sid))}, '${sym}')`)
    }
  }

  const isDeterministic = !hasEpsilon && nondeterministicPairs.length === 0

  const reachable = new Set<number>()
  if (automaton.initialStateId !== null) {
    const stack = [automaton.initialStateId]
    reachable.add(automaton.initialStateId)
    while (stack.length) {
      const cur = stack.pop()!
      for (const t of transitionsFrom(automaton, cur)) {
        if (!reachable.has(t.to)) {
          reachable.add(t.to)
          stack.push(t.to)
        }
      }
    }
  }

  const reachableIds = automaton.states.map(s => s.id).filter(id => reachable.has(id))
  const unreachableIds = automaton.states.map(s => s.id).filter(id => !reachable.has(id))

  // Co-reachable states: can reach at least one accepting state
  const canReachAccept = new Set<number>(automaton.states.filter(s => s.accepting).map(s => s.id))
  const reverseQueue = [...canReachAccept]
  while (reverseQueue.length) {
    const cur = reverseQueue.pop()!
    for (const t of automaton.transitions) {
      if (t.to === cur && !canReachAccept.has(t.from)) {
        canReachAccept.add(t.from)
        reverseQueue.push(t.from)
      }
    }
  }

  const deadIds = automaton.states.map(s => s.id).filter(id => !canReachAccept.has(id))
  const isCompleteDfa =
    isDeterministic &&
    automaton.initialStateId !== null &&
    automaton.alphabet.length > 0 &&
    reachableIds.every(sid =>
      automaton.alphabet.every(sym => automaton.transitions.some(t => t.from === sid && t.symbol === sym)),
    )

  return {
    hasEpsilon,
    isDeterministic,
    nondeterministicPairs,
    isCompleteDfa,
    reachableIds,
    unreachableIds,
    deadIds,
    acceptingCount: automaton.states.filter(s => s.accepting).length,
  }
}

/*─────────────────────────────────────────────────────────────────────────────
  ε-closure
─────────────────────────────────────────────────────────────────────────────*/

export function epsilonClosureWithEdges(
  automaton: Automaton,
  seeds: number[],
): { states: number[]; epsilonTransitionIds: number[] } {
  const closure = new Set<number>(seeds)
  const epsilonTransitionIds: number[] = []
  const stack = [...seeds]
  while (stack.length) {
    const current = stack.pop()!
    for (const t of transitionsFrom(automaton, current)) {
      if (isEpsilon(t.symbol)) {
        epsilonTransitionIds.push(t.id)
        if (!closure.has(t.to)) {
          closure.add(t.to)
          stack.push(t.to)
        }
      }
    }
  }
  return {
    states: [...closure].sort((a, b) => a - b),
    epsilonTransitionIds,
  }
}

export function epsilonClosure(automaton: Automaton, seeds: number[]): number[] {
  return epsilonClosureWithEdges(automaton, seeds).states
}

/*─────────────────────────────────────────────────────────────────────────────
  DFA simulation — exact, deterministic, supports empty string ε
─────────────────────────────────────────────────────────────────────────────*/

export function simulateDFA(raw: Automaton, input: string): SimResult {
  const automaton = normalizeAutomaton(raw)
  const steps: SimStep[] = []
  if (automaton.initialStateId === null) {
    return {
      accepted: false,
      steps: [{
        position: 0,
        symbol: null,
        activeStates: [],
        previousStates: [],
        traversedTransitionIds: [],
        description: 'حالت آغاز تعریف نشده است.',
        status: 'error',
      }],
      finalStates: [],
      error: 'ابتدا یک حالت آغاز برای اتوماتا مشخص کنید.',
    }
  }

  const analysis = analyzeAutomaton(automaton)
  if (!analysis.isDeterministic) {
    const reason = analysis.hasEpsilon
      ? 'این اتوماتا دارای ε-گذار است و قطعی (DFA) نیست؛ برای اجرا، حالت NFA را انتخاب کنید یا آن را به DFA تبدیل کنید.'
      : `گذار غیرقطعی در ${analysis.nondeterministicPairs.join('، ')} وجود دارد؛ حالت NFA را انتخاب کنید.`
    return {
      accepted: false,
      steps: [{
        position: 0,
        symbol: null,
        activeStates: [automaton.initialStateId],
        previousStates: [],
        traversedTransitionIds: [],
        description: reason,
        status: 'error',
      }],
      finalStates: [],
      error: reason,
    }
  }

  let current = automaton.initialStateId
  steps.push({
    position: 0,
    symbol: null,
    activeStates: [current],
    previousStates: [],
    traversedTransitionIds: [],
    description: `آغاز اجرا از حالت ${faNum(current)}${input === '' ? ' (رشتهٔ تهی ε)' : ''}`,
    status: 'start',
  })

  for (let i = 0; i < input.length; i++) {
    const sym = input[i]
    const next = nextTransitionsOn(automaton, [current], sym)
    if (next.states.length === 0) {
      steps.push({
        position: i + 1,
        symbol: sym,
        activeStates: [],
        previousStates: [current],
        traversedTransitionIds: [],
        description: `گذاری برای «${sym}» از حالت ${faNum(current)} تعریف نشده است (رد)`,
        status: 'stuck',
      })
      return { accepted: false, steps, finalStates: [] }
    }
    const target = next.states[0]
    steps.push({
      position: i + 1,
      symbol: sym,
      activeStates: [target],
      previousStates: [current],
      traversedTransitionIds: next.transitionIds,
      description: `خواندن «${sym}»: از ${faNum(current)} به ${faNum(target)}`,
      status: 'move',
    })
    current = target
  }

  const accepting = automaton.states.some(s => s.id === current && s.accepting)
  steps.push({
    position: input.length,
    symbol: null,
    activeStates: [current],
    previousStates: [current],
    traversedTransitionIds: [],
    description: accepting
      ? `پایان رشته در حالت پذیرش ${faNum(current)} — پذیرش`
      : `پایان رشته در حالت غیرپذیرش ${faNum(current)} — رد`,
    status: accepting ? 'accept' : 'reject',
  })

  return { accepted: accepting, steps, finalStates: [current] }
}

/*─────────────────────────────────────────────────────────────────────────────
  NFA / ε-NFA simulation — exact set-based simulation, supports empty string ε
─────────────────────────────────────────────────────────────────────────────*/

export function simulateNFA(raw: Automaton, input: string): SimResult {
  const automaton = normalizeAutomaton(raw)
  const steps: SimStep[] = []
  if (automaton.initialStateId === null) {
    return {
      accepted: false,
      steps: [{
        position: 0,
        symbol: null,
        activeStates: [],
        previousStates: [],
        traversedTransitionIds: [],
        description: 'حالت آغاز تعریف نشده است.',
        status: 'error',
      }],
      finalStates: [],
      error: 'ابتدا یک حالت آغاز برای اتوماتا مشخص کنید.',
    }
  }

  const initClosure = epsilonClosureWithEdges(automaton, [automaton.initialStateId])
  let active = initClosure.states
  const hasInitialEps = active.length > 1 || initClosure.epsilonTransitionIds.length > 0
  steps.push({
    position: 0,
    symbol: null,
    activeStates: active,
    previousStates: [automaton.initialStateId],
    traversedTransitionIds: initClosure.epsilonTransitionIds,
    description: hasInitialEps
      ? `بستار ε از حالت آغاز ${faNum(automaton.initialStateId)}: ${formatStates(active)}`
      : `آغاز اجرا از حالت ${faNum(automaton.initialStateId)}${input === '' ? ' (رشتهٔ تهی ε)' : ''}`,
    status: 'start',
  })

  for (let i = 0; i < input.length; i++) {
    const sym = input[i]
    const prev = active
    const moved = nextTransitionsOn(automaton, active, sym)
    if (moved.states.length === 0) {
      steps.push({
        position: i + 1,
        symbol: sym,
        activeStates: [],
        previousStates: prev,
        traversedTransitionIds: [],
        description: `خواندن «${sym}»: هیچ گذاری از ${formatStates(prev)} وجود ندارد (مجموعهٔ فعال ∅)`,
        status: 'stuck',
      })
      return { accepted: false, steps, finalStates: [] }
    }
    const closed = epsilonClosureWithEdges(automaton, moved.states)
    active = closed.states
    const epsNote =
      closed.states.length > moved.states.length
        ? ` و بستار ε برابر ${formatStates(active)}`
        : ''
    steps.push({
      position: i + 1,
      symbol: sym,
      activeStates: active,
      previousStates: prev,
      traversedTransitionIds: [...moved.transitionIds, ...closed.epsilonTransitionIds],
      description: `خواندن «${sym}»: ورود به ${formatStates(moved.states)}${epsNote}`,
      status: 'move',
    })
  }

  const acceptingStates = active.filter(sid => automaton.states.some(s => s.id === sid && s.accepting))
  const accepted = acceptingStates.length > 0
  steps.push({
    position: input.length,
    symbol: null,
    activeStates: active,
    previousStates: active,
    traversedTransitionIds: [],
    description: accepted
      ? `پایان رشته؛ حضور در حالت پذیرش ${formatStates(acceptingStates)} — پذیرش`
      : `پایان رشته؛ هیچ‌یک از حالت‌های فعال ${formatStates(active)} پذیرش نیست — رد`,
    status: accepted ? 'accept' : 'reject',
  })

  return { accepted, steps, finalStates: active }
}

/*─────────────────────────────────────────────────────────────────────────────
  Clean automatic 2D layered layout inside the 700×410 SVG stage
─────────────────────────────────────────────────────────────────────────────*/

export function layoutAutomaton(raw: Automaton): Automaton {
  const automaton = normalizeAutomaton(raw)
  const n = automaton.states.length
  if (n === 0) return automaton

  const layers = new Map<number, number>()
  const queue: number[] = []
  const startId = automaton.initialStateId ?? automaton.states[0].id
  layers.set(startId, 0)
  queue.push(startId)

  while (queue.length) {
    const cur = queue.shift()!
    const layer = layers.get(cur)!
    for (const t of transitionsFrom(automaton, cur)) {
      if (!layers.has(t.to)) {
        layers.set(t.to, layer + 1)
        queue.push(t.to)
      }
    }
  }

  let maxLayer = Math.max(0, ...layers.values())
  for (const s of automaton.states) {
    if (!layers.has(s.id)) {
      layers.set(s.id, ++maxLayer)
    }
  }

  const buckets = new Map<number, AutomatonState[]>()
  for (const s of automaton.states) {
    const l = layers.get(s.id)!
    if (!buckets.has(l)) buckets.set(l, [])
    buckets.get(l)!.push(s)
  }

  const layerKeys = [...buckets.keys()].sort((a, b) => a - b)
  const layerCount = layerKeys.length
  const leftPad = layerCount === 1 ? 350 : 95
  const rightPad = layerCount === 1 ? 350 : 610
  const xStep = layerCount > 1 ? (rightPad - leftPad) / (layerCount - 1) : 0

  const posMap = new Map<number, { x: number; y: number }>()
  layerKeys.forEach((lk, li) => {
    const group = buckets.get(lk)!
    group.sort((a, b) => a.id - b.id)
    const count = group.length
    const x = Math.round(leftPad + li * xStep)
    group.forEach((st, idx) => {
      const y = count === 1
        ? (li % 2 === 1 && layerCount >= 3 ? 185 : 205)
        : Math.round(78 + (idx * (332 - 78)) / (count - 1))
      posMap.set(st.id, { x, y })
    })
  })

  return {
    ...automaton,
    states: automaton.states.map(s => {
      const p = posMap.get(s.id)!
      return { ...s, x: p.x, y: p.y }
    }),
  }
}

/*─────────────────────────────────────────────────────────────────────────────
  NFA → DFA (Subset Construction) — exact, loop-safe, auto-laid out
─────────────────────────────────────────────────────────────────────────────*/

export type SubsetConversionResult = {
  automaton: Automaton
  stateSubsets: Record<number, number[]>
}

export function nfaToDfaWithSubsets(raw: Automaton): SubsetConversionResult {
  const automaton = normalizeAutomaton(raw)
  if (automaton.initialStateId === null || automaton.states.length === 0) {
    return { automaton, stateSubsets: {} }
  }

  const alphabet = deriveAlphabet(automaton)
  const startSet = epsilonClosure(automaton, [automaton.initialStateId])
  const setToId = new Map<string, number>()
  const stateSubsets: Record<number, number[]> = {}
  const dfaStates: AutomatonState[] = []
  const dfaTransitions: AutomatonTransition[] = []
  const queue: number[][] = []
  let nextId = 1

  const getOrCreateState = (arr: number[]): { id: number; created: boolean } => {
    const sorted = [...new Set(arr)].sort((a, b) => a - b)
    const key = sorted.join(',')
    const existing = setToId.get(key)
    if (existing !== undefined) return { id: existing, created: false }

    const id = nextId++
    setToId.set(key, id)
    stateSubsets[id] = sorted
    dfaStates.push({
      id,
      x: 0,
      y: 0,
      accepting: sorted.some(sid => automaton.states.some(s => s.id === sid && s.accepting)),
      label: `{${sorted.map(faNum).join('،')}}`,
    })
    return { id, created: true }
  }

  const initialEntry = getOrCreateState(startSet)
  queue.push(startSet)

  let qIdx = 0
  while (qIdx < queue.length) {
    const currentSet = queue[qIdx++]
    const { id: currentDfaId } = getOrCreateState(currentSet)

    for (const sym of alphabet) {
      const moved = nextTransitionsOn(automaton, currentSet, sym)
      if (moved.states.length === 0) continue
      const closure = epsilonClosure(automaton, moved.states)
      const targetEntry = getOrCreateState(closure)
      if (targetEntry.created) {
        queue.push(closure)
      }
      dfaTransitions.push({
        id: dfaTransitions.length + 1,
        from: currentDfaId,
        to: targetEntry.id,
        symbol: sym,
      })
    }
  }

  const dfa = layoutAutomaton({
    states: dfaStates,
    transitions: dfaTransitions,
    alphabet,
    initialStateId: initialEntry.id,
  })

  return { automaton: dfa, stateSubsets }
}

export function nfaToDfa(automaton: Automaton): Automaton {
  return nfaToDfaWithSubsets(automaton).automaton
}

/*─────────────────────────────────────────────────────────────────────────────
  DFA minimization (Partition Refinement) — exact
─────────────────────────────────────────────────────────────────────────────*/

export type MinimizationResult = {
  automaton: Automaton
  originalCount: number
  minimizedCount: number
  groups: number[][]
}

export function minimizeDfaDetailed(raw: Automaton): MinimizationResult {
  let automaton = normalizeAutomaton(raw)
  if (!automaton.states.length || automaton.initialStateId === null) {
    return {
      automaton,
      originalCount: automaton.states.length,
      minimizedCount: automaton.states.length,
      groups: [],
    }
  }

  const analysis = analyzeAutomaton(automaton)
  if (!analysis.isDeterministic) {
    automaton = nfaToDfa(automaton)
  }

  const originalCount = automaton.states.length
  const alphabet = deriveAlphabet(automaton)

  // Reachable states only
  const reachable = new Set<number>([automaton.initialStateId!])
  const stack = [automaton.initialStateId!]
  while (stack.length) {
    const cur = stack.pop()!
    for (const t of transitionsFrom(automaton, cur)) {
      if (!reachable.has(t.to)) {
        reachable.add(t.to)
        stack.push(t.to)
      }
    }
  }

  const states = automaton.states.filter(s => reachable.has(s.id))
  const accepting = states.filter(s => s.accepting).map(s => s.id).sort((a, b) => a - b)
  const nonAccepting = states.filter(s => !s.accepting).map(s => s.id).sort((a, b) => a - b)

  let partitions: number[][] = []
  if (accepting.length) partitions.push(accepting)
  if (nonAccepting.length) partitions.push(nonAccepting)

  const stateToPartition = new Map<number, number>()
  const reindex = () => {
    stateToPartition.clear()
    partitions.forEach((p, idx) => p.forEach(sid => stateToPartition.set(sid, idx)))
  }
  reindex()

  let changed = true
  while (changed) {
    changed = false
    const nextPartitions: number[][] = []
    for (const part of partitions) {
      if (part.length <= 1) {
        nextPartitions.push(part)
        continue
      }
      const groups = new Map<string, number[]>()
      for (const sid of part) {
        const signature = alphabet
          .map(sym => {
            const target = automaton.transitions.find(t => t.from === sid && t.symbol === sym)
            return target ? stateToPartition.get(target.to) ?? -1 : -1
          })
          .join(',')
        if (!groups.has(signature)) groups.set(signature, [])
        groups.get(signature)!.push(sid)
      }
      if (groups.size > 1) changed = true
      for (const g of groups.values()) nextPartitions.push(g.sort((a, b) => a - b))
    }
    partitions = nextPartitions
    reindex()
  }

  // Put initial state's partition first (id = 1)
  const initPartIdx = stateToPartition.get(automaton.initialStateId!)!
  if (initPartIdx > 0) {
    const [initPart] = partitions.splice(initPartIdx, 1)
    partitions.unshift(initPart)
    reindex()
  }

  const partToNewId = new Map<number, number>()
  const minStates: AutomatonState[] = partitions.map((part, idx) => {
    const newId = idx + 1
    partToNewId.set(idx, newId)
    const repState = states.find(s => s.id === part[0])!
    return {
      id: newId,
      x: repState.x,
      y: repState.y,
      accepting: repState.accepting,
      label: part.length > 1 ? `{${part.map(faNum).join('،')}}` : undefined,
    }
  })

  const minTransitions: AutomatonTransition[] = []
  const seen = new Set<string>()
  partitions.forEach((part, pIdx) => {
    const rep = part[0]
    const fromId = partToNewId.get(pIdx)!
    for (const sym of alphabet) {
      const target = automaton.transitions.find(t => t.from === rep && t.symbol === sym)
      if (!target) continue
      const toPartIdx = stateToPartition.get(target.to)
      if (toPartIdx === undefined) continue
      const toId = partToNewId.get(toPartIdx)!
      const key = `${fromId}-${toId}-${sym}`
      if (!seen.has(key)) {
        seen.add(key)
        minTransitions.push({ id: minTransitions.length + 1, from: fromId, to: toId, symbol: sym })
      }
    }
  })

  const resultAutomaton = layoutAutomaton({
    states: minStates,
    transitions: minTransitions,
    alphabet,
    initialStateId: 1,
  })

  return {
    automaton: resultAutomaton,
    originalCount,
    minimizedCount: resultAutomaton.states.length,
    groups: partitions,
  }
}

export function minimizeDfa(automaton: Automaton): Automaton {
  return minimizeDfaDetailed(automaton).automaton
}

/*─────────────────────────────────────────────────────────────────────────────
  Thompson's Construction — regex → ε-NFA (exact, deterministic, fixed!)
  Grammar:
    regex  → term ('|' term)*
    term   → factor+
    factor → base ('*' | '+' | '?')*
    base   → '(' regex ')' | literal | 'ε'
─────────────────────────────────────────────────────────────────────────────*/

type Frag = { start: number; accept: number }

type NfaBuilder = {
  states: AutomatonState[]
  transitions: AutomatonTransition[]
  nextId: number
}

function freshState(b: NfaBuilder): number {
  const id = b.nextId++
  b.states.push({ id, x: 0, y: 0, accepting: false })
  return id
}

function setAccept(b: NfaBuilder, id: number, accepting: boolean): void {
  const st = b.states.find(s => s.id === id)
  if (st) st.accepting = accepting
}

function addTransition(b: NfaBuilder, from: number, to: number, symbol: string): void {
  b.transitions.push({ id: b.transitions.length + 1, from, to, symbol })
}

function symbolNfa(b: NfaBuilder, sym: string): Frag {
  const s = freshState(b)
  const a = freshState(b)
  setAccept(b, a, true)
  addTransition(b, s, a, sym)
  return { start: s, accept: a }
}

function concatNfa(b: NfaBuilder, left: Frag, right: Frag): Frag {
  setAccept(b, left.accept, false)
  addTransition(b, left.accept, right.start, '')
  return { start: left.start, accept: right.accept }
}

function unionNfa(b: NfaBuilder, left: Frag, right: Frag): Frag {
  setAccept(b, left.accept, false)
  setAccept(b, right.accept, false)
  const s = freshState(b)
  const a = freshState(b)
  setAccept(b, a, true)
  addTransition(b, s, left.start, '')
  addTransition(b, s, right.start, '')
  addTransition(b, left.accept, a, '')
  addTransition(b, right.accept, a, '')
  return { start: s, accept: a }
}

function starNfa(b: NfaBuilder, f: Frag): Frag {
  setAccept(b, f.accept, false)
  const s = freshState(b)
  const a = freshState(b)
  setAccept(b, a, true)
  addTransition(b, s, f.start, '')
  addTransition(b, s, a, '')
  addTransition(b, f.accept, f.start, '')
  addTransition(b, f.accept, a, '')
  return { start: s, accept: a }
}

function plusNfa(b: NfaBuilder, f: Frag): Frag {
  setAccept(b, f.accept, false)
  const s = freshState(b)
  const a = freshState(b)
  setAccept(b, a, true)
  addTransition(b, s, f.start, '')
  addTransition(b, f.accept, f.start, '')
  addTransition(b, f.accept, a, '')
  return { start: s, accept: a }
}

function optionalNfa(b: NfaBuilder, f: Frag): Frag {
  setAccept(b, f.accept, false)
  const s = freshState(b)
  const a = freshState(b)
  setAccept(b, a, true)
  addTransition(b, s, f.start, '')
  addTransition(b, s, a, '')
  addTransition(b, f.accept, a, '')
  return { start: s, accept: a }
}

type RegexToken = { type: 'char' | 'op'; value: string }

function tokenize(regex: string): RegexToken[] {
  const tokens: RegexToken[] = []
  for (let i = 0; i < regex.length; i++) {
    const ch = regex[i]
    if (/\s/.test(ch)) continue
    if ('()|*+?'.includes(ch)) tokens.push({ type: 'op', value: ch })
    else if (ch === 'ε' || ch === 'ϵ') tokens.push({ type: 'char', value: '' })
    else tokens.push({ type: 'char', value: ch })
  }
  return tokens
}

class RegexParser {
  private tokens: RegexToken[]
  private pos = 0
  private b: NfaBuilder

  constructor(regex: string) {
    this.tokens = tokenize(regex)
    this.b = { states: [], transitions: [], nextId: 1 }
  }

  private peek(): RegexToken | null {
    return this.pos < this.tokens.length ? this.tokens[this.pos] : null
  }

  private consume(): RegexToken | null {
    return this.pos < this.tokens.length ? this.tokens[this.pos++] : null
  }

  private expect(value: string): boolean {
    const t = this.peek()
    return t !== null && t.type === 'op' && t.value === value
  }

  parse(): Frag {
    if (this.tokens.length === 0) {
      throw new Error('لطفاً یک عبارت منظم وارد کنید (مثلاً a*b یا (a|b)*)')
    }
    const frag = this.parseRegex()
    const leftover = this.peek()
    if (leftover !== null) {
      if (leftover.value === ')') throw new Error('پرانتز بستهٔ اضافی در عبارت وجود دارد')
      throw new Error(`عبارت نامعتبر در نزدیکی «${leftover.value}»`)
    }
    return frag
  }

  private parseRegex(): Frag {
    let frag = this.parseTerm()
    while (this.expect('|')) {
      this.consume()
      const right = this.parseTerm()
      frag = unionNfa(this.b, frag, right)
    }
    return frag
  }

  private parseTerm(): Frag {
    const first = this.peek()
    if (first === null || (first.type === 'op' && (first.value === '|' || first.value === ')'))) {
      throw new Error('عبارت خالی بین عملگرها مجاز نیست؛ برای رشتهٔ تهی از نماد ε استفاده کنید')
    }
    let frag = this.parseFactor()
    while (true) {
      const t = this.peek()
      if (t === null || (t.type === 'op' && (t.value === '|' || t.value === ')'))) break
      const next = this.parseFactor()
      frag = concatNfa(this.b, frag, next)
    }
    return frag
  }

  private parseFactor(): Frag {
    let frag = this.parseBase()
    while (true) {
      if (this.expect('*')) {
        this.consume()
        frag = starNfa(this.b, frag)
      } else if (this.expect('+')) {
        this.consume()
        frag = plusNfa(this.b, frag)
      } else if (this.expect('?')) {
        this.consume()
        frag = optionalNfa(this.b, frag)
      } else {
        break
      }
    }
    return frag
  }

  private parseBase(): Frag {
    const t = this.peek()
    if (t === null) throw new Error('عبارت ناقص به پایان رسیده است')
    if (t.type === 'op' && t.value === '(') {
      this.consume()
      if (this.expect(')')) throw new Error('پرانتز خالی () مجاز نیست؛ از (ε) استفاده کنید')
      const frag = this.parseRegex()
      if (!this.expect(')')) throw new Error('پرانتز باز بسته نشده است')
      this.consume()
      return frag
    }
    if (t.type === 'char') {
      this.consume()
      return symbolNfa(this.b, t.value)
    }
    throw new Error(`عملگر «${t.value}» بدون عملوند آمده است`)
  }

  build(): Automaton {
    const frag = this.parse()
    const alphabet = [...new Set(this.b.transitions.map(t => t.symbol).filter(s => s !== ''))].sort()
    return layoutAutomaton({
      states: this.b.states,
      transitions: this.b.transitions,
      alphabet,
      initialStateId: frag.start,
    })
  }
}

export function regexToNfa(regex: string): Automaton {
  return new RegexParser(regex).build()
}

/*─────────────────────────────────────────────────────────────────────────────
  DFA equivalence — exact product construction (handles implicit dead states)
─────────────────────────────────────────────────────────────────────────────*/

export function dfaEquivalent(rawA: Automaton, rawB: Automaton): boolean {
  const a = normalizeAutomaton(rawA)
  const b = normalizeAutomaton(rawB)
  if (!a.initialStateId || !b.initialStateId) return false

  const alphabet = [...new Set([...a.alphabet, ...b.alphabet])]
  const queue: [number | null, number | null][] = [[a.initialStateId, b.initialStateId]]
  const visited = new Set<string>()

  while (queue.length) {
    const [x, y] = queue.shift()!
    const key = `${x ?? 'dead'}-${y ?? 'dead'}`
    if (visited.has(key)) continue
    visited.add(key)

    const accA = x !== null && Boolean(a.states.find(s => s.id === x)?.accepting)
    const accB = y !== null && Boolean(b.states.find(s => s.id === y)?.accepting)
    if (accA !== accB) return false

    for (const sym of alphabet) {
      const na = x !== null ? (a.transitions.find(t => t.from === x && t.symbol === sym)?.to ?? null) : null
      const nb = y !== null ? (b.transitions.find(t => t.from === y && t.symbol === sym)?.to ?? null) : null
      queue.push([na, nb])
    }
  }
  return true
}

/*─────────────────────────────────────────────────────────────────────────────
  Sample Automata Presets
─────────────────────────────────────────────────────────────────────────────*/

export const sampleDfaMod3A: Automaton = {
  states: [
    { id: 1, x: 140, y: 205, accepting: true },
    { id: 2, x: 350, y: 115, accepting: false },
    { id: 3, x: 560, y: 205, accepting: false },
  ],
  transitions: [
    { id: 1, from: 1, to: 2, symbol: 'a' },
    { id: 2, from: 1, to: 1, symbol: 'b' },
    { id: 3, from: 2, to: 3, symbol: 'a' },
    { id: 4, from: 2, to: 2, symbol: 'b' },
    { id: 5, from: 3, to: 1, symbol: 'a' },
    { id: 6, from: 3, to: 3, symbol: 'b' },
  ],
  alphabet: ['a', 'b'],
  initialStateId: 1,
}

export const sampleNfaEpsilon: Automaton = {
  states: [
    { id: 1, x: 135, y: 205, accepting: false },
    { id: 2, x: 350, y: 115, accepting: true },
    { id: 3, x: 560, y: 205, accepting: true },
  ],
  transitions: [
    { id: 1, from: 1, to: 2, symbol: '' },
    { id: 2, from: 2, to: 2, symbol: 'a' },
    { id: 3, from: 2, to: 3, symbol: '' },
    { id: 4, from: 3, to: 3, symbol: 'b' },
  ],
  alphabet: ['a', 'b'],
  initialStateId: 1,
}

export const sampleNfaEndsWithAb: Automaton = {
  states: [
    { id: 1, x: 135, y: 205, accepting: false },
    { id: 2, x: 350, y: 205, accepting: false },
    { id: 3, x: 565, y: 205, accepting: true },
  ],
  transitions: [
    { id: 1, from: 1, to: 1, symbol: 'a' },
    { id: 2, from: 1, to: 1, symbol: 'b' },
    { id: 3, from: 1, to: 2, symbol: 'a' },
    { id: 4, from: 2, to: 3, symbol: 'b' },
  ],
  alphabet: ['a', 'b'],
  initialStateId: 1,
}

export const sampleDfaEvenAB: Automaton = {
  states: [
    { id: 1, x: 210, y: 115, accepting: true },
    { id: 2, x: 490, y: 115, accepting: false },
    { id: 3, x: 210, y: 295, accepting: false },
    { id: 4, x: 490, y: 295, accepting: false },
  ],
  transitions: [
    { id: 1, from: 1, to: 2, symbol: 'a' },
    { id: 2, from: 2, to: 1, symbol: 'a' },
    { id: 3, from: 1, to: 3, symbol: 'b' },
    { id: 4, from: 3, to: 1, symbol: 'b' },
    { id: 5, from: 2, to: 4, symbol: 'b' },
    { id: 6, from: 4, to: 2, symbol: 'b' },
    { id: 7, from: 3, to: 4, symbol: 'a' },
    { id: 8, from: 4, to: 3, symbol: 'a' },
  ],
  alphabet: ['a', 'b'],
  initialStateId: 1,
}

export const sampleDfaReducible: Automaton = {
  states: [
    { id: 1, x: 120, y: 205, accepting: false },
    { id: 2, x: 310, y: 110, accepting: true },
    { id: 3, x: 310, y: 300, accepting: true },
    { id: 4, x: 540, y: 205, accepting: false },
  ],
  transitions: [
    { id: 1, from: 1, to: 2, symbol: 'a' },
    { id: 2, from: 1, to: 3, symbol: 'b' },
    { id: 3, from: 2, to: 2, symbol: 'a' },
    { id: 4, from: 2, to: 4, symbol: 'b' },
    { id: 5, from: 3, to: 2, symbol: 'a' },
    { id: 6, from: 3, to: 4, symbol: 'b' },
    { id: 7, from: 4, to: 4, symbol: 'a' },
    { id: 8, from: 4, to: 4, symbol: 'b' },
  ],
  alphabet: ['a', 'b'],
  initialStateId: 1,
}

export type AutomatonPreset = {
  id: string
  title: string
  mode: 'dfa' | 'nfa'
  description: string
  sampleInputs: string[]
  automaton: Automaton
}

export const automatonPresets: AutomatonPreset[] = [
  {
    id: 'mod3a',
    title: 'تعداد aها مضرب ۳ (DFA)',
    mode: 'dfa',
    description: 'رشته‌هایی روی {a, b} که تعداد حرف a در آن‌ها بر ۳ بخش‌پذیر است.',
    sampleInputs: ['', 'aaa', 'abaab', 'baab', 'abb'],
    automaton: sampleDfaMod3A,
  },
  {
    id: 'ends-ab',
    title: 'پایان‌یافته به ab (NFA)',
    mode: 'nfa',
    description: 'اتوماتای غیرقطعی که تمام رشته‌های منتهی به «ab» را می‌پذیرد.',
    sampleInputs: ['ab', 'aab', 'baab', 'aba', ''],
    automaton: sampleNfaEndsWithAb,
  },
  {
    id: 'eps-astar-bstar',
    title: 'الگوی a*b* با ε-گذار (ε-NFA)',
    mode: 'nfa',
    description: 'گذارهای ε به ماشین اجازه می‌دهند بدون خواندن ورودی بین بخش aها و bها جابه‌جا شود.',
    sampleInputs: ['', 'aaabbb', 'aaa', 'bbb', 'aba'],
    automaton: sampleNfaEpsilon,
  },
  {
    id: 'even-ab',
    title: 'تعداد زوج از a و b (DFA)',
    mode: 'dfa',
    description: 'فقط رشته‌هایی پذیرفته می‌شوند که هم تعداد a و هم تعداد b زوج باشد.',
    sampleInputs: ['', 'aabb', 'abab', 'aab', 'aba'],
    automaton: sampleDfaEvenAB,
  },
  {
    id: 'reducible',
    title: 'DFA نیازمند کمینه‌سازی',
    mode: 'dfa',
    description: 'دو حالت پذیرش ۲ و ۳ رفتار یکسان دارند؛ کمینه‌سازی آن‌ها را ادغام می‌کند.',
    sampleInputs: ['a', 'aa', 'ba', 'ab', ''],
    automaton: sampleDfaReducible,
  },
]

/*─────────────────────────────────────────────────────────────────────────────
  Pumping Lemma for Regular Languages — mathematically exact tool
  Pumping Lemma: If L is regular, ∃p ≥ 1 s.t. ∀s ∈ L with |s| ≥ p,
  ∃x,y,z with s = xyz, |xy| ≤ p, |y| > 0, and ∀i ≥ 0: xy^i z ∈ L.
─────────────────────────────────────────────────────────────────────────────*/

export type PumpDecomposition = { x: string; y: string; z: string }

export type PumpTest = {
  decomposition: PumpDecomposition
  i: number
  pumped: string
  inLanguage: boolean
  reason: string
}

export type PumpingAnalysisResult = {
  decompositions: PumpDecomposition[]
  tests: PumpTest[]
  validDecompositions: PumpDecomposition[]
  counterexampleFound: boolean
}

export type LanguageCheckResult = {
  inLanguage: boolean
  reason: string
}

export type PumpingLanguageSpec = {
  id: 'anbn' | 'palindrome' | 'equalab' | 'square' | 'prime' | 'astarBstar'
  name: string
  formula: string
  isRegular: boolean
  description: string
  suggestString: (p: number) => string
  check: (s: string) => LanguageCheckResult
}

function isPrimeNumber(n: number): boolean {
  if (n < 2) return false
  for (let d = 2; d * d <= n; d++) {
    if (n % d === 0) return false
  }
  return true
}

export const pumpingLanguages: PumpingLanguageSpec[] = [
  {
    id: 'anbn',
    name: 'تعداد برابر a سپس b',
    formula: String.raw`L = \{ a^n b^n \mid n \ge 0 \}`,
    isRegular: false,
    description: 'ابتدا چند a و سپس دقیقاً به همان تعداد b می‌آید. اتوماتای متناهی نمی‌تواند تعداد نامحدود a را بشمارد.',
    suggestString: p => 'a'.repeat(p) + 'b'.repeat(p),
    check: s => {
      if (!/^a*b*$/.test(s)) {
        return { inLanguage: false, reason: 'ترتیب حروف باید به صورت a*b* باشد (ابتدا a و سپس b).' }
      }
      const na = (s.match(/a/g) || []).length
      const nb = (s.match(/b/g) || []).length
      if (na !== nb) {
        return {
          inLanguage: false,
          reason: `تعداد a (${faNum(na)}) با تعداد b (${faNum(nb)}) برابر نیست.`,
        }
      }
      return { inLanguage: true, reason: `رشته از قالب a^${faNum(na)} b^${faNum(nb)} پیروی می‌کند.` }
    },
  },
  {
    id: 'palindrome',
    name: 'پالیندروم‌های طول زوج (wwᴿ)',
    formula: String.raw`L = \{ w w^R \mid w \in \{a,b\}^* \}`,
    isRegular: false,
    description: 'نیمهٔ دوم رشته دقیقاً آینهٔ نیمهٔ اول است.',
    suggestString: p => `${'a'.repeat(p)}bb${'a'.repeat(p)}`,
    check: s => {
      if (!/^[ab]*$/.test(s)) {
        return { inLanguage: false, reason: 'فقط حروف a و b مجاز هستند.' }
      }
      if (s.length % 2 !== 0) {
        return { inLanguage: false, reason: `طول رشته (${faNum(s.length)}) فرد است و به شکل wwᴿ نیست.` }
      }
      const rev = s.split('').reverse().join('')
      if (s !== rev) {
        return { inLanguage: false, reason: 'رشته با معکوس خود برابر (قرینه) نیست.' }
      }
      return { inLanguage: true, reason: 'نیمهٔ دوم آینهٔ کامل نیمهٔ اول است.' }
    },
  },
  {
    id: 'equalab',
    name: 'تعداد مساوی a و b',
    formula: String.raw`L = \{ w \in \{a,b\}^* \mid n_a(w) = n_b(w) \}`,
    isRegular: false,
    description: 'تعداد aها و bها در رشته برابر است، بدون قید ترتیب. انتخاب رشتهٔ aᵖbᵖ نشان می‌دهد این زبان منظم نیست.',
    suggestString: p => 'a'.repeat(p) + 'b'.repeat(p),
    check: s => {
      if (!/^[ab]*$/.test(s)) {
        return { inLanguage: false, reason: 'فقط حروف a و b مجاز هستند.' }
      }
      const na = (s.match(/a/g) || []).length
      const nb = (s.match(/b/g) || []).length
      if (na !== nb) {
        return {
          inLanguage: false,
          reason: `تعداد a (${faNum(na)}) و b (${faNum(nb)}) مساوی نیست.`,
        }
      }
      return { inLanguage: true, reason: `هر دو حرف به تعداد ${faNum(na)} بار آمده‌اند.` }
    },
  },
  {
    id: 'square',
    name: 'طول مربع کامل',
    formula: String.raw`L = \{ a^{n^2} \mid n \ge 0 \}`,
    isRegular: false,
    description: 'فاصلهٔ بین مربع‌های متوالی پیوسته رشد می‌کند، پس با گام ثابت y نمی‌توان همواره روی مربع‌ها ماند.',
    suggestString: p => {
      const n = Math.ceil(Math.sqrt(Math.max(1, p)))
      return 'a'.repeat(n * n)
    },
    check: s => {
      if (!/^a*$/.test(s)) {
        return { inLanguage: false, reason: 'رشته فقط باید شامل حرف a باشد.' }
      }
      const root = Math.round(Math.sqrt(s.length))
      if (root * root !== s.length) {
        return { inLanguage: false, reason: `طول ${faNum(s.length)} مربع کامل نیست.` }
      }
      return { inLanguage: true, reason: `طول رشته برابر ${faNum(root)}² = ${faNum(s.length)} است.` }
    },
  },
  {
    id: 'prime',
    name: 'طول عدد اول',
    formula: String.raw`L = \{ a^q \mid q \text{ عدد اول است} \}`,
    isRegular: false,
    description: 'اگر |x|+|z| و |y| را با توان i مناسب پمپ کنیم، طول به عددی مرکب تبدیل می‌شود.',
    suggestString: p => {
      let q = Math.max(2, p)
      while (!isPrimeNumber(q)) q++
      return 'a'.repeat(q)
    },
    check: s => {
      if (!/^a*$/.test(s)) {
        return { inLanguage: false, reason: 'رشته فقط باید شامل حرف a باشد.' }
      }
      if (!isPrimeNumber(s.length)) {
        return { inLanguage: false, reason: `طول ${faNum(s.length)} عدد اول نیست.` }
      }
      return { inLanguage: true, reason: `طول ${faNum(s.length)} یک عدد اول است.` }
    },
  },
  {
    id: 'astarBstar',
    name: 'زبان منظم a*b* (برای مقایسه)',
    formula: String.raw`L = a^* b^*`,
    isRegular: true,
    description: 'یک زبان منظم واقعی؛ در اینجا برای هر رشته با |s| ≥ p دست‌کم یک افراز معتبر وجود دارد که برای تمام iها در L می‌ماند.',
    suggestString: p => 'a'.repeat(Math.max(1, p)) + 'b'.repeat(2),
    check: s => {
      if (!/^a*b*$/.test(s)) {
        return { inLanguage: false, reason: 'پس از b دیگر نباید a ظاهر شود.' }
      }
      return { inLanguage: true, reason: 'رشته در زبان منظم a*b* قرار دارد.' }
    },
  },
]

export function pumpDecompositions(s: string, p: number): PumpDecomposition[] {
  const result: PumpDecomposition[] = []
  const maxXY = Math.min(p, s.length)
  for (let xLen = 0; xLen <= maxXY; xLen++) {
    for (let yLen = 1; xLen + yLen <= maxXY; yLen++) {
      result.push({
        x: s.slice(0, xLen),
        y: s.slice(xLen, xLen + yLen),
        z: s.slice(xLen + yLen),
      })
    }
  }
  return result
}

export function testPumping(
  s: string,
  p: number,
  check: (str: string) => LanguageCheckResult | boolean,
  maxI = 4,
): PumpingAnalysisResult {
  const decompositions = pumpDecompositions(s, p)
  const tests: PumpTest[] = []
  const validDecompositions: PumpDecomposition[] = []

  const evaluate = (str: string): LanguageCheckResult => {
    const res = check(str)
    if (typeof res === 'boolean') {
      return { inLanguage: res, reason: res ? 'در زبان است.' : 'در زبان نیست.' }
    }
    return res
  }

  for (const d of decompositions) {
    let decompValid = true
    for (let i = 0; i <= maxI; i++) {
      const pumped = d.x + d.y.repeat(i) + d.z
      const res = evaluate(pumped)
      tests.push({
        decomposition: d,
        i,
        pumped,
        inLanguage: res.inLanguage,
        reason: res.reason,
      })
      if (!res.inLanguage) decompValid = false
    }
    if (decompValid) validDecompositions.push(d)
  }

  return {
    decompositions,
    tests,
    validDecompositions,
    counterexampleFound: decompositions.length > 0 && validDecompositions.length === 0,
  }
}

export function isAnBn(s: string): boolean {
  return pumpingLanguages[0].check(s).inLanguage
}

export function isAStar(s: string): boolean {
  return /^a*$/.test(s)
}
