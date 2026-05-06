import { useEffect, useMemo, useRef } from 'react'
import type { Socket } from 'socket.io-client'

export interface DashboardUpdatedSocketPayload {
  grupoId?: string | number
  groupId?: string | number
  tipo?: string
  entidadTipo?: string | null
  entidadId?: string | number | null
  actorUsuarioId?: string | number | null
  createdAt?: string
  metadata?: Record<string, unknown>
}

interface UseGroupRealtimeRefreshOptions {
  socket: Socket | null
  groupId: string | null | undefined
  onRefresh: (payload: DashboardUpdatedSocketPayload) => void | Promise<void>
  events?: string[]
  debounceMs?: number
}

export function useGroupRealtimeRefresh({
  socket,
  groupId,
  onRefresh,
  events = ['dashboard_updated', 'vote_updated'],
  debounceMs = 250,
}: UseGroupRealtimeRefreshOptions) {
  const timerRef = useRef<number | null>(null)
  const normalizedEvents = useMemo(() => events.join('|'), [events])

  useEffect(() => {
    if (!socket || !groupId) return

    const schedule = (payload: DashboardUpdatedSocketPayload = {}) => {
      const payloadGroupId = payload.grupoId ?? payload.groupId
      if (payloadGroupId !== undefined && String(payloadGroupId) !== String(groupId)) return

      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        void onRefresh(payload)
      }, debounceMs)
    }

    const eventList = normalizedEvents.split('|').filter(Boolean)

    socket.emit('join_room', { tripId: groupId })
    eventList.forEach((event) => socket.on(event, schedule))

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }

      socket.emit('leave_room', { tripId: groupId })
      eventList.forEach((event) => socket.off(event, schedule))
    }
  }, [socket, groupId, onRefresh, debounceMs, normalizedEvents])
}
