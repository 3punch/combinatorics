import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, Atom, BookMarked, BookOpen, CheckCircle2, ChevronLeft,
  ChevronRight, Cpu, Download, ExternalLink, FileText, FlaskConical, GitBranch,
  GraduationCap, Grid3X3, Layers3, Network, Search, ShieldAlert, Sigma,
  Sparkles, X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Lesson from './Lesson'
import DigitalSection from './DigitalSection'
import { automataLessons } from './content/automata'

const PDF = '/notes/mabani-combinatorics.pdf'
const fa = (n: number) => n.toLocaleString('fa-IR')

export type LibraryTrack = 'combinatorics' | 'automata'
export type ExperimentTarget = 'lab' | 'automata' | 'pumping'

type Section = {
  title: string
  page: number
  key: string
  digitalOnly?: boolean
}

type Chapter = {
  id: string
  track: LibraryTrack
  number: number
  title: string
  start: number
  end: number
  description: string
  icon: LucideIcon
  tags: string[]
  sections: Section[]
}

const automataChapterMeta: {
  chapterId: number
  title: string
  description: string
  icon: LucideIcon
  tags: string[]
}[] = [
  {
    chapterId: 0,
    title: 'مقدمهٔ ریاضی',
    description: 'مجموعه‌ها، ضرب دکارتی، توابع، الفبا، رشته‌ها و استقرای ریاضی برای مدل‌سازی محاسبه.',
    icon: Sigma,
    tags: ['مجموعه', 'رشته و زبان', 'استقرا'],
  },
  {
    chapterId: 1,
    title: 'اتوماتای متناهی',
    description: 'ماشین‌های با حافظهٔ متناهی: DFA، NFA، گذارهای ε و عبارت‌های منظم.',
    icon: Atom,
    tags: ['DFA', 'NFA', 'عبارت منظم', 'تامپسون'],
  },
  {
    chapterId: 2,
    title: 'زبان‌های مستقل از متن',
    description: 'گرامرهای مستقل از متن (CFG)، اتوماتای پشته‌ای (PDA) و لم پمپاژ.',
    icon: GitBranch,
    tags: ['CFG', 'PDA', 'لم پمپاژ'],
  },
  {
    chapterId: 3,
    title: 'ماشین تورینگ',
    description: 'تعریف ماشین تورینگ، نوار بی‌نهایت و تز چرچ-تورینگ به عنوان مبنای الگوریتم.',
    icon: Cpu,
    tags: ['ماشین تورینگ', 'چرچ-تورینگ', 'محاسبه'],
  },
  {
    chapterId: 4,
    title: 'تصمیم‌پذیری',
    description: 'زبان‌های تصمیم‌پذیر و تورینگ-پذیرفتنی، هم‌ارزی DFAها و برهان قطری.',
    icon: Layers3,
    tags: ['تصمیم‌پذیری', 'A_TM', 'برهان قطری'],
  },
  {
    chapterId: 5,
    title: 'تصمیم‌ناپذیری',
    description: 'کاهش مسائل، مسئلهٔ توقف و قضیهٔ کلی رایس دربارهٔ محدودیت‌های الگوریتم‌ها.',
    icon: ShieldAlert,
    tags: ['مسئلهٔ توقف', 'قضیهٔ رایس', 'کاهش'],
  },
  {
    chapterId: 7,
    title: 'پیچیدگی محاسباتی (P و NP)',
    description: 'تحلیل زمان چندجمله‌ای، کلاس‌های P و NP، کاهش چندجمله‌ای و مسائل NP-کامل.',
    icon: Grid3X3,
    tags: ['P و NP', 'NP-کامل', 'کاهش چندجمله‌ای'],
  },
]

const combinatoricsRawChapters: {
  number: number
  title: string
  start: number
  end: number
  icon: LucideIcon
  description: string
  tags: string[]
  sections: { title: string; page: number }[]
}[] = [
  { number: 1, title: 'آنالیز ترکیبیاتی', start: 1, end: 38, icon: Sigma, description: 'پایهٔ شمارش؛ از اصل جمع و ضرب تا جایگشت، ترکیب و اصل لانه‌کبوتری.', tags: ['شمارش', 'جایگشت', 'لانه‌کبوتری'], sections: [
    { title: 'اصول اساسی شمارش', page: 1 }, { title: 'فاکتوریل‌ها', page: 9 }, { title: 'جایگشت‌ها', page: 11 },
    { title: 'ترکیب‌ها', page: 15 }, { title: 'جایگشت‌ها با تکرار', page: 24 }, { title: 'ترکیب‌ها با تکرار', page: 27 },
    { title: 'اصل لانه‌کبوتری', page: 29 }, { title: 'حل چند مسئلهٔ نمونه', page: 32 }, { title: 'تمرینات', page: 35 },
  ] },
  { number: 2, title: 'روابط بازگشتی', start: 39, end: 76, icon: Layers3, description: 'مدل‌سازی با بازگشت، معادلهٔ مشخصه، توابع مولد، بی‌نظمی‌ها و اعداد کتلان.', tags: ['بازگشت', 'تابع مولد', 'کتلان'], sections: [
    { title: 'مفهوم رابطهٔ بازگشتی', page: 39 }, { title: 'روش معادلهٔ معین', page: 43 }, { title: 'روش تابع مولد', page: 51 },
    { title: 'بی‌نظمی', page: 54 }, { title: 'اعداد کتلان', page: 58 }, { title: 'حل چند مسئلهٔ نمونه', page: 66 }, { title: 'تمرینات', page: 72 },
  ] },
  { number: 3, title: 'آشنایی با گراف', start: 77, end: 112, icon: Network, description: 'زبان گراف‌ها؛ یکریختی، گراف کامل، مسیر، دور و همبندی.', tags: ['گراف', 'یکریختی', 'همبندی'], sections: [
    { title: 'گراف‌ها', page: 77 }, { title: 'زیرگراف‌های یکریخت و مکمل گراف', page: 86 }, { title: 'مسیرها و دورها', page: 93 },
    { title: 'گراف‌های همبند', page: 97 }, { title: 'حل چند مسئلهٔ نمونه', page: 105 }, { title: 'تمرینات', page: 109 },
  ] },
  { number: 4, title: 'درخت، گراف دوبخشی و ماتریس‌ها', start: 113, end: 140, icon: GitBranch, description: 'درخت‌ها و نمایش ماتریسی گراف، همراه با گراف‌های دوبخشی.', tags: ['درخت', 'دوبخشی', 'ماتریس مجاورت'], sections: [
    { title: 'درخت‌ها', page: 113 }, { title: 'ماتریس مجاورت و وقوع', page: 120 }, { title: 'گراف دوبخشی', page: 125 },
    { title: 'حل چند مسئلهٔ نمونه', page: 134 }, { title: 'تمرینات', page: 138 },
  ] },
  { number: 5, title: 'گراف اویلری و همیلتونی', start: 141, end: 170, icon: FlaskConical, description: 'گذر از یال‌ها و رأس‌ها؛ گراف‌های اویلری، همیلتونی و جهت‌دار.', tags: ['اویلر', 'همیلتون', 'گراف جهت‌دار'], sections: [
    { title: 'گراف‌های اویلری', page: 141 }, { title: 'گراف‌های همیلتونی', page: 149 }, { title: 'گراف‌های جهت‌دار', page: 156 },
    { title: 'حل چند مسئلهٔ نمونه', page: 163 }, { title: 'تمرینات', page: 167 },
  ] },
  { number: 6, title: 'رنگ‌آمیزی گراف و خواص آن', start: 171, end: 190, icon: Grid3X3, description: 'رنگ‌آمیزی رأسی، عدد رنگی و آشنایی با گراف‌های مسطح.', tags: ['رنگ‌آمیزی', 'عدد رنگی', 'گراف مسطح'], sections: [
    { title: 'رنگ‌آمیزی رأسی', page: 171 }, { title: 'گراف‌های مسطح', page: 178 }, { title: 'حل چند مسئلهٔ نمونه', page: 184 }, { title: 'تمرینات', page: 187 },
  ] },
  { number: 7, title: 'مقدمه‌ای بر مربع‌های لاتین', start: 191, end: 228, icon: Atom, description: 'مربع‌های لاتین، سیستم‌های متمایزهای از نماینده و هندسهٔ متناهی.', tags: ['مربع لاتین', 'SDR', 'هندسهٔ متناهی'], sections: [
    { title: 'مربع‌های لاتین', page: 191 }, { title: 'سیستم‌های متمایزهای از نماینده', page: 203 }, { title: 'هندسهٔ متناهی', page: 211 },
    { title: 'صفحه‌های آفینی', page: 215 }, { title: 'حل چند مسئلهٔ نمونه', page: 224 }, { title: 'تمرینات', page: 226 },
  ] },
]

const combinatoricsChapters: Chapter[] = combinatoricsRawChapters.map(c => ({
  id: `c-${c.number}`,
  track: 'combinatorics',
  number: c.number,
  title: c.title,
  start: c.start,
  end: c.end,
  description: c.description,
  icon: c.icon,
  tags: c.tags,
  sections: c.sections.map((s, i) => ({
    title: s.title,
    page: s.page,
    key: `${c.number}.${i + 1}`,
  })),
}))

const automataChapters: Chapter[] = automataChapterMeta.map(meta => {
  const entries = Object.entries(automataLessons).filter(([, lesson]) => lesson.chapterId === meta.chapterId)
  return {
    id: `at-${meta.chapterId}`,
    track: 'automata',
    number: meta.chapterId,
    title: meta.title,
    start: 0,
    end: 0,
    description: meta.description,
    icon: meta.icon,
    tags: meta.tags,
    sections: entries.map(([key, lesson]) => ({
      title: lesson.title,
      page: lesson.startPage,
      key,
      digitalOnly: true,
    })),
  }
})

const allChapters: Chapter[] = [...combinatoricsChapters, ...automataChapters]

type CompletedItem = number | string

function formatBadgeKey(section: Section, chapterNumber: number, index: number): string {
  if (!section.digitalOnly) return section.key
  const clean = section.key.startsWith('at.') ? section.key.slice(3) : section.key
  const parts = clean.split('.')
  if (parts.length === 2) {
    return `${fa(Number(parts[0]))}٫${fa(Number(parts[1]))}`
  }
  return `${fa(chapterNumber)}٫${fa(index + 1)}`
}

function Library({
  onExperiment,
  initialTrack = 'combinatorics',
  onTrackChange,
}: {
  onExperiment: (target?: ExperimentTarget) => void
  initialTrack?: LibraryTrack
  onTrackChange?: (track: LibraryTrack) => void
}) {
  const [track, setTrack] = useState<LibraryTrack>(initialTrack)
  const lastSyncedTrack = useRef<LibraryTrack>(initialTrack)
  const [activeChapterId, setActiveChapterId] = useState(
    initialTrack === 'automata' ? 'at-1' : 'c-1',
  )
  const [query, setQuery] = useState('')
  const [reader, setReader] = useState<{ title: string; page: number } | null>(null)
  const [digitalLesson, setDigitalLesson] = useState<string | null>(null)
  const [completed, setCompleted] = useState<CompletedItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('tarkib-read-sections') || '[]')
    } catch {
      return []
    }
  })

  useEffect(() => {
    if (lastSyncedTrack.current === initialTrack) return
    lastSyncedTrack.current = initialTrack
    setTrack(initialTrack)
    setActiveChapterId(initialTrack === 'automata' ? 'at-1' : 'c-1')
    setReader(null)
    setDigitalLesson(null)
  }, [initialTrack])

  const trackChapters = track === 'combinatorics' ? combinatoricsChapters : automataChapters
  const chapter = trackChapters.find(c => c.id === activeChapterId) || trackChapters[0]

  const allTrackSections = useMemo(
    () => trackChapters.flatMap(c => c.sections.map(s => ({ ...s, chapter: c }))),
    [trackChapters],
  )
  const allLibrarySections = useMemo(
    () => allChapters.flatMap(c => c.sections.map(s => ({ ...s, chapter: c }))),
    [],
  )

  const isSectionRead = (s: { key: string; page: number; digitalOnly?: boolean }) =>
    s.digitalOnly
      ? completed.includes(s.key)
      : completed.includes(s.page) || completed.includes(s.key)

  const trackReadCount = allTrackSections.filter(isSectionRead).length
  const trackSectionCount = allTrackSections.length

  const searchResults = useMemo(() => {
    const q = query.trim()
    if (!q) return []
    return allLibrarySections.filter(s =>
      `${s.title} ${s.chapter.title} ${s.chapter.tags.join(' ')}`.toLowerCase().includes(q.toLowerCase()),
    )
  }, [query, allLibrarySections])

  const switchTrack = (nextTrack: LibraryTrack) => {
    lastSyncedTrack.current = nextTrack
    setTrack(nextTrack)
    setActiveChapterId(nextTrack === 'combinatorics' ? 'c-1' : 'at-1')
    setReader(null)
    setDigitalLesson(null)
    onTrackChange?.(nextTrack)
  }

  const openDigitalByKey = (key: string) => {
    const found = allLibrarySections.find(s => s.key === key)
    if (!found) return
    lastSyncedTrack.current = found.chapter.track
    setTrack(found.chapter.track)
    setActiveChapterId(found.chapter.id)
    setReader(null)
    setDigitalLesson(found.key)
    onTrackChange?.(found.chapter.track)
  }

  const openPdfSection = (title: string, bookPage: number) => {
    lastSyncedTrack.current = 'combinatorics'
    setTrack('combinatorics')
    setDigitalLesson(null)
    setReader({ title, page: bookPage + 5 })
    onTrackChange?.('combinatorics')
  }

  const toggleReadItem = (id: CompletedItem) => {
    const next = completed.includes(id)
      ? completed.filter(item => item !== id)
      : [...completed, id]
    setCompleted(next)
    localStorage.setItem('tarkib-read-sections', JSON.stringify(next))
  }

  const digitalIndex = allTrackSections.findIndex(s => s.key === digitalLesson)
  const digitalSection = digitalIndex >= 0 ? allTrackSections[digitalIndex] : null

  const openDigitalPdf = (page: number) => {
    if (!digitalSection || digitalSection.digitalOnly) return
    setDigitalLesson(null)
    setReader({ title: digitalSection.title, page: page + 5 })
  }

  const combSections = combinatoricsChapters.flatMap(c => c.sections)
  const currentPdfIndex = reader
    ? combSections.findIndex(s => s.page + 5 === reader.page && s.title === reader.title)
    : -1
  const movePdfSection = (direction: number) => {
    const next = combSections[currentPdfIndex + direction]
    if (next) openDigitalByKey(next.key)
  }

  const combinatoricsCount = combinatoricsChapters.reduce((sum, c) => sum + c.sections.length, 0)
  const automataCount = automataChapters.reduce((sum, c) => sum + c.sections.length, 0)

  return (
    <div className="library-page">
      <div className="page-heading library-heading">
        <div>
          <div className="eyebrow"><span /> منبع دانشگاهی و درس‌نامه‌های تعاملی</div>
          <h1>کتابخانهٔ ترکیب</h1>
          <p>درس‌نامه را بخوان، مفاهیم را مرور کن و سپس در آزمایشگاه محک بزن.</p>
        </div>
        <button className="secondary-btn" onClick={() => onExperiment(track === 'automata' ? 'automata' : 'lab')}>
          <FlaskConical size={17} /> {track === 'automata' ? 'ورود به آزمایشگاه اتوماتا' : 'بازگشت به آزمایشگاه گراف'}
        </button>
      </div>

      <div className="library-track-switch" role="tablist" aria-label="انتخاب کتابخانه">
        <button
          role="tab"
          aria-selected={track === 'combinatorics'}
          className={track === 'combinatorics' ? 'active' : ''}
          onClick={() => switchTrack('combinatorics')}
        >
          <BookMarked size={17} />
          <span>مبانی ترکیبیات</span>
          <em>{fa(combinatoricsCount)} بخش</em>
        </button>
        <button
          role="tab"
          aria-selected={track === 'automata'}
          className={track === 'automata' ? 'active' : ''}
          onClick={() => switchTrack('automata')}
        >
          <Atom size={17} />
          <span>نظریهٔ زبان‌ها و اتوماتا</span>
          <em>{fa(automataCount)} درس</em>
        </button>
      </div>

      {track === 'combinatorics' ? (
        <section className="source-card">
          <img src="/notes/cover.png" alt="جلد کتاب مبانی ترکیبیات" />
          <div className="source-info">
            <span className="source-label"><BookMarked size={14} /> منبع اصلی ترکیبیات</span>
            <h2>مبانی ترکیبیات</h2>
            <p>دکتر امیر مافی · دانشیار گروه ریاضی دانشگاه کردستان</p>
            <div className="source-meta">
              <span><FileText size={14} /> {fa(246)} صفحه</span>
              <span><Layers3 size={14} /> {fa(7)} فصل</span>
              <span><BookOpen size={14} /> {fa(combinatoricsCount)} بخش آموزشی</span>
            </div>
          </div>
          <div className="source-actions">
            <button className="light-btn" onClick={() => openDigitalByKey('1.1')}>
              <Sparkles size={16} /> درس‌نامهٔ وب
            </button>
            <button className="pdf-source-btn" onClick={() => openPdfSection('آغاز کتاب', 1)}>
              <BookOpen size={16} /> مطالعهٔ PDF
            </button>
            <a href={PDF} download="مبانی-ترکیبیات.pdf">
              <Download size={16} /> دانلود PDF
            </a>
          </div>
        </section>
      ) : (
        <section className="source-card automata-source-card">
          <div className="automata-cover-badge">
            <Atom size={36} strokeWidth={1.9} />
          </div>
          <div className="source-info">
            <span className="source-label"><Sparkles size={14} /> مجموعهٔ تألیفی نظریهٔ محاسبه</span>
            <h2>نظریهٔ زبان‌ها، اتوماتا و پیچیدگی</h2>
            <p>از مجموعه‌ها و اتوماتای متناهی تا گرامرهای مستقل از متن، ماشین تورینگ، تصمیم‌ناپذیری و کلاس‌های P و NP</p>
            <div className="source-meta">
              <span><Layers3 size={14} /> {fa(automataChapters.length)} فصل آموزشی</span>
              <span><BookOpen size={14} /> {fa(automataCount)} درس‌نامهٔ تعاملی وب</span>
              <span><FlaskConical size={14} /> متصل به آزمایشگاه اتوماتا و لم پمپاژ</span>
            </div>
          </div>
          <div className="source-actions">
            <button className="light-btn" onClick={() => openDigitalByKey('at.1.1')}>
              <Sparkles size={16} /> شروع با DFA
            </button>
            <button className="pdf-source-btn" onClick={() => onExperiment('automata')}>
              <Atom size={16} /> آزمایشگاه اتوماتا
            </button>
            <button className="pdf-source-btn" onClick={() => onExperiment('pumping')}>
              <FlaskConical size={16} /> آزمایشگاه لم پمپاژ
            </button>
          </div>
        </section>
      )}

      <div className="reading-progress">
        <div>
          <GraduationCap size={18} />
          <span>پیشرفت مطالعه در این بخش</span>
          <strong>{fa(trackReadCount)} بخش از {fa(trackSectionCount)}</strong>
        </div>
        <div className="reading-track">
          <i style={{ width: `${Math.min(100, trackSectionCount ? (trackReadCount / trackSectionCount) * 100 : 0)}%` }} />
        </div>
        <span>{fa(trackSectionCount ? Math.round((trackReadCount / trackSectionCount) * 100) : 0)}٪</span>
      </div>

      <div className="library-layout">
        <aside className="chapters-panel">
          <div className="library-search">
            <Search size={17} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="جست‌وجو در همهٔ سرفصل‌ها..."
            />
            {query && <button onClick={() => setQuery('')}><X size={15} /></button>}
          </div>

          {query ? (
            <div className="search-results">
              <div className="chapter-list-label">{fa(searchResults.length)} نتیجه برای «{query}»</div>
              {searchResults.map(s => (
                <button key={s.key} onClick={() => openDigitalByKey(s.key)}>
                  <span>
                    {s.title}
                    <small>
                      {s.chapter.track === 'automata' ? 'اتوماتا · ' : 'ترکیبیات · '}
                      فصل {fa(s.chapter.number)}
                      {!s.digitalOnly ? ` · صفحهٔ ${fa(s.page)}` : ''}
                    </small>
                  </span>
                  <ChevronLeft size={16} />
                </button>
              ))}
              {!searchResults.length && <div className="no-results">سرفصلی با این عنوان پیدا نشد.</div>}
            </div>
          ) : (
            <>
              <div className="chapter-list-label">
                {track === 'combinatorics' ? 'فصل‌های کتاب' : 'فصل‌های نظریهٔ محاسبه'}
              </div>
              <div className="chapter-list">
                {trackChapters.map(c => (
                  <button
                    key={c.id}
                    className={chapter.id === c.id && !reader ? 'active' : ''}
                    onClick={() => {
                      setActiveChapterId(c.id)
                      setReader(null)
                      setDigitalLesson(null)
                    }}
                  >
                    <span className="chapter-number">{fa(c.number)}</span>
                    <span className="chapter-button-text">
                      <strong>{c.title}</strong>
                      <small>
                        {track === 'combinatorics'
                          ? `صفحهٔ ${fa(c.start)} تا ${fa(c.end)}`
                          : `${fa(c.sections.length)} درس‌نامهٔ تعاملی`}
                      </small>
                    </span>
                    <ChevronLeft size={16} />
                  </button>
                ))}
              </div>
              {track === 'combinatorics' && (
                <div className="book-extras">
                  <button onClick={() => openPdfSection('کتاب‌نامه', 229)}>کتاب‌نامه<span>{fa(229)}</span></button>
                  <button onClick={() => openPdfSection('فهرست نمادها', 231)}>فهرست نمادها<span>{fa(231)}</span></button>
                  <button onClick={() => openPdfSection('واژه‌نامه', 235)}>واژه‌نامه<span>{fa(235)}</span></button>
                </div>
              )}
            </>
          )}
        </aside>

        <section className="reading-panel">
          {digitalLesson === '1.1' ? (
            <Lesson
              onBack={() => setDigitalLesson(null)}
              onPdf={() => { setDigitalLesson(null); setReader({ title: 'اصول اساسی شمارش', page: 6 }) }}
              onNext={() => openDigitalByKey('1.2')}
              isRead={completed.includes(1)}
              onToggleRead={() => toggleReadItem(1)}
            />
          ) : digitalLesson && digitalSection ? (
            <DigitalSection
              lessonKey={digitalLesson}
              onBack={() => setDigitalLesson(null)}
              onPdf={openDigitalPdf}
              onNavigate={openDigitalByKey}
              onOpenLab={target => onExperiment(target)}
              previousKey={allTrackSections[digitalIndex - 1]?.key}
              nextKey={allTrackSections[digitalIndex + 1]?.key}
              isRead={isSectionRead(digitalSection)}
              onToggleRead={() => toggleReadItem(digitalSection.digitalOnly ? digitalSection.key : digitalSection.page)}
            />
          ) : reader ? (
            <div className="pdf-reader">
              <div className="reader-head">
                <button className="reader-back" onClick={() => setReader(null)}>
                  <ChevronRight size={17} /> سرفصل‌ها
                </button>
                <div>
                  <strong>{reader.title}</strong>
                  <span>صفحهٔ {fa(reader.page - 5)} از کتاب · صفحهٔ {fa(reader.page)} از PDF</span>
                </div>
                <a href={`${PDF}#page=${reader.page}`} target="_blank" rel="noreferrer" title="بازکردن در برگهٔ جدید">
                  <ExternalLink size={17} />
                </a>
              </div>
              <iframe
                key={`${reader.page}-${reader.title}`}
                src={`${PDF}#page=${reader.page}&zoom=page-width&toolbar=0&navpanes=0`}
                title={`جزوه مبانی ترکیبیات — ${reader.title}`}
              />
              <div className="reader-footer">
                <div>
                  <button disabled={currentPdfIndex <= 0} onClick={() => movePdfSection(-1)}>
                    <ChevronRight size={16} /> بخش قبل
                  </button>
                  <button disabled={currentPdfIndex < 0 || currentPdfIndex >= combSections.length - 1} onClick={() => movePdfSection(1)}>
                    بخش بعد <ChevronLeft size={16} />
                  </button>
                </div>
                <button
                  className={`mark-read ${completed.includes(reader.page - 5) ? 'read' : ''}`}
                  onClick={() => toggleReadItem(reader.page - 5)}
                >
                  <CheckCircle2 size={16} />
                  {completed.includes(reader.page - 5) ? 'خوانده شده' : 'علامت به‌عنوان خوانده‌شده'}
                </button>
              </div>
            </div>
          ) : (
            <div className="chapter-overview">
              <div className="chapter-hero">
                <div className="big-chapter-icon"><chapter.icon size={30} /></div>
                <div>
                  <span>
                    فصل {fa(chapter.number)}
                    {chapter.track === 'combinatorics' ? ` · صفحهٔ ${fa(chapter.start)}` : ' · نظریهٔ زبان‌ها و ماشین‌ها'}
                  </span>
                  <h2>{chapter.title}</h2>
                  <p>{chapter.description}</p>
                </div>
              </div>
              <div className="chapter-tags">{chapter.tags.map(t => <span key={t}>{t}</span>)}</div>
              <div className="section-list-head">
                <h3>سرفصل‌های این فصل</h3>
                <span>{fa(chapter.sections.length)} بخش</span>
              </div>
              <div className="section-list">
                {chapter.sections.map((s, i) => {
                  const done = isSectionRead(s)
                  return (
                    <button key={s.key} onClick={() => openDigitalByKey(s.key)}>
                      <span className={`section-check ${done ? 'done' : ''}`}>
                        {done ? <CheckCircle2 size={16} /> : fa(i + 1)}
                      </span>
                      <span>
                        <strong>{formatBadgeKey(s, chapter.number, i)} · {s.title}</strong>
                        <small>
                          {s.digitalOnly ? (
                            <em className="digital-tag">درس‌نامهٔ وب</em>
                          ) : (
                            <>صفحهٔ {fa(s.page)} <em className="digital-tag">درس‌نامهٔ وب</em> <BookOpen size={14} /></>
                          )}
                        </small>
                      </span>
                    </button>
                  )
                })}
              </div>

              {chapter.track === 'combinatorics' && chapter.number >= 3 && chapter.number <= 6 && (
                <button className="experiment-link" onClick={() => onExperiment('lab')}>
                  <div>
                    <FlaskConical size={21} />
                    <span>
                      <strong>وقت آزمایش کردن است!</strong>
                      <small>مفاهیم این فصل را روی گراف خودتان بررسی کنید.</small>
                    </span>
                  </div>
                  <ArrowLeft size={19} />
                </button>
              )}

              {chapter.track === 'automata' && chapter.number <= 2 && (
                <button
                  className="experiment-link"
                  onClick={() => onExperiment(chapter.number === 2 ? 'pumping' : 'automata')}
                >
                  <div>
                    <FlaskConical size={21} />
                    <span>
                      <strong>وقت آزمایش کردن است!</strong>
                      <small>
                        {chapter.number === 2
                          ? 'افراز رشته‌ها و مثال‌نقض‌های لم پمپاژ را به صورت تعاملی در آزمایشگاه لم پمپاژ بیازمایید.'
                          : 'ساختن DFA و NFA، تبدیل زیرمجموعه‌ای و عبارت‌های منظم را در آزمایشگاه اتوماتا تجربه کنید.'}
                      </small>
                    </span>
                  </div>
                  <ArrowLeft size={19} />
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      <div className="source-credit">
        {track === 'combinatorics'
          ? 'متن و ساختار کتاب مبانی ترکیبیات متعلق به مؤلف است؛ این نسخه فقط برای مطالعه و استفادهٔ آموزشی داخل پروژه قرار گرفته است.'
          : 'محتوای درس‌نامه‌های نظریهٔ زبان‌ها و ماشین‌ها به صورت مستقل و تألیفی برای آزمایشگاه «تَرکیب» نگارش شده است.'}
      </div>
    </div>
  )
}

export default Library
