import { useState, useCallback, useRef, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import type { AppState } from '../../types'
import type { AppActions } from '../../store/useAppState'
import { AttendeeItem } from './AttendeeItem'
import { encodeState } from '../../utils/urlCodec'
import { exportImageFit } from '../../utils/exportImage'
import styles from './SidePanel.module.css'

const WEB_BASE_URL = 'https://mikotommsh.github.io/zaseki/'

interface Props {
  state: AppState
  actions: AppActions
  selectedSeatId: string | null
  canvasRef: React.RefObject<HTMLDivElement | null>
  innerRef: React.MutableRefObject<HTMLDivElement | null>
  isPlacingLandmark: boolean
  onTogglePlacingLandmark: () => void
  onAfterShuffle?: () => void
  onShowOnboarding: () => void
}

export function SidePanel({ state, actions, selectedSeatId, canvasRef, innerRef, isPlacingLandmark, onTogglePlacingLandmark, onAfterShuffle, onShowOnboarding }: Props) {
  const [inputName, setInputName] = useState('')
  const [shareMsg, setShareMsg] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // メニュー外タップで閉じる
  useEffect(() => {
    if (!isMenuOpen) return
    const handlePointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isMenuOpen])

  const handleAddAttendee = useCallback(() => {
    const name = inputName.trim()
    if (!name) return
    actions.addAttendee(name)
    setInputName('')
    inputRef.current?.focus()
  }, [inputName, actions])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleAddAttendee()
    },
    [handleAddAttendee]
  )

  const handleShare = useCallback(async () => {
    setIsMenuOpen(false)
    const encoded = encodeState(state)
    const shareUrl = `${WEB_BASE_URL}#${encoded}`
    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({ url: shareUrl, title: '座席表を共有' })
      } catch {
        // ユーザーがキャンセルした場合など
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl)
        setShareMsg('URLをコピーしました！')
      } catch {
        setShareMsg('URLのコピーに失敗しました')
      }
      setTimeout(() => setShareMsg(''), 2500)
    }
  }, [state])

  const handleExport = useCallback(async () => {
    setIsMenuOpen(false)
    if (!canvasRef.current || !innerRef.current || isExporting) return
    setIsExporting(true)
    try {
      await exportImageFit(canvasRef.current, innerRef.current, state)
    } finally {
      setIsExporting(false)
    }
  }, [canvasRef, innerRef, state, isExporting])

  // 座席マップ: attendeeId → Seat
  const seatByAttendee = Object.fromEntries(
    state.seats
      .filter((s) => s.assignedAttendeeId)
      .map((s) => [s.assignedAttendeeId!, s])
  )

  const selectedSeat = selectedSeatId
    ? state.seats.find((s) => s.id === selectedSeatId)
    : null

  const unassignedCount = state.attendees.filter(
    (a) => !seatByAttendee[a.id]
  ).length

  const emptySeatCount = state.seats.filter((s) => !s.assignedAttendeeId).length

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <h1 className={styles.title}>座席</h1>
        <div className={styles.stats}>
          <span>{state.attendees.length}人</span>
          <span>/</span>
          <span>{state.seats.length}席</span>
        </div>

        {/* ハンバーガーメニュー */}
        <div ref={menuRef} className={styles.menuWrapper}>
          <button
            className={styles.menuBtn}
            onClick={() => setIsMenuOpen((v) => !v)}
            title="メニュー"
          >
            ☰
          </button>
          {isMenuOpen && (
            <div className={styles.menuDropdown}>
              <button
                className={styles.menuItem}
                onClick={handleExport}
                disabled={isExporting || state.seats.length === 0}
              >
                🖼 書き出し
              </button>
              <button
                className={styles.menuItem}
                onClick={handleShare}
                disabled={state.seats.length === 0 && state.attendees.length === 0}
              >
                🔗 共有
              </button>
              <div className={styles.menuDivider} />
              <button
                className={styles.menuItem}
                onClick={() => { setIsMenuOpen(false); onShowOnboarding() }}
              >
                ❓ 使い方
              </button>
            </div>
          )}
        </div>
      </div>

      {shareMsg && <p className={styles.shareMsg}>{shareMsg}</p>}

      {/* 選択中の座席ヒント */}
      {selectedSeat && (
        <div className={styles.hint}>
          <span>💺 座席を選択中</span>
          <span className={styles.hintSub}>出席者をクリックして割り当て</span>
        </div>
      )}

      {/* 出席者追加 */}
      <div className={styles.addRow}>
        <input
          ref={inputRef}
          className={styles.nameInput}
          value={inputName}
          onChange={(e) => setInputName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="名前を入力..."
          maxLength={20}
        />
        <button
          className={styles.addBtn}
          onClick={handleAddAttendee}
          disabled={!inputName.trim()}
        >
          ＋
        </button>
      </div>

      {/* 出席者リスト */}
      <div className={styles.attendeeList}>
        {state.attendees.length === 0 ? (
          <p className={styles.emptyMsg}>出席者を追加してください</p>
        ) : (
          state.attendees.map((attendee) => {
            const assignedSeat = seatByAttendee[attendee.id]
            const isSelectable =
              !!selectedSeat &&
              !assignedSeat &&
              attendee.id !== selectedSeat.assignedAttendeeId

            return (
              <AttendeeItem
                key={attendee.id}
                attendee={attendee}
                assignedSeat={assignedSeat}
                isSelectable={isSelectable}
                onAssign={() => {
                  if (selectedSeat) {
                    actions.assignAttendee(selectedSeat.id, attendee.id)
                  }
                }}
                onRemove={() => actions.removeAttendee(attendee.id)}
              />
            )
          })
        )}
      </div>

      {/* オブジェクト配置セクション */}
      <div className={styles.objectSection}>
        <button
          className={[styles.btn, isPlacingLandmark ? styles.placingActive : styles.objectBtn].join(' ')}
          onClick={onTogglePlacingLandmark}
          data-testid="toggle-landmark-mode"
        >
          {isPlacingLandmark ? '✕ 配置モード解除' : '＋ オブジェクト配置'}
        </button>
        {isPlacingLandmark && (
          <p className={styles.placingHint}>キャンバスをクリックして配置<br />(ESC で解除)</p>
        )}
      </div>

      {/* 席決めボタン */}
      <div className={styles.actions}>
        <button
          className={[styles.btn, styles.shuffleBtn].join(' ')}
          onClick={() => { actions.shuffleSeats(); onAfterShuffle?.() }}
          disabled={state.seats.length === 0 || state.attendees.length === 0}
          title={`未割り当て: ${unassignedCount}人 / 空き席: ${emptySeatCount}席`}
        >
          🔀 席決め
        </button>
      </div>
    </aside>
  )
}
