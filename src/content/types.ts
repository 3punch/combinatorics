export type CuratedBlock = {
  kind: 'text' | 'definition' | 'theorem' | 'note' | 'example' | 'exercise'
  title: string
  body?: string
  formula?: string
  problem?: string
  solution?: string
}

export type CuratedLesson = {
  title: string
  chapter: string
  chapterId: number
  startPage: number
  endPage: number
  intro: string
  outcomes: string[]
  blocks: CuratedBlock[]
}

export type CuratedLessons = Record<string, CuratedLesson>
