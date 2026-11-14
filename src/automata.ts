export type AutomatonState = { id: number; x: number; y: number; accepting: boolean }
export type AutomatonTransition = { id: number; from: number; to: number; symbol: string } // '' = epsilon
export type Automaton = {
  states: AutomatonState[]
  transitions: AutomatonTransition[]
  alphabet: string[]
  initialStateId: number | null
}

export type SimStep = {
  position: number
  symbol: string | null
  activeStates: number[]
  description: string
}

export type SimResult = {
  accepted: boolean
  steps: SimStep[]
  finalStates: number[]
}

/*─────────────────────────────────────────────────────────────────────────────
 /helpers
─────────────────────────────────────────────────────────────────────────────*/

function transitionsFrom(automaton: Automaton, stateId: number): AutomatonTransition[] {
  return automaton.transitions.filter(t => t.from === stateId)
}

function nextStatesOn(
  automaton: Automaton,
  stateIds: number[],
  symbol: string,
): number[] {
  const found = new Set<number>()
  for (const sid of stateIds) {
    for (const t of transitionsFrom(automaton, sid)) {
      if (t.symbol === symbol && !found.has(t.to)) found.add(t.to)
    }
  }
  return [...found].sort((a, b) => a - b)
}

/*─────────────────────────────────────────────────────────────────────────────
 ε-closure for NFA
─────────────────────────────────────────────────────────────────────────────*/

export function epsilonClosure(
  automaton: Automaton,
  seeds: number[],
): number[] {
  const closure = new Set<number>(seeds)
  const stack = [...seeds]
  while (stack.length) {
    const current = stack.pop()!
    for (const t of transitionsFrom(automaton, current)) {
      if (t.symbol === '' && !closure.has(t.to)) {
        closure.add(t.to)
        stack.push(t.to)
      }
    }
  }
  return [...closure].sort((a, b) => a - b)
}

/*─────────────────────────────────────────────────────────────────────────────
DFA simulation — exact, deterministic, step-by-step
─────────────────────────────────────────────────────────────────────────────*/

export function simulateDFA(
  automaton: Automaton,
  input: string,
): SimResult {
  const steps: SimStep[] = []
  if (automaton.initialStateId === null) {
    return { accepted: false, steps, finalStates: [] }
  }

  let current = automaton.initialStateId
  steps.push({
    position: 0,
    symbol: null,
    activeStates: [current],
    description: `شروع از حالت ${faNum(current)}`,
  })

  for (let i = 0; i < input.length; i++) {
    const sym = input[i]
    const candidates = nextStatesOn(automaton, [current], sym)
    if (candidates.length === 0) {
      steps.push({
        position: i + 1,
        symbol: sym,
        activeStates: [],
        description: `خواندن '${sym}' از حالت ${faNum(current)} تعریف نشده است → رد`,
      })
      return { accepted: false, steps, finalStates: [] }
    }
    current = candidates[0]
    steps.push({
      position: i + 1,
      symbol: sym,
      activeStates: [current],
      description: `خواندن '${sym}' → رفتن به حالت ${faNum(current)}`,
    })
  }

  const accepting = automaton.states.some(s => s.id === current && s.accepting)
  steps.push({
    position: input.length,
    symbol: null,
    activeStates: [current],
    description: accepting ? 'پذیرش' : 'رد',
  })
  return { accepted: accepting, steps, finalStates: [current] }
}

/*─────────────────────────────────────────────────────────────────────────────
NFA simulation — exact set-based simulation, step-by-step
─────────────────────────────────────────────────────────────────────────────*/

export function simulateNFA(
  automaton: Automaton,
  input: string,
): SimResult {
  const steps: SimStep[] = []
  if (automaton.initialStateId === null) {
    return { accepted: false, steps, finalStates: [] }
  }

  let active = epsilonClosure(automaton, [automaton.initialStateId])
  steps.push({
    position: 0,
    symbol: null,
    activeStates: active,
    description: `بستار ε از حالت آغاز ${faNum(automaton.initialStateId)} → ${formatStates(active)}`,
  })

  for (let i = 0; i < input.length; i++) {
    const sym = input[i]
    const moved = nextStatesOn(automaton, active, sym)
    if (moved.length === 0) {
      steps.push({
        position: i + 1,
        symbol: sym,
        activeStates: [],
        description: `خواندن '${sym}': هیچ Übergang‌ای یافت نشد → رد`,
      })
      return { accepted: false, steps, finalStates: [] }
    }
    active = epsilonClosure(automaton, moved)
    steps.push({
      position: i + 1,
      symbol: sym,
      activeStates: active,
      description: `خواندن '${sym}' → حالت‌های فعال: ${formatStates(active)}`,
    })
  }

  const accepting = active.some(sid => automaton.states.some(s => s.id === sid && s.accepting))
  steps.push({
    position: input.length,
    symbol: null,
    activeStates: active,
    description: accepting ? 'پذیرش' : 'رد',
  })
  return { accepted: accepting, steps, finalStates: active }
}

/*─────────────────────────────────────────────────────────────────────────────
NFA → DFA (subset construction) — exact, deterministic
─────────────────────────────────────────────────────────────────────────────*/

export function nfaToDfa(automaton: Automaton): Automaton {
  if (automaton.initialStateId === null) return automaton

  const startSet = epsilonClosure(automaton, [automaton.initialStateId])
  const setToId = new Map<string, number>()
  const dfaStates: AutomatonState[] = []
  const dfaTransitions: AutomatonTransition[] = []
  let nextId = 1
  const queue: number[][] = [startSet]

  const setKey = (arr: number[]) => arr.join(',')
  const addState = (arr: number[]): number => {
    const key = setKey(arr)
    if (setToId.has(key)) return setToId.get(key)!
    const id = nextId++
    setToId.set(key, id)
    dfaStates.push({
      id,
      x: 0,
      y: 0,
      accepting: arr.some(sid => automaton.states.some(s => s.id === sid && s.accepting)),
    })
    return id
  }

  const initialDfaId = addState(startSet)
  let queueIndex = 0
  while (queueIndex < queue.length) {
    const currentSet = queue[queueIndex++]
    const currentDfaId = addState(currentSet)

    for (const sym of automaton.alphabet) {
      const moved = nextStatesOn(automaton, currentSet, sym)
      if (moved.length === 0) continue
      const closure = epsilonClosure(automaton, moved)
      const targetDfaId = addState(closure)
      queue.push(closure)
      dfaTransitions.push({
        id: dfaTransitions.length + 1,
        from: currentDfaId,
        to: targetDfaId,
        symbol: sym,
      })
    }
  }

  return {
    states: dfaStates,
    transitions: dfaTransitions,
    alphabet: automaton.alphabet,
    initialStateId: initialDfaId,
  }
}

/*─────────────────────────────────────────────────────────────────────────────
DFA minimization (Hopcroft-style partition refinement) — exact
─────────────────────────────────────────────────────────────────────────────*/

export function minimizeDfa(automaton: Automaton): Automaton {
  if (!automaton.states.length || automaton.initialStateId === null) return automaton

  // Remove unreachable states first
  const reachable = new Set<number>()
  const stack = [automaton.initialStateId]
  reachable.add(automaton.initialStateId)
  while (stack.length) {
    const current = stack.pop()!
    for (const t of transitionsFrom(automaton, current)) {
      if (!reachable.has(t.to)) { reachable.add(t.to); stack.push(t.to) }
    }
  }
  const states = automaton.states.filter(s => reachable.has(s.id))

  const accepting = new Set(states.filter(s => s.accepting).map(s => s.id))
  const nonAccepting = new Set(states.filter(s => !s.accepting).map(s => s.id))

  // Initial partition: accepting vs non-accepting
  const partitions: number[][] = []
  if (accepting.size) partitions.push([...accepting].sort((a, b) => a - b))
  if (nonAccepting.size) partitions.push([...nonAccepting].sort((a, b) => a - b))

  const stateToPartition = new Map<number, number>()
  states.forEach(s => {
    const pIdx = partitions.findIndex(p => p.includes(s.id))
    stateToPartition.set(s.id, pIdx)
  })

  let changed = true
  while (changed) {
    changed = false
    const newPartitions: number[][] = []
    for (const part of partitions) {
      const groups = new Map<string, number[]>()
      for (const sid of part) {
        const signature = automaton.alphabet.map(sym => {
          const targets = nextStatesOn(automaton, [sid], sym)
          return targets.length ? stateToPartition.get(targets[0]) : -1
        }).join(',')
        const key = signature
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key)!.push(sid)
      }
      if (groups.size > 1) changed = true
      for (const group of groups.values()) newPartitions.push(group.sort((a, b) => a - b))
    }
    partitions.splice(0, partitions.length, ...newPartitions)
    stateToPartition.clear()
    partitions.forEach((part, newIdx) => {
      part.forEach(sid => stateToPartition.set(sid, newIdx))
    })
  }

  // Build minimized automaton
  const mapToNewId = new Map<number, number>()
  const minStates: AutomatonState[] = []
  let nextId = 1
  partitions.forEach((part) => {
    const rep = part[0]
    const originalState = states.find(s => s.id === rep)!
    mapToNewId.set(rep, nextId)
    minStates.push({
      id: nextId++,
      x: originalState.x,
      y: originalState.y,
      accepting: originalState.accepting,
    })
  })

  const minTransitions: AutomatonTransition[] = []
  let tId = 1
  const seenTrans = new Set<string>()
  for (const part of partitions) {
    const rep = part[0]
    const fromId = mapToNewId.get(rep)!
    for (const sym of automaton.alphabet) {
      const targets = nextStatesOn(automaton, [rep], sym)
      if (!targets.length) continue
      const toRep = states.find(s => s.id === targets[0])!
      const toPartIdx = stateToPartition.get(toRep.id)!
      const toId = mapToNewId.get(partitions[toPartIdx][0])!
      const key = `${fromId}-${toId}-${sym}`
      if (!seenTrans.has(key)) {
        seenTrans.add(key)
        minTransitions.push({ id: tId++, from: fromId, to: toId, symbol: sym })
      }
    }
  }

  const minInitial = mapToNewId.get(
    partitions.find(p => p.includes(automaton.initialStateId!))![0]
  )!

  return {
    states: minStates,
    transitions: minTransitions,
    alphabet: automaton.alphabet,
    initialStateId: minInitial,
  }
}

/*─────────────────────────────────────────────────────────────────────────────
Utilities
─────────────────────────────────────────────────────────────────────────────*/

function faNum(n: number): string {
  return n.toLocaleString('fa-IR')
}

function formatStates(ids: number[]): string {
  return ids.map(faNum).join('، ')
}

/*─────────────────────────────────────────────────────────────────────────────
Sample automata for demonstration
─────────────────────────────────────────────────────────────────────────────*/

export const sampleDfaMod3A: Automaton = {
  states: [
    { id: 1, x: 120, y: 140, accepting: true },
    { id: 2, x: 340, y: 80, accepting: false },
    { id: 3, x: 560, y: 140, accepting: false },
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
    { id: 1, x: 120, y: 140, accepting: false },
    { id: 2, x: 340, y: 80, accepting: false },
    { id: 3, x: 560, y: 140, accepting: true },
  ],
  transitions: [
    { id: 1, from: 1, to: 2, symbol: '' },
    { id: 2, from: 1, to: 3, symbol: '' },
    { id: 3, from: 2, to: 2, symbol: 'a' },
    { id: 4, from: 3, to: 3, symbol: 'b' },
  ],
  alphabet: ['a', 'b'],
  initialStateId: 1,
}

/*─────────────────────────────────────────────────────────────────────────────
Thompson's Construction —regex → ε-NFA (exact, deterministic)
Grammar supported:
  regex  → term ('|' term)*
  term   → factor*
  factor → base ('*' )?
  base   → '(' regex ')' | literal | ε
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

function addTransition(b: NfaBuilder, from: number, to: number, symbol: string): void {
  b.transitions.push({ id: b.transitions.length + 1, from, to, symbol })
}

function symbolNfa(b: NfaBuilder, sym: string): Frag {
  const s = freshState(b)
  const a = freshState(b)
  b.states.find(st => st.id === a)!.accepting = true
  addTransition(b, s, a, sym)
  return { start: s, accept: a }
}

function concatNfa(b: NfaBuilder, left: Frag, right: Frag): Frag {
  addTransition(b, left.accept, right.start, '')
  return { start: left.start, accept: right.accept }
}

function unionNfa(b: NfaBuilder, left: Frag, right: Frag): Frag {
  const s = freshState(b)
  const a = freshState(b)
  b.states.find(st => st.id === a)!.accepting = true
  addTransition(b, s, left.start, '')
  addTransition(b, s, right.start, '')
  addTransition(b, left.accept, a, '')
  addTransition(b, right.accept, a, '')
  return { start: s, accept: a }
}

function starNfa(b: NfaBuilder, f: Frag): Frag {
  const s = freshState(b)
  const a = freshState(b)
  b.states.find(st => st.id === a)!.accepting = true
  addTransition(b, s, f.start, '')
  addTransition(b, s, a, '')
  addTransition(b, f.accept, f.start, '')
  addTransition(b, f.accept, a, '')
  return { start: s, accept: a }
}

type RegexToken = { type: 'char' | 'op'; value: string }

function tokenize(regex: string): RegexToken[] {
  const tokens: RegexToken[] = []
  for (let i = 0; i < regex.length; i++) {
    const ch = regex[i]
    if (ch === ' ') continue
    if ('()|*'.includes(ch)) tokens.push({ type: 'op', value: ch })
    else if (ch === 'ε') tokens.push({ type: 'char', value: '' })
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
    return t !== null && t.value === value
  }

  parse(): Frag {
    const frag = this.parseRegex()
    if (this.peek() !== null) {
      throw new Error('عبارت نامعتبر — بقیهٔ نامشخص در انتهای regex')
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
    let frag: Frag | null = null
    while (true) {
      const t = this.peek()
      if (t === null || t.value === '|' || t.value === ')') break
      const f = this.parseFactor()
      frag = frag === null ? f : concatNfa(this.b, frag, f)
    }
    return frag!
  }

  private parseFactor(): Frag {
    const base = this.parseBase()
    if (this.expect('*')) {
      this.consume()
      return starNfa(this.b, base)
    }
    return base
  }

  private parseBase(): Frag {
    const t = this.peek()
    if (t === null) throw new Error('عبارت ناقص — انتهای ناگهانی regex')
    if (t.value === '(') {
      this.consume()
      const frag = this.parseRegex()
      if (!this.expect(')')) throw new Error('پرانتز باز بسته نشده است')
      this.consume()
      return frag
    }
    if (t.type === 'char') {
      this.consume()
      return symbolNfa(this.b, t.value)
    }
    throw new Error(`توکن نامشخص: ${t.value}`)
  }

  build(): Automaton {
    const frag = this.parse()
    const alphabet = [...new Set(this.b.transitions.map(t => t.symbol).filter(s => s !== ''))]
    return {
      states: this.b.states,
      transitions: this.b.transitions,
      alphabet: alphabet.sort(),
      initialStateId: frag.start,
    }
  }
}

export function regexToNfa(regex: string): Automaton {
  const parser = new RegexParser(regex)
  return parser.build()
}

/*─────────────────────────────────────────────────────────────────────────────
DFA equivalence — exact (product construction + reachability)
─────────────────────────────────────────────────────────────────────────────*/

export function dfaEquivalent(a: Automaton, b: Automaton): boolean {
  if (!a.initialStateId || !b.initialStateId) return false
  const queue: [number, number][] = [[a.initialStateId, b.initialStateId]]
  const visited = new Set<string>()

  while (queue.length) {
    const [x, y] = queue.shift()!
    const key = `${x}-${y}`
    if (visited.has(key)) continue
    visited.add(key)

    const sa = a.states.find(s => s.id === x)
    const sb = b.states.find(s => s.id === y)
    if ((sa?.accepting || false) !== (sb?.accepting || false)) return false

    const alphabet = [...new Set([...a.alphabet, ...b.alphabet])]
    for (const sym of alphabet) {
      const ta = a.transitions.find(t => t.from === x && t.symbol === sym)
      const tb = b.transitions.find(t => t.from === y && t.symbol === sym)
      const na = ta ? ta.to : null
      const nb = tb ? tb.to : null
      if ((na === null) !== (nb === null)) return false
      if (na !== null && nb !== null) queue.push([na, nb])
    }
  }
  return true
}

/*─────────────────────────────────────────────────────────────────────────────
لم پمپاژ برای زبان‌های منظم — ابزار تعاملی مثال-Nقض
یک زبان منظم L با طول پمپ p دارد تا هر رشته s∈L با |s|≥p را
می‌توان s=xyz लिखा که |xy|≤p، |y|>۰ وxy^i z∈L برای تمام i≥۰.
─────────────────────────────────────────────────────────────────────────────*/

export type PumpDecomposition = { x: string; y: string; z: string }

export type PumpTest = {
  decomposition: PumpDecomposition
  i: number
  pumped: string
  inLanguage: boolean
  reason: string
}

/* تمامی decompositionها (x,y,z) بحيث |xy|≤p و |y|>۰ */
export function pumpDecompositions(s: string, p: number): PumpDecomposition[] {
  const result: PumpDecomposition[] = []
  const maxXY = Math.min(p, s.length)
  for (let xLen = 0; xLen <= maxXY; xLen++) {
    for (let yLen = 1; xLen + yLen <= maxXY; yLen++) {
      const x = s.slice(0, xLen)
      const y = s.slice(xLen, xLen + yLen)
      const z = s.slice(xLen + yLen)
      result.push({ x, y, z })
    }
  }
  return result
}

/* उ debout a language membership predicate */
export type LanguagePredicate = (s: string) => boolean

export function testPumping(
  s: string,
  p: number,
  inLanguage: LanguagePredicate,
): { decompositions: PumpDecomposition[]; tests: PumpTest[]; allPumpable: boolean } {
  const decomp = pumpDecompositions(s, p)
  const tests: PumpTest[] = []
  let allPumpable = true

  for (const d of decomp) {
    for (let i = 0; i <= 3; i++) {
      const pumped = d.x + d.y.repeat(i) + d.z
      const inLang = inLanguage(pumped)
      tests.push({
        decomposition: d,
        i,
        pumped,
        inLanguage: inLang,
        reason: inLang ? 'در زبان است' : 'نخست در زبان نیست',
      })
      if (!inLang) allPumpable = false
    }
  }

  return { decompositions: decomp, tests, allPumpable }
}

/* زبانهٔ مثال: a^n b^n (نه منظم) */
export function isAnBn(s: string): boolean {
  const match = /^a*b*$/.exec(s)
  if (!match) return false
  const aCount = (s.match(/a/g) || []).length
  const bCount = (s.match(/b/g) || []).length
  return aCount === bCount && aCount > 0
}

/* زبانهٔ مثال: a* (منظم) */
export function isAStar(s: string): boolean {
  return /^a*$/.test(s)
}
