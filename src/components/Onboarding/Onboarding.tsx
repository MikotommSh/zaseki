import { useState, useCallback, useRef } from 'react'
import styles from './Onboarding.module.css'

const SLIDES = [
  {
    emoji: '🗺',
    title: '座席へようこそ',
    body: '飲み会・授業・イベントの\n席決めをかんたんに。',
  },
  {
    emoji: '💺',
    title: '座席を追加する',
    body: 'キャンバスをタップすると\n座席が追加されます。\nドラッグで自由に配置できます。',
  },
  {
    emoji: '👥',
    title: '出席者を登録する',
    body: '「出席者」タブで名前を入力して\nメンバーを追加します。',
  },
  {
    emoji: '🔀',
    title: '席決めをする',
    body: '席決めボタンでランダムに自動配席。\n📌 ピンで特定の席を固定すると\nシャッフルしても動きません。',
  },
  {
    emoji: '🔗',
    title: '共有・書き出し',
    body: '🖼 書き出し — 座席表を画像として保存\n🔗 共有 — URLを送ると\n　　受け取った人もそのまま編集できます。',
  },
]

const STORAGE_KEY = 'zaseki_onboarding_done'

export function hasSeenOnboarding(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

interface Props {
  onClose: () => void
}

export function Onboarding({ onClose }: Props) {
  const [index, setIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const close = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true')
    onClose()
  }, [onClose])

  const next = useCallback(() => {
    if (index < SLIDES.length - 1) setIndex((i) => i + 1)
    else close()
  }, [index, close])

  const prev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1))
  }, [])

  // スワイプ操作
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (dx < -50) next()
    else if (dx > 50) prev()
  }, [next, prev])

  const slide = SLIDES[index]
  const isLast = index === SLIDES.length - 1

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div
        className={styles.card}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* 閉じるボタン */}
        <button className={styles.closeBtn} onClick={close} aria-label="閉じる">
          ✕
        </button>

        {/* スライドコンテンツ */}
        <div className={styles.content}>
          <div className={styles.emoji}>{slide.emoji}</div>
          <h2 className={styles.title}>{slide.title}</h2>
          <p className={styles.body}>
            {slide.body.split('\n').map((line, i) => (
              <span key={i}>{line}<br /></span>
            ))}
          </p>
        </div>

        {/* ドットインジケーター */}
        <div className={styles.dots}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={[styles.dot, i === index ? styles.dotActive : ''].join(' ')}
              onClick={() => setIndex(i)}
              aria-label={`スライド ${i + 1}`}
            />
          ))}
        </div>

        {/* ナビゲーションボタン */}
        <div className={styles.nav}>
          <button
            className={styles.prevBtn}
            onClick={prev}
            disabled={index === 0}
          >
            ‹ 前へ
          </button>
          <button className={styles.nextBtn} onClick={next}>
            {isLast ? 'はじめる' : '次へ ›'}
          </button>
        </div>
      </div>
    </div>
  )
}
