import { useReducer } from 'react'
import { reducer, initialState, type Action } from './reducer'
import type { AppState } from '../types'

export function useAppState() {
  const [state, dispatch] = useReducer(reducer, initialState)

  return {
    state,
    dispatch,
    addSeat: (x: number, y: number) =>
      dispatch({ type: 'ADD_SEAT', payload: { x, y } }),
    removeSeat: (id: string) =>
      dispatch({ type: 'REMOVE_SEAT', payload: { id } }),
    moveSeat: (id: string, x: number, y: number) =>
      dispatch({ type: 'MOVE_SEAT', payload: { id, x, y } }),
    updateSeatLabel: (id: string, label: string) =>
      dispatch({ type: 'UPDATE_SEAT_LABEL', payload: { id, label } }),
    togglePin: (id: string) =>
      dispatch({ type: 'TOGGLE_PIN', payload: { id } }),
    assignAttendee: (seatId: string, attendeeId: string) =>
      dispatch({ type: 'ASSIGN_ATTENDEE', payload: { seatId, attendeeId } }),
    unassignSeat: (id: string) =>
      dispatch({ type: 'UNASSIGN_SEAT', payload: { id } }),
    addAttendee: (name: string) =>
      dispatch({ type: 'ADD_ATTENDEE', payload: { name } }),
    removeAttendee: (id: string) =>
      dispatch({ type: 'REMOVE_ATTENDEE', payload: { id } }),
    shuffleSeats: () => dispatch({ type: 'SHUFFLE' }),
    addLandmark: (x: number, y: number, label: string) =>
      dispatch({ type: 'ADD_LANDMARK', payload: { x, y, label } }),
    removeLandmark: (id: string) =>
      dispatch({ type: 'REMOVE_LANDMARK', payload: { id } }),
    moveLandmark: (id: string, x: number, y: number) =>
      dispatch({ type: 'MOVE_LANDMARK', payload: { id, x, y } }),
    updateLandmarkLabel: (id: string, label: string) =>
      dispatch({ type: 'UPDATE_LANDMARK_LABEL', payload: { id, label } }),
    loadState: (payload: AppState) =>
      dispatch({ type: 'LOAD_STATE', payload }),
  } as const
}

export type AppActions = ReturnType<typeof useAppState>
export type { Action }
