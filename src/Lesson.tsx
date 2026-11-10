import { useState } from 'react'
import katex from 'katex'
import {
  BookOpen, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  CircleHelp, ExternalLink, FileText, Lightbulb, List, Minus, Plus, Printer,
  RotateCcw, Sigma, Sparkles, Target,
} from 'lucide-react'

export function M({ children, display = false }: { children: string; display?: boolean }) {
  const html = katex.renderToString(children, { displayMode: display, throwOnError: false, output: 'html' })
  return <span className={`math ${display ? 'math-display' : ''}`} dir="ltr" dangerouslySetInnerHTML={{ __html: html }} />
}

function Example({ number, title, children }: { number: string; title?: string; children: React.ReactNode }) {
  return <article className="lesson-example"><div className="block-label"><span>مثال {number}</span>{title && <strong>{title}</strong>}</div>{children}</article>
}

function Solution({ children, title = 'پاسخ' }: { children: React.ReactNode; title?: string }) {
  const [open, setOpen] = useState(false)
  return <div className={`solution ${open ? 'open' : ''}`}><button onClick={() => setOpen(!open)}><span><Lightbulb size={16} />{open ? 'پنهان‌کردن پاسخ' : title}</span><ChevronDown size={17} /></button>{open && <div className="solution-content">{children}</div>}</div>
}

function QuickCheck() {
  const questions = [
    { q: 'از ۴ پیراهن و ۳ شلوار، چند ترکیب پیراهن و شلوار می‌توان ساخت؟', options: ['۷', '۱۲', '۲۴'], answer: 1, why: 'برای هر یک از ۴ پیراهن‌ها، ۳ انتخاب شلوار داریم؛ پس ۴ × ۳ = ۱۲.' },
    { q: 'اگر |A|=۲۰، |B|=۱۵ و |A∩B|=۵ باشد، |A∪B| چقدر است؟', options: ['۲۵', '۳۰', '۴۰'], answer: 1, why: 'طبق شمول و عدم شمول: ۲۰ + ۱۵ − ۵ = ۳۰.' },
    { q: 'یک مجموعهٔ ۵ عضوی چند زیرمجموعه دارد؟', options: ['۱۰', '۲۵', '۳۲'], answer: 2, why: 'هر عضو دو انتخاب دارد: در زیرمجموعه باشد یا نباشد؛ پس ۲⁵ = ۳۲.' },
  ]
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const correct = questions.filter((q, i) => answers[i] === q.answer).length
  return <section className="quick-check" id="review"><div className="lesson-section-title"><div><Target size={22} /></div><span><small>مرور کوتاه</small><h2>چقدر یاد گرفتی؟</h2></span><em>{fa(correct)} از {fa(3)} پاسخ درست</em></div>{questions.map((q, i) => <div className="quiz-question" key={q.q}><h3><span>{fa(i + 1)}</span>{q.q}</h3><div className="quiz-options">{q.options.map((o, j) => <button key={o} className={answers[i] === undefined ? '' : j === q.answer ? 'correct' : answers[i] === j ? 'wrong' : ''} onClick={() => setAnswers({ ...answers, [i]: j })}>{o}{answers[i] !== undefined && j === q.answer && <Check size={15} />}</button>)}</div>{answers[i] !== undefined && <p className="quiz-explanation">{answers[i] === q.answer ? 'آفرین! ' : ''}{q.why}</p>}</div>)}<button className="reset-quiz" onClick={() => setAnswers({})}><RotateCcw size={14} /> شروع دوباره</button></section>
}

const fa = (n: number) => n.toLocaleString('fa-IR')

function Lesson({ onBack, onPdf, onNext, isRead, onToggleRead }: { onBack: () => void; onPdf: () => void; onNext: () => void; isRead: boolean; onToggleRead: () => void }) {
  const [fontSize, setFontSize] = useState(15)
  const [tocOpen, setTocOpen] = useState(false)
  return <div className="digital-lesson">
    <div className="lesson-toolbar"><button className="reader-back" onClick={onBack}><ChevronRight size={17} /> سرفصل‌ها</button><div className="web-lesson-badge"><Sparkles size={13} /> درس‌نامهٔ وب</div><div className="lesson-tools"><button onClick={() => setFontSize(Math.max(13, fontSize - 1))} title="کوچک‌تر"><Minus size={14} /></button><span>آ</span><button onClick={() => setFontSize(Math.min(19, fontSize + 1))} title="بزرگ‌تر"><Plus size={14} /></button><i /><button onClick={() => window.print()} title="چاپ"><Printer size={16} /></button><button onClick={onPdf} title="نسخهٔ PDF"><FileText size={16} /></button></div></div>
    <div className="lesson-mobile-toc"><button onClick={() => setTocOpen(!tocOpen)}><List size={17} /> در این درس <ChevronDown size={16} /></button>{tocOpen && <nav><a href="#product">اصل ضرب</a><a href="#inclusion">شمول و عدم شمول</a><a href="#applications">کاربردها</a><a href="#review">مرور و تمرین</a></nav>}</div>
    <article className="lesson-article" style={{ fontSize }}>
      <header className="lesson-cover"><div className="lesson-kicker"><span>فصل ۱ · آنالیز ترکیبیاتی</span><i /><span>صفحه‌های ۱ تا ۸</span></div><h1>اصول اساسی شمارش</h1><p>چطور بدون شمردن تک‌تک حالت‌ها، تعدادشان را پیدا کنیم؟</p><div className="lesson-intro-meta"><span><BookOpen size={15} /> زمان مطالعه: ۱۸ دقیقه</span><span><Sigma size={15} /> ۷ قضیه و مثال کلیدی</span></div></header>
      <div className="lesson-lead">در این بخش با دو اصل اساسی شمارش، یعنی <strong>اصل ضرب</strong> و <strong>اصل جمع</strong>، آشنا می‌شویم. سپس اصل شمول و عدم شمول را می‌سازیم و در مسئله‌های متنوع به کار می‌بریم.</div>
      <aside className="lesson-big-idea"><Lightbulb size={23} /><div><strong>ایدهٔ اصلی</strong><p>شمارش یعنی ساختن یک روش منظم برای تولید همهٔ حالت‌ها، طوری که هیچ حالتی جا نماند یا دوبار شمرده نشود.</p></div></aside>

      <section id="product" className="lesson-section"><div className="lesson-section-title"><div><span>۱</span></div><span><small>شمارش فرایندهای چندمرحله‌ای</small><h2>اصل ضرب</h2></span></div>
        <div className="definition-block"><div className="block-label"><span>تعریف ۱.۱</span><strong>اصل ضرب</strong></div><p>فرض کنید انجام کاری را بتوان به <M>k</M> مرحله تجزیه کرد. اگر مرحلهٔ اول به <M>n_1</M> روش، مرحلهٔ دوم به <M>n_2</M> روش و همین‌طور مرحلهٔ <M>k</M>ام به <M>n_k</M> روش قابل انجام باشد، کل کار به این تعداد روش انجام می‌شود:</p><M display>{String.raw`n_1 \times n_2 \times \cdots \times n_k = \prod_{i=1}^{k} n_i`}</M></div>
        <div className="principle-visual"><div><span>انتخاب پیراهن</span><div className="visual-options shirts"><i /><i /><i /></div><strong>۳ انتخاب</strong></div><b>×</b><div><span>انتخاب شلوار</span><div className="visual-options pants"><i /><i /><i /><i /></div><strong>۴ انتخاب</strong></div><b>=</b><div className="visual-result"><span>استایل ممکن</span><strong>۱۲</strong></div></div>
        <Example number="۱.۲" title="ساختن کلمه"><p>(الف) با استفاده از حروف <M>a</M>، <M>b</M> و <M>c</M> چند کلمهٔ پنج‌حرفی می‌توان نوشت؟ چند کلمهٔ <M>r</M>حرفی با <M>n</M> حرف می‌توان نوشت؟</p><p>(ب) تعداد کلماتی را که هیچ دو حرف مجاورشان یکسان نباشد بیابید.</p><Solution><p><strong>الف)</strong> برای هر یک از پنج جایگاه ۳ انتخاب داریم. بنابراین <M>3^5</M> کلمه وجود دارد و در حالت کلی <M>n^r</M> کلمه.</p><p><strong>ب)</strong> حرف اول ۳ انتخاب دارد، اما هر حرف بعدی فقط نباید با حرف قبلی یکسان باشد؛ پس ۲ انتخاب دارد:</p><M display>{String.raw`3 \times 2^4 = 48 \qquad \text{و در حالت کلی} \qquad n(n-1)^{r-1}`}</M></Solution></Example>
        <Example number="۱.۳" title="رفت و برگشت روی جاده‌ها"><p>بین شهرهای A و B سه جاده و بین B و C چهار جاده وجود دارد.</p><ol><li>از A به C به چند طریق می‌توان رفت؟</li><li>از A به C و برگشت به A چند سفر وجود دارد؟</li><li>اگر در رفت و برگشت از هیچ جاده‌ای دوبار عبور نشود، چند سفر وجود دارد؟</li></ol><Solution><p><strong>الف)</strong> یک جاده از A به B و سپس یک جاده از B به C انتخاب می‌کنیم: <M>{String.raw`3 \times 4 = 12`}</M>.</p><p><strong>ب)</strong> برای رفت ۱۲ انتخاب و برای برگشت نیز ۱۲ انتخاب داریم: <M>{String.raw`12 \times 12 = 144`}</M>.</p><p><strong>ج)</strong> تعداد انتخاب‌ها در هر مرحله از مسیر زیر روی پیکان‌ها نوشته شده است:</p><M display>{String.raw`A \xrightarrow{3} B \xrightarrow{4} C \xrightarrow{3} B \xrightarrow{2} A`}</M><p>بنابراین تعداد سفرها <M>{String.raw`3 \times 4 \times 3 \times 2 = 72`}</M> است.</p></Solution></Example>
        <div className="two-examples"><Example number="۱.۴" title="زیرمجموعه‌ها"><p>نشان دهید یک مجموعهٔ <M>n</M>عضوی، <M>2^n</M> زیرمجموعه دارد.</p><Solution><p>برای هر عضو دو انتخاب داریم: در زیرمجموعه باشد یا نباشد. این انتخاب‌ها مستقل‌اند؛ پس <M>{String.raw`2 \times 2 \times \cdots \times 2 = 2^n`}</M> زیرمجموعه داریم.</p></Solution></Example><Example number="۱.۵" title="شمردن توابع"><p>فرض کنید X یک مجموعهٔ <M>n</M>عضوی باشد. چند تابع از X به X وجود دارد؟</p><Solution><p>برای مقدار تابع روی هر یک از <M>n</M> عضو دامنه، <M>n</M> انتخاب داریم. بنابراین تعداد توابع <M>n^n</M> است.</p></Solution></Example></div>
      </section>

      <section id="inclusion" className="lesson-section"><div className="lesson-section-title"><div><span>۲</span></div><span><small>وقتی حالت‌ها هم‌پوشانی دارند</small><h2>شمول و عدم شمول</h2></span></div>
        <div className="theorem-block"><div className="block-label"><span>لم ۱.۶</span><strong>اجتماع دو مجموعه</strong></div><p>اگر A و B دو مجموعهٔ متناهی باشند، آنگاه:</p><M display>{String.raw`|A \cup B| = |A| + |B| - |A \cap B|`}</M><Solution title="نمایش اثبات"><p>در <M>|A|+|B|</M>، اعضای <M>A\cap B</M> دوبار شمرده شده‌اند؛ یک‌بار به‌عنوان عضو A و یک‌بار به‌عنوان عضو B. با یک‌بار کم‌کردن <M>|A\cap B|</M>، هر عضو دقیقاً یک‌بار شمرده می‌شود.</p><p>به‌طور دقیق‌تر، اگر <M>{String.raw`A\setminus B`}</M> دارای r عضو، <M>{String.raw`B\setminus A`}</M> دارای s عضو و اشتراک دارای t عضو باشد:</p><M display>{String.raw`|A|+|B|-|A\cap B|=(r+t)+(s+t)-t=r+s+t=|A\cup B|`}</M></Solution></div>
        <div className="venn-explanation"><div className="venn"><span className="venn-a">A</span><span className="venn-b">B</span><i>A ∩ B</i></div><div><strong>چرا اشتراک را کم می‌کنیم؟</strong><p>ناحیهٔ وسط در هر دو مجموعه حضور دارد. جمع‌زدن ساده، این ناحیه را دو بار می‌شمارد؛ تفریق اشتراک این خطا را اصلاح می‌کند.</p></div></div>
        <div className="theorem-block general"><div className="block-label"><span>قضیهٔ ۱.۷</span><strong>اصل شمول و عدم شمول</strong></div><p>اگر <M>X_1,\ldots,X_n</M> مجموعه‌های متناهی باشند:</p><M display>{String.raw`\left|\bigcup_{i=1}^{n}X_i\right|=\sum_{i=1}^{n}|X_i|-\sum_{1\le i<j\le n}|X_i\cap X_j|+\sum_{1\le i<j<k\le n}|X_i\cap X_j\cap X_k|-\cdots+(-1)^{n-1}|X_1\cap\cdots\cap X_n|`}</M><Solution title="ایدهٔ اثبات با استقرا"><p>پایهٔ <M>n=2</M> همان لم قبل است. برای گام استقرا، اجتماع <M>n-1</M> مجموعهٔ اول را یک مجموعه و <M>X_n</M> را مجموعهٔ دوم بگیرید و لم دو مجموعه‌ای را به کار ببرید:</p><M display>{String.raw`\left|\bigcup_{i=1}^{n}X_i\right|=\left|\bigcup_{i=1}^{n-1}X_i\right|+|X_n|-\left|\left(\bigcup_{i=1}^{n-1}X_i\right)\cap X_n\right|`}</M><p>حالا فرض استقرا را یک‌بار روی اجتماع <M>n-1</M> مجموعه و یک‌بار روی مجموعه‌های <M>{String.raw`X_i\cap X_n`}</M> اعمال کنید. جمع‌کردن جمله‌های هم‌اندازه، فرمول مطلوب را می‌دهد.</p></Solution></div>
        <div className="corollary-block"><span>نتیجهٔ ۱.۸ · حالت مکمل</span><p>اگر هر <M>X_i</M> زیرمجموعهٔ مجموعهٔ متناهی X باشد:</p><M display>{String.raw`\left|X\setminus\bigcup_{i=1}^{n}X_i\right|=|X|-\sum_i|X_i|+\sum_{i<j}|X_i\cap X_j|-\cdots+(-1)^n\left|\bigcap_{i=1}^{n}X_i\right|`}</M></div>
      </section>

      <section id="applications" className="lesson-section"><div className="lesson-section-title"><div><span>۳</span></div><span><small>ابزارهایی برای مسئله‌های بیشتر</small><h2>کاربردها و نتایج</h2></span></div>
        <div className="application-card euler-card"><div><span>نتیجهٔ ۱.۹</span><h3>تابع اویلر</h3></div><p>اگر <M>p_1,\ldots,p_r</M> همهٔ عامل‌های اول متمایز n باشند، تعداد اعداد صحیح <M>1\le i\le n</M> که نسبت به n اول‌اند، یعنی <M>\phi(n)</M>، برابر است با:</p><M display>{String.raw`\phi(n)=n\left(1-\frac1{p_1}\right)\left(1-\frac1{p_2}\right)\cdots\left(1-\frac1{p_r}\right)`}</M><small>این فرمول از حذف مضرب‌های عامل‌های اول با اصل شمول و عدم شمول به دست می‌آید.</small></div>
        <div className="two-applications"><div className="application-card"><span>نتیجهٔ ۱.۱۰</span><h3>اصل جمع</h3><p>اگر مجموعه‌های <M>X_1,\ldots,X_n</M> دو‌به‌دو مجزا باشند:</p><M display>{String.raw`\left|\bigcup_{i=1}^{n}X_i\right|=\sum_{i=1}^{n}|X_i|`}</M></div><div className="application-card"><span>قضیهٔ ۱.۱۱</span><h3>شمارش مضرب‌ها</h3><p>تعداد اعداد صحیح مثبت کوچک‌تر یا مساوی m که بر n بخش‌پذیرند:</p><M display>{String.raw`\left\lfloor\frac{m}{n}\right\rfloor`}</M></div></div>
        <Example number="۱.۱۲" title="اعداد ۱ تا ۳۰۰"><p>همهٔ اعداد صحیح مثبت <M>1\le n\le300</M> را که در شرط‌های زیر صدق می‌کنند بیابید. مجموعه‌های اعداد بخش‌پذیر بر ۳، ۵ و ۷ را به‌ترتیب A، B و C می‌نامیم.</p><div className="example-cases"><span>الف) حداقل بر یکی از ۳، ۵ یا ۷ بخش‌پذیر باشند.</span><span>ب) بر ۳ و ۵ بخش‌پذیر، ولی بر ۷ نباشند.</span><span>ج) بر ۵ بخش‌پذیر، ولی بر ۳ و ۷ نباشند.</span><span>د) نسبت به ۱۰۵ اول باشند.</span></div><Solution><h4>الف) دست‌کم یک بخش‌پذیری</h4><p>با شمول و عدم شمول:</p><M display>{String.raw`\begin{aligned}|A\cup B\cup C|={}&|A|+|B|+|C|-|A\cap B|-|A\cap C|-|B\cap C|+|A\cap B\cap C|\\={}&100+60+42-20-14-8+2=\boxed{162}\end{aligned}`}</M><h4>ب) بخش‌پذیر بر ۳ و ۵، نه ۷</h4><M display>{String.raw`|(A\cap B)\setminus C|=|A\cap B|-|A\cap B\cap C|=20-2=\boxed{18}`}</M><h4>ج) بخش‌پذیر بر ۵، نه ۳ و ۷</h4><M display>{String.raw`|B\setminus(A\cup C)|=|B|-|B\cap A|-|B\cap C|+|A\cap B\cap C|=60-20-8+2=\boxed{34}`}</M><h4>د) اول نسبت به ۱۰۵</h4><p>چون <M>{String.raw`105=3\times5\times7`}</M>، چنین عددی نباید بر هیچ‌کدام از این سه عدد بخش‌پذیر باشد:</p><M display>{String.raw`300-|A\cup B\cup C|=300-162=\boxed{138}`}</M></Solution></Example>
      </section>
      <QuickCheck />
      <div className="lesson-source"><CircleHelp size={17} /><p>این درس‌نامه بر اساس صفحه‌های ۱ تا ۸ کتاب «مبانی ترکیبیات» دکتر امیر مافی بازنویسی و فرمول‌های آن برای نمایش وب بازسازی شده است.</p><button onClick={onPdf}>مشاهدهٔ صفحهٔ اصلی <ExternalLink size={14} /></button></div>
      <footer className="lesson-end"><button className={`complete-lesson ${isRead ? 'done' : ''}`} onClick={onToggleRead}><CheckCircle2 size={18} />{isRead ? 'این درس را خوانده‌اید' : 'این درس را خواندم'}</button><button className="next-lesson" onClick={onNext}><span><small>بخش بعدی</small><strong>۱.۲ · فاکتوریل‌ها</strong></span><ChevronLeft size={20} /></button></footer>
    </article>
  </div>
}

export default Lesson
