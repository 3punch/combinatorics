export type Vertex = { id: number; x: number; y: number }
export type Edge = { id: number; a: number; b: number }
export type Graph = { vertices: Vertex[]; edges: Edge[] }

export const initialGraph: Graph = {
  vertices: [
    { id: 1, x: 142, y: 112 }, { id: 2, x: 342, y: 72 },
    { id: 3, x: 555, y: 132 }, { id: 4, x: 166, y: 324 },
    { id: 5, x: 374, y: 274 }, { id: 6, x: 566, y: 337 },
  ],
  edges: [
    { id: 1, a: 1, b: 2 }, { id: 2, a: 2, b: 3 },
    { id: 3, a: 1, b: 4 }, { id: 4, a: 2, b: 5 },
    { id: 5, a: 4, b: 5 }, { id: 6, a: 5, b: 6 },
    { id: 7, a: 3, b: 6 }, { id: 8, a: 1, b: 5 },
  ],
}

export const triangleGraph: Graph = {
  vertices: [{ id: 1, x: 350, y: 80 }, { id: 2, x: 180, y: 325 }, { id: 3, x: 520, y: 325 }],
  edges: [{ id: 1, a: 1, b: 2 }, { id: 2, a: 2, b: 3 }, { id: 3, a: 1, b: 3 }],
}

export const completeGraph = (n: number): Graph => ({
  vertices: Array.from({ length: n }, (_, i) => ({
    id: i + 1, x: 350 + 215 * Math.cos(-Math.PI / 2 + i * 2 * Math.PI / n),
    y: 205 + 155 * Math.sin(-Math.PI / 2 + i * 2 * Math.PI / n),
  })),
  edges: Array.from({ length: n }, (_, a) => Array.from({ length: n - a - 1 }, (_, j) => ({
    id: a * n + j + 1, a: a + 1, b: a + j + 2,
  }))).flat(),
})

export function degree(graph: Graph, id: number) {
  return graph.edges.filter(e => e.a === id || e.b === id).length
}

export function components(graph: Graph) {
  const unseen = new Set(graph.vertices.map(v => v.id))
  let count = 0
  while (unseen.size) {
    count++
    const start = unseen.values().next().value as number
    const stack = [start]
    unseen.delete(start)
    while (stack.length) {
      const current = stack.pop()!
      graph.edges.forEach(e => {
        const next = e.a === current ? e.b : e.b === current ? e.a : null
        if (next !== null && unseen.has(next)) { unseen.delete(next); stack.push(next) }
      })
    }
  }
  return count
}

export function isBipartite(graph: Graph) {
  const colors = new Map<number, number>()
  for (const vertex of graph.vertices) {
    if (colors.has(vertex.id)) continue
    colors.set(vertex.id, 0)
    const queue = [vertex.id]
    while (queue.length) {
      const current = queue.shift()!
      for (const e of graph.edges) {
        const next = e.a === current ? e.b : e.b === current ? e.a : null
        if (next === null) continue
        if (!colors.has(next)) { colors.set(next, 1 - colors.get(current)!); queue.push(next) }
        else if (colors.get(next) === colors.get(current)) return false
      }
    }
  }
  return true
}

export function chromaticNumber(graph: Graph) {
  const n = graph.vertices.length
  if (!n) return 0
  if (!graph.edges.length) return 1
  const ids = graph.vertices.map(v => v.id)
  for (let k = 2; k <= n; k++) {
    const colors = new Map<number, number>()
    const ordered = [...ids].sort((a, b) => degree(graph, b) - degree(graph, a))
    const solve = (index: number): boolean => {
      if (index === n) return true
      const id = ordered[index]
      const used = new Set(graph.edges.flatMap(e => e.a === id ? [colors.get(e.b)] : e.b === id ? [colors.get(e.a)] : []))
      for (let c = 0; c < k; c++) if (!used.has(c)) {
        colors.set(id, c)
        if (solve(index + 1)) return true
      }
      colors.delete(id)
      return false
    }
    if (solve(0)) return k
  }
  return n
}

export function chromaticColoring(graph: Graph) {
  const result = new Map<number, number>()
  const k = chromaticNumber(graph)
  const ordered = [...graph.vertices].sort((a, b) => degree(graph, b.id) - degree(graph, a.id))
  const solve = (index: number): boolean => {
    if (index === ordered.length) return true
    const id = ordered[index].id
    const used = new Set(graph.edges.flatMap(e => e.a === id ? [result.get(e.b)] : e.b === id ? [result.get(e.a)] : []))
    for (let color = 0; color < k; color++) if (!used.has(color)) {
      result.set(id, color)
      if (solve(index + 1)) return true
      result.delete(id)
    }
    return false
  }
  solve(0)
  return result
}

export function hasCycle(graph: Graph) {
  if (graph.edges.length === 0) return false
  const seen = new Set<number>()
  const visit = (id: number, parent: number | null): boolean => {
    seen.add(id)
    for (const e of graph.edges) {
      const next = e.a === id ? e.b : e.b === id ? e.a : null
      if (next === null || next === parent) continue
      if (seen.has(next) || visit(next, id)) return true
    }
    return false
  }
  return graph.vertices.some(v => !seen.has(v.id) && visit(v.id, null))
}

export function graphAnalysis(graph: Graph) {
  const n = graph.vertices.length
  const degrees = graph.vertices.map(v => degree(graph, v.id))
  const odd = degrees.filter(d => d % 2).length
  const connected = n > 0 && components(graph) === 1
  return {
    n, m: graph.edges.length, components: components(graph), connected,
    bipartite: isBipartite(graph), chromatic: chromaticNumber(graph),
    tree: connected && graph.edges.length === n - 1,
    cycle: hasCycle(graph), degrees,
    eulerPath: n > 0 && connected && (odd === 0 || odd === 2),
    eulerCircuit: n > 0 && connected && odd === 0,
    handshake: degrees.reduce((a, b) => a + b, 0),
  }
}

export const conjectures = [
  { id: 'tree', title: 'همبند با n−۱ یال، درخت است؟', description: 'بررسی قضیهٔ بنیادی درخت‌ها روی گراف شما', test: (g: Graph) => !graphAnalysis(g).connected || g.edges.length !== g.vertices.length - 1 || graphAnalysis(g).tree },
  { id: 'even', title: 'درجه‌های زوج ⇒ دوبخشی؟', description: 'آیا زوج بودن همهٔ درجه‌ها دوبخشی بودن را تضمین می‌کند؟', test: (g: Graph) => graphAnalysis(g).degrees.some(d => d % 2 !== 0) || graphAnalysis(g).bipartite },
  { id: 'degree', title: 'حداقل درجهٔ ۲ ⇒ وجود دور؟', description: 'بررسی رابطهٔ حداقل درجه و وجود دور', test: (g: Graph) => graphAnalysis(g).degrees.some(d => d < 2) || graphAnalysis(g).cycle },
  { id: 'euler', title: 'همبندی ⇒ دور اویلری؟', description: 'آیا هر گراف همبند دور اویلری دارد؟', test: (g: Graph) => !graphAnalysis(g).connected || graphAnalysis(g).eulerCircuit },
]
