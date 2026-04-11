import type { AppState } from '../types'

export function encodeState(state: AppState): string {
  const json = JSON.stringify(state)
  return btoa(encodeURIComponent(json))
}

export function decodeState(hash: string): AppState | null {
  try {
    const json = decodeURIComponent(atob(hash))
    const parsed: unknown = JSON.parse(json)
    if (
      parsed &&
      typeof parsed === 'object' &&
      'seats' in parsed &&
      'attendees' in parsed &&
      Array.isArray((parsed as AppState).seats) &&
      Array.isArray((parsed as AppState).attendees)
    ) {
      return parsed as AppState
    }
    return null
  } catch {
    return null
  }
}
