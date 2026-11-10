import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp,
  ExternalLink, FileText, GraduationCap, Lightbulb, Minus, Plus, Printer,
  Search, Sigma, Sparkles, Target, X,
} from 'lucide-react'
import { curatedLessons } from './content'
import type { CuratedBlock } from './content/types'
import { M } from './Lesson'

const fa = (n: number) => n.toLocaleString('fa-IR')

function Block({ block, number }: { block: CuratedBlock; number: number }) {
  if (block.kind === 'text') return <section className="curated-text"><h2>{block.title}</h2>{block.body && <p>{block.body}</p>}{block.formula && <M display>{block.formula}</M>}</section>
  if (block.kind === 'example' || block.kind === 'exercise') return <article className={`lesson-example curated-${block.kind}`}><div className="block-label"><span>{block.kind === 'example' ? `مثال ${fa(number)}` : 'تمرین و کشف'}</span><strong>{block.title}</strong></div>{block.problem && <p>{block.problem}</p>}{block.formula && <M display>{block.formula}</M>}<details className="curated-solution"><summary><span><Lightbulb size={16} />{block.kind === 'example' ? 'نمایش راه‌حل' : 'راهنمایی و پاسخ'}</span><ChevronDown size={17} /></summary><div>{block.solution && <p>{block.solution}</p>}</div></details></article>
  const labels = { definition: 'تعریف', theorem: 'قضیه', note: 'نکتهٔ کلیدی' } as const
  return <section className={`curated-block ${block.kind}`}><div className="block-label"><span>{labels[block.kind]}</span><strong>{block.title}</strong></div>{block.body && <p>{block.body}</p>}{block.formula && <M display>{block.formula}</M>}</section>
}

function DigitalSection({ lessonKey, onBack, onPdf, onNavigate, previousKey, nextKey, isRead, onToggleRead }: {
  lessonKey: string; onBack: () => void; onPdf: (page: number) => void;
  onNavigate: (key: string) => void; previousKey?: string; nextKey?: string;
  isRead: boolean; onToggleRead: () => void
}) {
  const [fontSize, setFontSize] = useState(15)
  const [query, setQuery] = useState('')
  useEffect(() => setQuery(''), [lessonKey])
  const lesson = curatedLessons[lessonKey]
  const filtered = useMemo(() => {
    if (!lesson || !query.trim()) return lesson?.blocks || []
    const q = query.trim()
    return lesson.blocks.filter(b => `${b.title} ${b.body || ''} ${b.problem || ''} ${b.solution || ''}`.includes(q))
  }, [lesson, query])
  if (!lesson) return <div className="auto-loading"><CircleHelp size={28} /><h2>این درس پیدا نشد</h2></div>
  let exampleNumber = 0

  return <div className="digital-lesson curated-lesson">
    <div className="lesson-toolbar"><button className="reader-back" onClick={onBack}><ChevronRight size={17} /> سرفصل‌ها</button><div className="web-lesson-badge"><Sparkles size={13} /> درس‌نامهٔ وب</div><div className="lesson-tools"><button onClick={() => setFontSize(Math.max(13, fontSize - 1))} title="کوچک‌تر"><Minus size={14} /></button><span>آ</span><button onClick={() => setFontSize(Math.min(19, fontSize + 1))} title="بزرگ‌تر"><Plus size={14} /></button><i /><button onClick={() => window.print()} title="چاپ"><Printer size={16} /></button><button onClick={() => onPdf(lesson.startPage)} title="PDF منبع"><FileText size={16} /></button></div></div>
    <header className="lesson-cover curated-cover"><div className="lesson-kicker"><span>فصل {fa(lesson.chapterId)} · {lesson.chapter}</span><i /><span>درس‌نامهٔ بازنویسی‌شده</span></div><h1>{lesson.title}</h1><p>{lesson.intro}</p><div className="lesson-intro-meta"><span><BookOpen size={15} /> زمان مطالعه: {fa(Math.max(5, lesson.blocks.length * 3))} دقیقه</span><span><Sigma size={15} /> بخش {lessonKey.replace('.', '٫')}</span></div></header>
    <section className="learning-outcomes"><div><GraduationCap size={22} /><h2>در این درس چه می‌آموزی؟</h2></div><ul>{lesson.outcomes.map(item => <li key={item}><CheckCircle2 size={15} />{item}</li>)}</ul></section>
    <div className="auto-search curated-search"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="جست‌وجو در این درس..." />{query && <><span>{fa(filtered.length)} نتیجه</span><button onClick={() => setQuery('')}><X size={15} /></button></>}</div>
    <article className="curated-content" style={{ fontSize }}>
      {filtered.map((block, index) => {
        if (block.kind === 'example') exampleNumber++
        return <Block key={`${lessonKey}-${index}`} block={block} number={exampleNumber} />
      })}
      {query && !filtered.length && <div className="auto-no-results"><Search size={25} /><p>عبارتی در این درس پیدا نشد.</p></div>}
    </article>
    <div className="curated-takeaway"><Target size={20} /><div><strong>برای تسلط، فقط خواندن کافی نیست</strong><p>پیش از بازکردن راه‌حل مثال‌ها، چند دقیقه روی کاغذ تلاش کن. سپس روش خودت را با پاسخ مقایسه کن و یک مثال تازه با همان ایده بساز.</p></div></div>
    <div className="lesson-source curated-source"><CircleHelp size={17} /><p>این درس برای یادگیری وب و با محتوای مستقل بازنویسی شده است. برای مطالعهٔ متن کامل کتاب، صفحه‌های {fa(lesson.startPage)} تا {fa(lesson.endPage)} منبع را ببینید.</p><button onClick={() => onPdf(lesson.startPage)}>مشاهدهٔ منبع <ExternalLink size={14} /></button></div>
    <footer className="lesson-end auto-end"><button className={`complete-lesson ${isRead ? 'done' : ''}`} onClick={onToggleRead}><CheckCircle2 size={18} />{isRead ? 'این درس را خوانده‌اید' : 'این درس را خواندم'}</button><div className="auto-nav"><button disabled={!previousKey} onClick={() => previousKey && onNavigate(previousKey)}><ChevronRight size={17} /> بخش قبل</button><button disabled={!nextKey} onClick={() => nextKey && onNavigate(nextKey)}>بخش بعد <ChevronLeft size={17} /></button></div></footer>
  </div>
}

export default DigitalSection
