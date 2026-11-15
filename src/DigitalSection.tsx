import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  BookOpen, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp,
  ExternalLink, FileText, FlaskConical, GraduationCap, Lightbulb, Minus, Plus, Printer,
  Search, Sigma, Sparkles, Target, X,
} from 'lucide-react'
import { curatedLessons } from './content'
import type { CuratedBlock } from './content/types'
import { M } from './Lesson'

const fa = (n: number) => n.toLocaleString('fa-IR')

function RichText({ text }: { text: string }) {
  if (!text.includes('$')) return <>{text}</>
  const parts = text.split(/(\$[^$]+\$)/g)
  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          return <M key={idx}>{part.slice(1, -1)}</M>
        }
        return <Fragment key={idx}>{part}</Fragment>
      })}
    </>
  )
}

function formatLessonKey(lessonKey: string): string {
  const clean = lessonKey.startsWith('at.') ? lessonKey.slice(3) : lessonKey
  return clean
    .split('.')
    .map(part => {
      const num = Number(part)
      return Number.isNaN(num) ? part : fa(num)
    })
    .join('٫')
}

function Block({ block, number }: { block: CuratedBlock; number: number }) {
  if (block.kind === 'text') {
    return (
      <section className="curated-text">
        <h2><RichText text={block.title} /></h2>
        {block.body && <p><RichText text={block.body} /></p>}
        {block.formula && <M display>{block.formula}</M>}
      </section>
    )
  }

  if (block.kind === 'example' || block.kind === 'exercise') {
    return (
      <article className={`lesson-example curated-${block.kind}`}>
        <div className="block-label">
          <span>{block.kind === 'example' ? `مثال ${fa(number)}` : 'تمرین و کشف'}</span>
          <strong><RichText text={block.title} /></strong>
        </div>
        {block.problem && <p><RichText text={block.problem} /></p>}
        {block.formula && <M display>{block.formula}</M>}
        <details className="curated-solution">
          <summary>
            <span><Lightbulb size={16} />{block.kind === 'example' ? 'نمایش راه‌حل' : 'راهنمایی و پاسخ'}</span>
            <ChevronDown size={17} />
          </summary>
          <div>
            {block.solution && <p><RichText text={block.solution} /></p>}
          </div>
        </details>
      </article>
    )
  }

  const labels = { definition: 'تعریف', theorem: 'قضیه', note: 'نکتهٔ کلیدی' } as const
  return (
    <section className={`curated-block ${block.kind}`}>
      <div className="block-label">
        <span>{labels[block.kind]}</span>
        <strong><RichText text={block.title} /></strong>
      </div>
      {block.body && <p><RichText text={block.body} /></p>}
      {block.formula && <M display>{block.formula}</M>}
    </section>
  )
}

function DigitalSection({
  lessonKey,
  onBack,
  onPdf,
  onNavigate,
  onOpenLab,
  previousKey,
  nextKey,
  isRead,
  onToggleRead,
}: {
  lessonKey: string
  onBack: () => void
  onPdf: (page: number) => void
  onNavigate: (key: string) => void
  onOpenLab?: (target: 'automata' | 'pumping') => void
  previousKey?: string
  nextKey?: string
  isRead: boolean
  onToggleRead: () => void
}) {
  const [fontSize, setFontSize] = useState(15)
  const [query, setQuery] = useState('')
  useEffect(() => setQuery(''), [lessonKey])

  const lesson = curatedLessons[lessonKey]
  const isAutomata = lessonKey.startsWith('at.')
  const labTarget: 'automata' | 'pumping' = lessonKey === 'at.2.3' ? 'pumping' : 'automata'

  const filtered = useMemo(() => {
    if (!lesson || !query.trim()) return lesson?.blocks || []
    const q = query.trim().toLowerCase()
    return lesson.blocks.filter(b =>
      `${b.title} ${b.body || ''} ${b.problem || ''} ${b.solution || ''} ${b.formula || ''}`.toLowerCase().includes(q),
    )
  }, [lesson, query])

  if (!lesson) {
    return (
      <div className="auto-loading">
        <CircleHelp size={28} />
        <h2>این درس پیدا نشد</h2>
      </div>
    )
  }

  let exampleNumber = 0

  return (
    <div className="digital-lesson curated-lesson">
      <div className="lesson-toolbar">
        <button className="reader-back" onClick={onBack}>
          <ChevronRight size={17} /> سرفصل‌ها
        </button>
        <div className="web-lesson-badge">
          <Sparkles size={13} /> {isAutomata ? 'درس‌نامهٔ نظریهٔ محاسبه' : 'درس‌نامهٔ وب'}
        </div>
        <div className="lesson-tools">
          <button onClick={() => setFontSize(Math.max(13, fontSize - 1))} title="کوچک‌تر">
            <Minus size={14} />
          </button>
          <span>آ</span>
          <button onClick={() => setFontSize(Math.min(19, fontSize + 1))} title="بزرگ‌تر">
            <Plus size={14} />
          </button>
          <i />
          <button onClick={() => window.print()} title="چاپ">
            <Printer size={16} />
          </button>
          {!isAutomata ? (
            <button onClick={() => onPdf(lesson.startPage)} title="PDF منبع">
              <FileText size={16} />
            </button>
          ) : onOpenLab && (
            <button
              onClick={() => onOpenLab(labTarget)}
              title={labTarget === 'pumping' ? 'باز کردن آزمایشگاه لم پمپاژ' : 'باز کردن آزمایشگاه اتوماتا'}
            >
              <FlaskConical size={16} />
            </button>
          )}
        </div>
      </div>

      <header className="lesson-cover curated-cover">
        <div className="lesson-kicker">
          <span>فصل {fa(lesson.chapterId)} · {lesson.chapter}</span>
          <i />
          <span>{isAutomata ? 'درس‌نامهٔ تألیفی وب' : 'درس‌نامهٔ بازنویسی‌شده'}</span>
        </div>
        <h1><RichText text={lesson.title} /></h1>
        <p><RichText text={lesson.intro} /></p>
        <div className="lesson-intro-meta">
          <span><BookOpen size={15} /> زمان مطالعه: {fa(Math.max(6, lesson.blocks.length * 3))} دقیقه</span>
          <span><Sigma size={15} /> بخش {formatLessonKey(lessonKey)}</span>
        </div>
      </header>

      <section className="learning-outcomes">
        <div>
          <GraduationCap size={22} />
          <h2>در این درس چه می‌آموزی؟</h2>
        </div>
        <ul>
          {lesson.outcomes.map(item => (
            <li key={item}>
              <CheckCircle2 size={15} />
              <span><RichText text={item} /></span>
            </li>
          ))}
        </ul>
      </section>

      <div className="auto-search curated-search">
        <Search size={17} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="جست‌وجو در این درس..."
        />
        {query && (
          <>
            <span>{fa(filtered.length)} نتیجه</span>
            <button onClick={() => setQuery('')}><X size={15} /></button>
          </>
        )}
      </div>

      <article className="curated-content" style={{ fontSize }}>
        {filtered.map((block, index) => {
          if (block.kind === 'example') exampleNumber++
          return <Block key={`${lessonKey}-${index}`} block={block} number={exampleNumber} />
        })}
        {query && !filtered.length && (
          <div className="auto-no-results">
            <Search size={25} />
            <p>عبارتی در این درس پیدا نشد.</p>
          </div>
        )}
      </article>

      <div className="curated-takeaway">
        <Target size={20} />
        <div>
          <strong>برای تسلط، فقط خواندن کافی نیست</strong>
          <p>
            {isAutomata
              ? 'پس از خواندن مفاهیم، به آزمایشگاه اتوماتا یا لم پمپاژ بروید، مثال‌ها را خودتان بسازید و با رشته‌های مختلف بیازمایید.'
              : 'پیش از بازکردن راه‌حل مثال‌ها، چند دقیقه روی کاغذ تلاش کن. سپس روش خودت را با پاسخ مقایسه کن و یک مثال تازه با همان ایده بساز.'}
          </p>
        </div>
      </div>

      {isAutomata ? (
        <div className="lesson-source curated-source">
          <CircleHelp size={17} />
          <p>
            این درس با محتوای تألیفی مستقل برای بخش نظریهٔ زبان‌ها و ماشین‌های «تَرکیب» نگارش شده است.
          </p>
          {onOpenLab && (
            <button onClick={() => onOpenLab(labTarget)}>
              {labTarget === 'pumping' ? 'آزمایش در لم پمپاژ' : 'آزمایش در آزمایشگاه اتوماتا'} <FlaskConical size={14} />
            </button>
          )}
        </div>
      ) : (
        <div className="lesson-source curated-source">
          <CircleHelp size={17} />
          <p>
            این درس برای یادگیری وب و با محتوای مستقل بازنویسی شده است. برای مطالعهٔ متن کامل کتاب، صفحه‌های {fa(lesson.startPage)} تا {fa(lesson.endPage)} منبع را ببینید.
          </p>
          <button onClick={() => onPdf(lesson.startPage)}>
            مشاهدهٔ منبع <ExternalLink size={14} />
          </button>
        </div>
      )}

      <footer className="lesson-end auto-end">
        <button className={`complete-lesson ${isRead ? 'done' : ''}`} onClick={onToggleRead}>
          <CheckCircle2 size={18} />
          {isRead ? 'این درس را خوانده‌اید' : 'این درس را خواندم'}
        </button>
        <div className="auto-nav">
          <button disabled={!previousKey} onClick={() => previousKey && onNavigate(previousKey)}>
            <ChevronRight size={17} /> بخش قبل
          </button>
          <button disabled={!nextKey} onClick={() => nextKey && onNavigate(nextKey)}>
            بخش بعد <ChevronLeft size={17} />
          </button>
        </div>
      </footer>
    </div>
  )
}

export default DigitalSection
