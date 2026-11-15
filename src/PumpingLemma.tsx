import { useMemo, useState } from 'react'
import {
  AlertTriangle, Check, CheckCircle2, ChevronLeft, FlaskConical, Lightbulb,
  Minus, Plus, RotateCcw, Sparkles, X,
} from 'lucide-react'
import { M } from './Lesson'
import { pumpingLanguages, testPumping } from './automata'
import type { PumpingLanguageSpec } from './automata'

const fa = (n: number) => n.toLocaleString('fa-IR')

export default function PumpingLemma({
  onBack,
  onToast,
  onOpenAutomata,
}: {
  onBack: () => void
  onToast?: (msg: string) => void
  onOpenAutomata?: () => void
}) {
  const [langId, setLangId] = useState<PumpingLanguageSpec['id']>('anbn')
  const [pumpingLength, setPumpingLength] = useState(3)
  const [inputString, setInputString] = useState('aaabbb')
  const [selectedDecompIdx, setSelectedDecompIdx] = useState(0)
  const [pumpPower, setPumpPower] = useState(2)
  const [filterMode, setFilterMode] = useState<'all' | 'valid' | 'failed'>('all')

  const lang = pumpingLanguages.find(l => l.id === langId) || pumpingLanguages[0]
  const membership = useMemo(() => lang.check(inputString), [lang, inputString])
  const lengthOk = inputString.length >= pumpingLength

  const analysis = useMemo(() => {
    if (!membership.inLanguage || !lengthOk) return null
    return testPumping(inputString, pumpingLength, lang.check, 4)
  }, [inputString, pumpingLength, lang, membership.inLanguage, lengthOk])

  const selectLanguage = (nextId: PumpingLanguageSpec['id']) => {
    const nextLang = pumpingLanguages.find(l => l.id === nextId)!
    setLangId(nextId)
    setInputString(nextLang.suggestString(pumpingLength))
    setSelectedDecompIdx(0)
    setPumpPower(2)
    setFilterMode('all')
    onToast?.(`زبان «${nextLang.name}» انتخاب شد`)
  }

  const updateP = (nextP: number) => {
    const clamped = Math.max(1, Math.min(8, nextP))
    setPumpingLength(clamped)
    setSelectedDecompIdx(0)
  }

  const applySuggested = () => {
    const suggested = lang.suggestString(pumpingLength)
    setInputString(suggested)
    setSelectedDecompIdx(0)
    onToast?.(`رشتهٔ نمونه «${suggested}» متناسب با p=${fa(pumpingLength)} ساخته شد`)
  }

  const selectedDecomp =
    analysis && analysis.decompositions.length > 0
      ? analysis.decompositions[Math.min(selectedDecompIdx, analysis.decompositions.length - 1)]
      : null

  const pumpedPreview = selectedDecomp
    ? {
      x: selectedDecomp.x,
      yPart: selectedDecomp.y.repeat(pumpPower),
      z: selectedDecomp.z,
      full: selectedDecomp.x + selectedDecomp.y.repeat(pumpPower) + selectedDecomp.z,
    }
    : null

  const pumpedCheck = pumpedPreview ? lang.check(pumpedPreview.full) : null

  const visibleDecompositions = useMemo(() => {
    if (!analysis) return []
    const validSet = new Set(analysis.validDecompositions)
    return analysis.decompositions
      .map((d, idx) => ({ d, idx, isValid: validSet.has(d) }))
      .filter(item => {
        if (filterMode === 'valid') return item.isValid
        if (filterMode === 'failed') return !item.isValid
        return true
      })
  }, [analysis, filterMode])

  return (
    <div className="pumping-lab-view">
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span /> کشف مثال‌نقض و آزمون منظم‌بودن</div>
          <h1>آزمایشگاه لم پمپاژ</h1>
          <p>یک رشته از زبان انتخاب کن، افرازهای مجاز xyz را بررسی کن و ببین آیا زبان منظم می‌تواند باشد یا نه.</p>
        </div>
        <div className="page-actions">
          <button className="secondary-btn" onClick={applySuggested}>
            <Sparkles size={16} /> ساخت رشته برای p={fa(pumpingLength)}
          </button>
          <button
            className="primary-btn"
            onClick={() => {
              setPumpingLength(3)
              setInputString(lang.suggestString(3))
              setSelectedDecompIdx(0)
              setPumpPower(2)
            }}
          >
            <RotateCcw size={16} /> بازنشانی
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon green"><FlaskConical size={21} /></div>
          <div><span>طول پمپ فعلی</span><strong>{fa(pumpingLength)}</strong></div>
          <small>p</small>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><Sparkles size={21} /></div>
          <div><span>طول رشتهٔ آزمون</span><strong>{fa(inputString.length)}</strong></div>
          <small>|s|</small>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><CheckCircle2 size={21} /></div>
          <div>
            <span>افرازهای مجاز</span>
            <strong>{analysis ? fa(analysis.decompositions.length) : fa(0)}</strong>
          </div>
          <small>|xy| ≤ p</small>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><Lightbulb size={21} /></div>
          <div>
            <span>افرازهای ماندگار</span>
            <strong>{analysis ? fa(analysis.validDecompositions.length) : fa(0)}</strong>
          </div>
          <small>∀i: xyⁱz ∈ L</small>
        </div>
      </div>

      <div className="pump-workspace">
        <section className="canvas-card">
          <div className="card-head">
            <div>
              <FlaskConical size={19} />
              <h2>تنظیم زبان، رشته و آزمایش برش</h2>
            </div>
            <span className="live-badge">
              <i /> {lang.isRegular ? 'زبان منظم' : 'زبان غیرمنظم'}
            </span>
          </div>

          <div className="auto-panel-body">
            <div className="auto-field">
              <label>زبان مورد بررسی را انتخاب کنید</label>
              <div className="pump-lang-grid">
                {pumpingLanguages.map(item => (
                  <button
                    key={item.id}
                    className={`pump-lang-btn ${lang.id === item.id ? 'active' : ''}`}
                    onClick={() => selectLanguage(item.id)}
                  >
                    <span className={`pump-lang-tag ${item.isRegular ? 'regular' : ''}`}>
                      {item.isRegular ? 'منظم' : 'غیرمنظم'}
                    </span>
                    <strong>{item.name}</strong>
                    <small>{item.isRegular ? 'همیشه افراز معتبر دارد' : 'مثال‌نقض دارد'}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="pump-formula-box">
              <M display>{lang.formula}</M>
              <p>{lang.description}</p>
            </div>

            <div className="pump-controls-row">
              <div className="auto-field">
                <label>رشتهٔ آزمون s (باید s ∈ L و |s| ≥ p باشد)</label>
                <div className="auto-input-row">
                  <input
                    value={inputString}
                    onChange={e => {
                      setInputString(e.target.value)
                      setSelectedDecompIdx(0)
                    }}
                    placeholder="مثلاً: aaabbb"
                  />
                  <button className="auto-eps-btn" onClick={applySuggested}>
                    پیشنهاد برای p
                  </button>
                </div>
              </div>

              <div className="auto-field">
                <label>طول پمپ p</label>
                <div className="pump-stepper">
                  <button disabled={pumpingLength <= 1} onClick={() => updateP(pumpingLength - 1)}>
                    <Minus size={15} />
                  </button>
                  <span>{fa(pumpingLength)}</span>
                  <button disabled={pumpingLength >= 8} onClick={() => updateP(pumpingLength + 1)}>
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            </div>

            {!membership.inLanguage ? (
              <div className="auto-verdict rejected">
                <X size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>رشتهٔ واردشده عضو زبان L نیست</strong>
                  <p>{membership.reason} برای اعمال لم پمپاژ ابتدا یک رشته از داخل زبان L انتخاب کنید.</p>
                </div>
              </div>
            ) : !lengthOk ? (
              <div className="auto-verdict warning">
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>طول رشته از p کمتر است</strong>
                  <p>
                    طول رشتهٔ فعلی {fa(inputString.length)} است ولی باید حداقل به اندازهٔ p ({fa(pumpingLength)}) باشد.
                  </p>
                </div>
              </div>
            ) : (
              selectedDecomp && pumpedPreview && pumpedCheck && (
                <div className="pump-cut-visualizer">
                  <div className="pump-cut-head">
                    <strong>نمایش تعاملی افراز انتخاب‌شده (s = xyz)</strong>
                    <div className="pump-xyz-chips">
                      <span className="pump-seg-x">x = {selectedDecomp.x || 'ε'}</span>
                      <span className="pump-seg-y">y = {selectedDecomp.y}</span>
                      <span className="pump-seg-z">z = {selectedDecomp.z || 'ε'}</span>
                    </div>
                  </div>

                  <div className="pump-i-selector">
                    <span>تکرار بخش y (توان i):</span>
                    {[0, 1, 2, 3, 4].map(power => (
                      <button
                        key={power}
                        className={pumpPower === power ? 'active' : ''}
                        onClick={() => setPumpPower(power)}
                      >
                        i = {fa(power)}
                      </button>
                    ))}
                  </div>

                  <div className="pump-pumped-string">
                    {pumpedPreview.full === '' ? (
                      <span>ε (رشتهٔ تهی)</span>
                    ) : (
                      <>
                        {pumpedPreview.x && <span className="seg-x">{pumpedPreview.x}</span>}
                        {pumpedPreview.yPart && <span className="seg-y">{pumpedPreview.yPart}</span>}
                        {pumpedPreview.z && <span className="seg-z">{pumpedPreview.z}</span>}
                      </>
                    )}
                  </div>

                  <div
                    className={`auto-verdict ${pumpedCheck.inLanguage ? 'accepted' : 'rejected'}`}
                    style={{ marginTop: 10 }}
                  >
                    {pumpedCheck.inLanguage
                      ? <Check size={17} style={{ flexShrink: 0, marginTop: 2 }} />
                      : <X size={17} style={{ flexShrink: 0, marginTop: 2 }} />}
                    <div>
                      <strong>
                        {pumpedCheck.inLanguage
                          ? `برای i=${fa(pumpPower)}، رشتهٔ xyⁱz در زبان L باقی ماند`
                          : `برای i=${fa(pumpPower)}، رشتهٔ xyⁱz از زبان L خارج شد!`}
                      </strong>
                      <p>{pumpedCheck.reason}</p>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </section>

        <aside className="auto-panel">
          <div className="card-head">
            <div>
              <Lightbulb size={19} />
              <h2>نتیجهٔ بررسی همهٔ افرازها</h2>
            </div>
          </div>

          <div className="auto-panel-body">
            {!analysis ? (
              <div className="auto-verdict warning">
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>در انتظار رشتهٔ معتبر</strong>
                  <p>رشته‌ای وارد کنید که عضو زبان باشد و طول آن حداقل برابر p باشد؛ یا روی «ساخت رشته برای p» کلیک کنید.</p>
                </div>
              </div>
            ) : (
              <>
                <div className={`auto-verdict ${analysis.counterexampleFound ? 'rejected' : 'accepted'}`}>
                  {analysis.counterexampleFound
                    ? <CheckCircle2 size={19} style={{ flexShrink: 0, marginTop: 2 }} />
                    : <Lightbulb size={19} style={{ flexShrink: 0, marginTop: 2 }} />}
                  <div>
                    <strong>
                      {analysis.counterexampleFound
                        ? `مثال‌نقض علیه p = ${fa(pumpingLength)} پیدا شد!`
                        : `${fa(analysis.validDecompositions.length)} افراز معتبر یافت شد`}
                    </strong>
                    <p>
                      {analysis.counterexampleFound
                        ? `برای هیچ‌یک از ${fa(analysis.decompositions.length)} افراز مجاز (|xy| ≤ p و |y| > ۰) همهٔ توان‌های i در زبان نمی‌مانند؛ پس این رشته نشان می‌دهد L با طول پمپ ${fa(pumpingLength)} سازگار نیست.`
                        : lang.isRegular
                          ? 'چون این زبان منظم است، همیشه دست‌کم یک افراز وجود دارد که با هر میزان پمپ کردن در L باقی می‌ماند.'
                          : 'این رشته افراز معتبری دارد؛ برای یافتن مثال‌نقض، رشتهٔ بلندتر یا الگوی مناسب‌تر (دکمهٔ پیشنهاد برای p) را امتحان کنید.'}
                    </p>
                  </div>
                </div>

                <div className="auto-sample-pills" style={{ marginTop: 0 }}>
                  <span>نمایش:</span>
                  <button
                    className={filterMode === 'all' ? 'active' : ''}
                    onClick={() => setFilterMode('all')}
                  >
                    همه ({fa(analysis.decompositions.length)})
                  </button>
                  <button
                    className={filterMode === 'valid' ? 'active' : ''}
                    onClick={() => setFilterMode('valid')}
                  >
                    ماندگار ({fa(analysis.validDecompositions.length)})
                  </button>
                  <button
                    className={filterMode === 'failed' ? 'active' : ''}
                    onClick={() => setFilterMode('failed')}
                  >
                    نقض‌شده ({fa(analysis.decompositions.length - analysis.validDecompositions.length)})
                  </button>
                </div>

                <div className="pump-decomp-list">
                  {visibleDecompositions.map(({ d, idx, isValid }) => {
                    const tests = analysis.tests.filter(t => t.decomposition === d)
                    return (
                      <button
                        key={idx}
                        className={`pump-decomp-item ${isValid ? 'valid' : 'failed'} ${selectedDecompIdx === idx ? 'selected' : ''}`}
                        onClick={() => setSelectedDecompIdx(idx)}
                      >
                        <div className="pump-decomp-top">
                          <div className="pump-xyz-chips">
                            <span className="pump-seg-x">x={d.x || 'ε'}</span>
                            <span className="pump-seg-y">y={d.y}</span>
                            <span className="pump-seg-z">z={d.z || 'ε'}</span>
                          </div>
                          <span style={{ fontSize: 9, color: isValid ? '#1f6b49' : '#a93b30', fontWeight: 700 }}>
                            {isValid ? 'همهٔ i معتبر' : 'نقض شد'}
                          </span>
                        </div>
                        <div className="pump-i-badges">
                          {tests.map(t => (
                            <span key={t.i} className={t.inLanguage ? 'ok' : 'fail'}>
                              i={fa(t.i)} {t.inLanguage ? '✓' : '✗'}
                            </span>
                          ))}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      <footer className="page-footer">
        <span>
          <span className="brand" /> <i>آزمون دقیق برهان خلف لم پمپاژ روی تمام افرازهای مجاز.</i>
        </span>
        {onOpenAutomata ? (
          <button onClick={onOpenAutomata}>
            بازگشت به آزمایشگاه اتوماتا <ChevronLeft size={14} />
          </button>
        ) : (
          <button onClick={onBack}>
            بازگشت به آزمایشگاه گراف <ChevronLeft size={14} />
          </button>
        )}
      </footer>
    </div>
  )
}
