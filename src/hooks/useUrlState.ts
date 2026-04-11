import { useEffect } from 'react'
import { decodeState } from '../utils/urlCodec'
import type { AppState } from '../types'

export function useUrlState(onLoad: (state: AppState) => void) {
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash) return
    const state = decodeState(hash)
    if (state) {
      onLoad(state)
      // ハッシュをクリア（URLをきれいに保つ）
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [onLoad])
}
