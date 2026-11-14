import { useMemo, useState } from 'react'
import {
  ArrowLeft, Atom, BookMarked, BookOpen, CheckCircle2, ChevronLeft,
  ChevronRight, Download, ExternalLink, FileText, FlaskConical, GitBranch, GraduationCap,
  Grid3X3, Layers3, Network, Search, Sigma, Sparkles, X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Lesson from './Lesson'
import DigitalSection from './DigitalSection'
import { automataLessons } from './content/automata'

const PDF = '/notes/mabani-combinatorics.pdf'
const fa = (n: number) => n.toLocaleString('fa-IR')

type Section = { title: string; page: number; digitalOnly?: boolean; key?: string }
type Chapter = {
  id: number; title: string; start: number; end: number; description: string;
  icon: LucideIcon; tags: string[]; sections: Section[]
}

const chapters: Chapter[] = [
  { id: 1, title: 'آنالیز ترکیبیاتی', start: 1, end: 38, icon: Sigma, description: 'پایهٔ شمارش؛ از اصل جمع و ضرب تا جایگشت، ترکیب و اصل لانه‌کبوتری.', tags: ['شمارش', 'جایگشت', 'لانه‌کبوتری'], sections: [
    { title: 'اصول اساسی شمارش', page: 1 }, { title: 'فاکتوریل‌ها', page: 9 }, { title: 'جایگشت‌ها', page: 11 },
    { title: 'ترکیب‌ها', page: 15 }, { title: 'جایگشت‌ها با تکرار', page: 24 }, { title: 'ترکیب‌ها با تکرار', page: 27 },
    { title: 'اصل لانه‌کبوتری', page: 29 }, { title: 'حل چند مسئلهٔ نمونه', page: 32 }, { title: 'تمرینات', page: 35 },
  ] },
  { id: 2, title: 'روابط بازگشتی', start: 39, end: 76, icon: Layers3, description: 'مدل‌سازی با بازگشت، معادلهٔ مشخصه، توابع مولد، بی‌نظمی‌ها و اعداد کتلان.', tags: ['بازگشت', 'تابع مولد', 'کتلان'], sections: [
    { title: 'مفهوم رابطهٔ بازگشتی', page: 39 }, { title: 'روش معادلهٔ معین', page: 43 }, { title: 'روش تابع مولد', page: 51 },
    { title: 'بی‌نظمی', page: 54 }, { title: 'اعداد کتلان', page: 58 }, { title: 'حل چند مسئلهٔ نمونه', page: 66 }, { title: 'تمرینات', page: 72 },
  ] },
  { id: 3, title: 'آشنایی با گراف', start: 77, end: 112, icon: Network, description: 'زبان گراف‌ها؛ یکریختی، گراف کامل، مسیر، دور و همبندی.', tags: ['گراف', 'یکریختی', 'همبندی'], sections: [
    { title: 'گراف‌ها', page: 77 }, { title: 'زیرگراف‌های یکریخت و مکمل گراف', page: 86 }, { title: 'مسیرها و دورها', page: 93 },
    { title: 'گراف‌های همبند', page: 97 }, { title: 'حل چند مسئلهٔ نمونه', page: 105 }, { title: 'تمرینات', page: 109 },
  ] },
  { id: 4, title: 'درخت، گراف دوبخشی و ماتریس‌ها', start: 113, end: 140, icon: GitBranch, description: 'درخت‌ها و نمایش ماتریسی گراف، همراه با گراف‌های دوبخشی.', tags: ['درخت', 'دوبخشی', 'ماتریس مجاورت'], sections: [
    { title: 'درخت‌ها', page: 113 }, { title: 'ماتریس مجاورت و وقوع', page: 120 }, { title: 'گراف دوبخشی', page: 125 },
    { title: 'حل چند مسئلهٔ نمونه', page: 134 }, { title: 'تمرینات', page: 138 },
  ] },
  { id: 5, title: 'گراف اویلری و همیلتونی', start: 141, end: 170, icon: FlaskConical, description: 'گذر از یال‌ها و رأس‌ها؛ گراف‌های اویلری، همیلتونی و جهت‌دار.', tags: ['اویلر', 'همیلتون', 'گراف جهت‌دار'], sections: [
    { title: 'گراف‌های اویلری', page: 141 }, { title: 'گراف‌های همیلتونی', page: 149 }, { title: 'گراف‌های جهت‌دار', page: 156 },
    { title: 'حل چند مسئلهٔ نمونه', page: 163 }, { title: 'تمرینات', page: 167 },
  ] },
  { id: 6, title: 'رنگ‌آمیزی گراف و خواص آن', start: 171, end: 190, icon: Grid3X3, description: 'رنگ‌آمیزی رأسی، عدد رنگی و آشنایی با گراف‌های مسطح.', tags: ['رنگ‌آمیزی', 'عدد رنگی', 'گراف مسطح'], sections: [
    { title: 'رنگ‌آمیزی رأسی', page: 171 }, { title: 'گراف‌های مسطح', page: 178 }, { title: 'حل چند مسئلهٔ نمونه', page: 184 }, { title: 'تمرینات', page: 187 },
  ] },
  { id: 7, title: 'مقدمه‌ای بر مربع‌های لاتین', start: 191, end: 228, icon: Atom, description: 'مربع‌های لاتین، سیستم‌های متمایزهای از نماینده و هندسهٔ متناهی.', tags: ['مربع لاتین', 'SDR', 'هندسهٔ متناهی'], sections: [
    { title: 'مربع‌های لاتین', page: 191 }, { title: 'سیستم‌های متمایزهای از نماینده', page: 203 }, { title: 'هندسهٔ متناهی', page: 211 },
    { title: 'صفحه‌های آفینی', page: 215 }, { title: 'حل چند مسئلهٔ نمونه', page: 224 }, { title: 'تمرینات', page: 226 },
  ] },
  { id: 8, title: 'اتوماتای متناهی', start: 35, end: 94, icon: FlaskConical, description: 'DFA، NFA، عبارت‌های منظم و زبان‌های منظم.', tags: ['اتوماتا', 'DFA', 'NFA', 'عبارت منظم'], sections: Object.values(automataLessons).filter(l => l.chapterId === 1).map((l, i) => ({ title: l.title, page: l.startPage, digitalOnly: true, key: `at.1.${i + 1}` })) },
  { id: 9, title: 'زبان‌های مستقل از متن', start: 95, end: 154, icon: FlaskConical, description: 'دستورهای مستقل از متن، اتوماتای پشته‌ای و لم پمپاژ.', tags: ['CFG', 'PDA', 'لم پمپاژ'], sections: Object.values(automataLessons).filter(l => l.chapterId === 2).map((l, i) => ({ title: l.title, page: l.startPage, digitalOnly: true, key: `at.2.${i + 1}` })) },
  { id: 10, title: 'ماشین تورینگ و تصمیم‌پذیری', start: 155, end: 249, icon: FlaskConical, description: 'ماشین تورینگ، مسألة توقف، قضیهٔ رایس و تصمیم‌پذیری.', tags: ['تورینگ', 'تصمیم‌پذیری', 'رایس'], sections: Object.values(automataLessons).filter(l => l.chapterId >= 3 && l.chapterId <= 5).map((l, i) => ({ title: l.title, page: l.startPage, digitalOnly: true, key: `at.${l.chapterId}.${i + 1}` })) },
  { id: 11, title: 'پیچیدگی (P و NP)', start: 250, end: 280, icon: Atom, description: 'کلاس‌های P و NP، کاهش چندجمله‌ای و مسائل NP-کامل.', tags: ['پیچیدگی', 'P', 'NP'], sections: Object.values(automataLessons).filter(l => l.chapterId === 7).map((l, i) => ({ title: l.title, page: l.startPage, digitalOnly: true, key: `at.7.${i + 1}` })) },
]

function Library({ onExperiment }: { onExperiment: () => void }) {
  const [activeChapter, setActiveChapter] = useState(1)
  const [query, setQuery] = useState('')
  const [reader, setReader] = useState<{ title: string; page: number } | null>(null)
  const [digitalLesson, setDigitalLesson] = useState<string | null>(null)
  const [completed, setCompleted] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem('tarkib-read-sections') || '[]') } catch { return [] }
  })
  const chapter = chapters.find(c => c.id === activeChapter)!
  const sectionCount = chapters.reduce((sum, c) => sum + c.sections.length, 0)
  const searchResults = useMemo(() => {
    if (!query.trim()) return []
    return chapters.flatMap(c => c.sections.map(s => ({ ...s, chapter: c }))).filter(s => `${s.title} ${s.chapter.title}`.includes(query.trim()))
  }, [query])
  const allSections = chapters.flatMap(c =>
    c.sections.map((s, i) => ({ ...s, chapter: c, key: s.key || `${c.id}.${i + 1}` }))
  )
  const openSection = (title: string, page: number) => {
    const section = allSections.find(s => s.title === title && s.page === page)
    if (section) {
      setReader(null)
      setDigitalLesson(section.key)
      setActiveChapter(section.chapter.id)
    } else {
      setDigitalLesson(null)
      setReader({ title, page: page + 5 })
    }
  }
  const digitalIndex = allSections.findIndex(s => s.key === digitalLesson)
  const digitalSection = digitalIndex >= 0 ? allSections[digitalIndex] : null
  const toggleDigitalRead = (page: number) => {
    const next = completed.includes(page) ? completed.filter(p => p !== page) : [...completed, page]
    setCompleted(next)
    localStorage.setItem('tarkib-read-sections', JSON.stringify(next))
  }
  const openDigitalPdf = (page: number) => {
    if (!digitalSection) return
    setDigitalLesson(null)
    setReader({ title: digitalSection.title, page: page + 5 })
  }
  const markRead = () => {
    if (!reader) return
    const key = reader.page - 5
    const next = completed.includes(key) ? completed.filter(p => p !== key) : [...completed, key]
    setCompleted(next); localStorage.setItem('tarkib-read-sections', JSON.stringify(next))
  }
  const currentSection = reader ? chapters.flatMap(c => c.sections).findIndex(s => s.page + 5 === reader.page && s.title === reader.title) : -1
  const moveSection = (direction: number) => {
    const all = chapters.flatMap(c => c.sections)
    const next = all[currentSection + direction]
    if (next) openSection(next.title, next.page)
  }

  return <div className="library-page">
    <div className="page-heading library-heading"><div><div className="eyebrow"><span /> منبع دانشگاهی شما</div><h1>کتابخانهٔ ترکیبیات</h1><p>جزوه را بخوان، سپس مفاهیم را در آزمایشگاه کشف کن.</p></div><button className="secondary-btn" onClick={onExperiment}><FlaskConical size={17} /> بازگشت به آزمایشگاه</button></div>
    <section className="source-card">
      <img src="/notes/cover.png" alt="جلد کتاب مبانی ترکیبیات" />
      <div className="source-info"><span className="source-label"><BookMarked size={14} /> منبع اصلی کتابخانه</span><h2>مبانی ترکیبیات</h2><p>دکتر امیر مافی · دانشیار گروه ریاضی دانشگاه کردستان</p><div className="source-meta"><span><FileText size={14} /> {fa(246)} صفحه</span><span><Layers3 size={14} /> {fa(7)} فصل</span><span><BookOpen size={14} /> {fa(sectionCount)} بخش آموزشی</span></div></div>
      <div className="source-actions"><button className="light-btn" onClick={() => openSection('اصول اساسی شمارش', 1)}><Sparkles size={16} /> درس‌نامهٔ وب</button><button className="pdf-source-btn" onClick={() => openSection('آغاز کتاب', 1)}><BookOpen size={16} /> مطالعهٔ PDF</button><a href={PDF} download="مبانی-ترکیبیات.pdf"><Download size={16} /> دانلود PDF</a></div>
    </section>
    <div className="reading-progress"><div><GraduationCap size={18} /><span>پیشرفت مطالعهٔ شما</span><strong>{fa(completed.length)} بخش از {fa(sectionCount)}</strong></div><div className="reading-track"><i style={{ width: `${Math.min(100, completed.length / sectionCount * 100)}%` }} /></div><span>{fa(Math.round(completed.length / sectionCount * 100))}٪</span></div>
    <div className="library-layout">
      <aside className="chapters-panel">
        <div className="library-search"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="جست‌وجو در سرفصل‌ها..." />{query && <button onClick={() => setQuery('')}><X size={15} /></button>}</div>
        {query ? <div className="search-results"><div className="chapter-list-label">{fa(searchResults.length)} نتیجه برای «{query}»</div>{searchResults.map(s => <button key={`${s.chapter.id}-${s.page}`} onClick={() => openSection(s.title, s.page)}><span>{s.title}<small>فصل {fa(s.chapter.id)} · صفحهٔ {fa(s.page)}</small></span><ChevronLeft size={16} /></button>)}{!searchResults.length && <div className="no-results">سرفصلی با این عنوان پیدا نشد.</div>}</div> : <>
          <div className="chapter-list-label">فصل‌های کتاب</div>
          <div className="chapter-list">{chapters.map(c => <button key={c.id} className={activeChapter === c.id && !reader ? 'active' : ''} onClick={() => { setActiveChapter(c.id); setReader(null); setDigitalLesson(null) }}><span className="chapter-number">{fa(c.id)}</span><span className="chapter-button-text"><strong>{c.title}</strong><small>صفحهٔ {fa(c.start)} تا {fa(c.end)}</small></span><ChevronLeft size={16} /></button>)}</div>
          <div className="book-extras"><button onClick={() => openSection('کتاب‌نامه', 229)}>کتاب‌نامه<span>{fa(229)}</span></button><button onClick={() => openSection('فهرست نمادها', 231)}>فهرست نمادها<span>{fa(231)}</span></button><button onClick={() => openSection('واژه‌نامه', 235)}>واژه‌نامه<span>{fa(235)}</span></button></div>
        </>}
      </aside>
      <section className="reading-panel">
        {digitalLesson === '1.1' ? <Lesson
          onBack={() => setDigitalLesson(null)}
          onPdf={() => { setDigitalLesson(null); setReader({ title: 'اصول اساسی شمارش', page: 6 }) }}
          onNext={() => setDigitalLesson('1.2')}
          isRead={completed.includes(1)}
          onToggleRead={() => {
            const next = completed.includes(1) ? completed.filter(p => p !== 1) : [...completed, 1]
            setCompleted(next)
            localStorage.setItem('tarkib-read-sections', JSON.stringify(next))
          }}
        /> : digitalLesson && digitalSection ? <DigitalSection
          lessonKey={digitalLesson}
          onBack={() => setDigitalLesson(null)}
          onPdf={openDigitalPdf}
          onNavigate={setDigitalLesson}
          previousKey={allSections[digitalIndex - 1]?.key}
          nextKey={allSections[digitalIndex + 1]?.key}
          isRead={completed.includes(digitalSection.page)}
          onToggleRead={() => toggleDigitalRead(digitalSection.page)}
        /> : reader ? <div className="pdf-reader">
          <div className="reader-head"><button className="reader-back" onClick={() => setReader(null)}><ChevronRight size={17} /> سرفصل‌ها</button><div><strong>{reader.title}</strong><span>صفحهٔ {fa(reader.page - 5)} از کتاب · صفحهٔ {fa(reader.page)} از PDF</span></div><a href={`${PDF}#page=${reader.page}`} target="_blank" rel="noreferrer" title="بازکردن در برگهٔ جدید"><ExternalLink size={17} /></a></div>
          <iframe key={`${reader.page}-${reader.title}`} src={`${PDF}#page=${reader.page}&zoom=page-width&toolbar=0&navpanes=0`} title={`جزوه مبانی ترکیبیات — ${reader.title}`} />
          <div className="reader-footer"><div><button disabled={currentSection <= 0} onClick={() => moveSection(-1)}><ChevronRight size={16} /> بخش قبل</button><button disabled={currentSection < 0 || currentSection >= sectionCount - 1} onClick={() => moveSection(1)}>بخش بعد <ChevronLeft size={16} /></button></div><button className={`mark-read ${reader && completed.includes(reader.page - 5) ? 'read' : ''}`} onClick={markRead}><CheckCircle2 size={16} />{reader && completed.includes(reader.page - 5) ? 'خوانده شده' : 'علامت به‌عنوان خوانده‌شده'}</button></div>
        </div> : <div className="chapter-overview">
          <div className="chapter-hero"><div className="big-chapter-icon"><chapter.icon size={30} /></div><div><span>فصل {fa(chapter.id)} · صفحهٔ {fa(chapter.start)}</span><h2>{chapter.title}</h2><p>{chapter.description}</p></div></div>
          <div className="chapter-tags">{chapter.tags.map(t => <span key={t}>{t}</span>)}</div>
          <div className="section-list-head"><h3>سرفصل‌های این فصل</h3><span>{fa(chapter.sections.length)} بخش</span></div>
          <div className="section-list">{chapter.sections.map((s, i) => <button key={s.key || s.page} onClick={() => openSection(s.title, s.page)}><span className={`section-check ${completed.includes(s.page) ? 'done' : ''}`}>{completed.includes(s.page) ? <CheckCircle2 size={16} /> : fa(i + 1)}</span><span><strong>{s.key || `${chapter.id}.${i + 1}`} · {s.title}</strong><small>صفحهٔ {fa(s.page)}{s.digitalOnly ? <em className="digital-tag">درس‌نامهٔ وب</em> : <><em className="digital-tag">درس‌نامهٔ وب</em> <BookOpen size={15} /></>}</small></span></button>)}</div>
          {chapter.id >= 3 && chapter.id <= 6 && <button className="experiment-link" onClick={onExperiment}><div><FlaskConical size={21} /><span><strong>وقت آزمایش کردن است!</strong><small>مفاهیم این فصل را روی گراف خودتان بررسی کنید.</small></span></div><ArrowLeft size={19} /></button>}
        </div>}
      </section>
    </div>
    <div className="source-credit">متن و ساختار کتاب متعلق به مؤلف است؛ این نسخه فقط برای مطالعه و استفادهٔ آموزشی داخل پروژه قرار گرفته است.</div>
  </div>
}

export default Library
