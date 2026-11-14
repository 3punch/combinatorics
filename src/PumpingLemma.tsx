import { useState } from 'react'
import { FlaskConical, Play, ChevronLeft, X } from 'lucide-react'
import type { PumpDecomposition, PumpTest } from './automata'
import {
  testPumping as tp,
  isAnBn as isAnBnFn,
  isAStar as isAStarFn,
} from './automata'

const fa = (n: number) => n.toLocaleString('fa-IR')

type Language = 'anbn' | 'astar'

const languageLabels: Record<Language, string> = {
  anbn: 'aⁿbⁿ (بعدی به اندازهٔ_before_)',
  astar: 'a* (منظم)',
}

export default function PumpingLemma({ onBack }: { onBack: () => void }) {
  const [language, setLanguage] = useState<Language>('anbn')
  const [inputString, setInputString] = useState('aaabbb')
  const [pumpingLength, setPumpingLength] = useState(3)
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<{
    decompositions: PumpDecomposition[]
    tests: PumpTest[]
    allPumpable: boolean
  } | null>(null)

  const inLanguage = (s: string) => {
    if (language === 'anbn') return isAnBnFn(s)
    return isAStarFn(s)
  }

  const runTest = () => {
    if (!inputString) {
      window.alert('لطفاً رشتهٔ ورودی را وارد کنید')
      return
    }
    if (!inLanguage(inputString)) {
      window.alert('رشتهٔ ورودی در زبان انتخاب‌شده نیست')
      return
    }
    const res = tp(inputString, pumpingLength, inLanguage)
    setResults(res)
    setShowResults(true)
  }

  const counterexamples = results
    ? results.tests.filter(t => !t.inLanguage)
    : []

  return (
    <div className="automata-lab-page">
      <aside className="automata-sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-mark">
              <FlaskConical size={26} strokeWidth={2.2} />
            </div>
            <div>
              <strong>تَرکیب</strong>
              <span>لم پمپاژ</span>
            </div>
          </div>
          <button className="sidebar-close" onClick={onBack}>
            <X size={20} />
          </button>
        </div>
        <div className="nav-label">زبان</div>
        <nav>
          {(['anbn', 'astar'] as const).map((lang: Language) => (
            <button
              key={lang}
              className={`nav-item ${language === lang ? 'active' : ''}`}
              onClick={() => { setLanguage(lang); setShowResults(false) }}
            >
              <FlaskConical size={17} />
              <span>{languageLabels[lang]}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="weekly-card">
          <div className="weekly-icon"><FlaskConical size={19} /></div>
          <strong>هدف</strong>
          <p>یافتن مثال‑نقض برای לא‑منظم بودن</p>
        </div>
      </aside>

      <main className="automata-main">
        <div className="page-heading">
          <div>
            <div className="eyebrow"><span /> لم پمپاژ برای زبان‌های منظم</div>
            <h1>ابزار تعاملی لم پمپاژ</h1>
            <p>
              برای نشان‌دادن عدم‑便ساز بودن یک زبان، رشته‌ای بلند انتخاب کرده و سعی کنید
              decomposing معتبری پیدا کنید که همه pumped strings در زبان بمانند.
            </p>
          </div>
          <div className="page-actions">
            <button className="secondary-btn" onClick={onBack}>
              <ChevronLeft size={14} /> بازگشت
            </button>
          </div>
        </div>

        <div className="workspace">
          <section className="canvas-card">
            <div className="card-head">
              <div>
                <FlaskConical size={19} />
                <h2>تنظیمات آزمایش</h2>
              </div>
            </div>
            <div className="control-panel">
              <div className="input-group">
                <label>رشتهٔ ورودی s</label>
                <input
                  value={inputString}
                  onChange={e => { setInputString(e.target.value); setShowResults(false) }}
                  placeholder="مثل: aaabbb"
                />
              </div>
              <div className="input-group">
                <label>طول پمپ p</label>
                <input
                  type="number"
                  value={pumpingLength}
                  onChange={e => { setPumpingLength(parseInt(e.target.value) || 1); setShowResults(false) }}
                  min="1"
                />
              </div>
              <div className="input-group">
                <label>زبان membership</label>
                <span>{languageLabels[language]}</span>
              </div>
              <button className="primary-btn" onClick={runTest}>
                <Play size={15} fill="currentColor" />
                {' '}اجرای آزمایش لم پمپاژ
              </button>
            </div>
          </section>

          {showResults && results && (
            <section className="canvas-card">
              <div className="card-head">
                <div>
                  <FlaskConical size={19} />
                  <h2>نتایج امتحان پمپاژ</h2>
                </div>
              </div>
              <div className="control-panel">
                <div className="result-box">
                  {results.allPumpable ? (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      <strong>تمام پمپاژ‌ها معتبرند</strong>
                      <p>این زبان ممکن است منظم باشد (برای این رشته).</p>
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      <strong>مثال‑نقض پیدا شد!</strong>
                      <p>نه decomposition معتبری وجود دارد که همه pumped strings در زبان بمانند.</p>
                    </>
                  )}
                </div>

                <h3>decompositionها ({fa(results.decompositions.length)})</h3>
                <div className="trace-list">
                  {results.decompositions.map((d, di) => {
                    const tests = results.tests.filter(t => t.decomposition === d)
                    const allOk = tests.every(t => t.inLanguage)
                    return (
                      <div key={di} className={`trace-step ${allOk ? '' : 'rejected'}`}>
                        <span className="trace-desc">
                          x='{d.x}' &nbsp; y='{d.y}' &nbsp; z='{d.z}'
                        </span>
                        <span className="trace-states">
                          {fa(tests.length)} تست · {allOk ? 'همهٔ معتبر' : 'تست‌های نامعتبر:'}
                        </span>
                        <div className="trace-sub">
                          {tests.map((t, ti) => (
                            <div key={ti} className={`trace-sub-step ${t.inLanguage ? '' : 'rejected'}`}>
                              i={t.i} → '{t.pumped}' {t.inLanguage ? '✓' : '✗'}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {counterexamples.length > 0 && (
                  <div className="conversion-panel">
                    <h3>مثال‌های‑نقض ({fa(counterexamples.length)})</h3>
                    <p>این pumped strings خارج از زبان قرار می‌گیرند → زبانไม่ منظم است.</p>
                    <div className="trace-list">
                      {counterexamples.map((t, i) => (
                        <div key={i} className="trace-step rejected">
                          <span className="trace-desc">
                            i={t.i} · x='{t.decomposition.x}' y='{t.decomposition.y}' z='{t.decomposition.z}'
                          </span>
                          <span className="trace-states">
                            pumped='{t.pumped}' → {t.reason}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        <footer className="page-footer">
          <span><FlaskConical size={16} /> <i>لم پمپاژ: ابزار کشف زبان‌های غيرمنظم.</i></span>
        </footer>
      </main>
    </div>
  )
}
