import { useEffect, useMemo, useRef } from 'react'
import type { Socket } from 'socket.io-client'
import { supabase } from '../lib/supabase'

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
  tables?: string[]
}

export function useGroupRealtimeRefresh({
  socket,
  groupId,
  onRefresh,
  events = ['dashboard_updated', 'vote_updated'],
  debounceMs = 250,
  tables = ['propuestas', 'voto', 'comentario', 'expenses', 'expense_splits', 'settlement_payments', 'grupos_viaje'],
}: UseGroupRealtimeRefreshOptions) {
  const timerRef = useRef<number | null>(null)
  const normalizedEvents = useMemo(() => events.join('|'), [events])
  const normalizedTables = useMemo(() => tables.join('|'), [tables])

  useEffect(() => {
    if (!groupId) return

    const schedule = (payload: DashboardUpdatedSocketPayload = {}) => {
      const payloadGroupId = payload.grupoId ?? payload.groupId
      if (payloadGroupId !== undefined && String(payloadGroupId) !== String(groupId)) return

      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        void onRefresh(payload)
      }, debounceMs)
    }

    const eventList = normalizedEvents.split('|').filter(Boolean)

    if (socket) {
      socket.emit('join_room', { tripId: groupId })
      eventList.forEach((event) => socket.on(event, schedule))
    }

    const tableList = normalizedTables.split('|').filter(Boolean)
    const channel = supabase.channel(`ithera-group-refresh-${groupId}`)

    tableList.forEach((table) => {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
        },
        (payload) => {
          const row = (payload.new && Object.keys(payload.new).length ? payload.new : payload.old) as Record<string, unknown>
          const rowGroupId = row?.grupo_id ?? row?.group_id ?? row?.trip_id

          // Tablas hijas como voto/comentario/expense_splits no siempre tienen grupo_id directo;
          // en esos casos dejamos que el refetch valide desde backend.
          if (rowGroupId !== undefined && String(rowGroupId) !== String(groupId)) return

          schedule({
            grupoId: rowGroupId !== undefined ? String(rowGroupId) : String(groupId),
            tipo: `${table}_${payload.eventType.toLowerCase()}`,
            entidadTipo: table,
            entidadId: typeof row?.id === 'number' || typeof row?.id === 'string'
              ? row.id
              : (row?.id_propuesta as string | number | undefined) ?? null,
            createdAt: new Date().toISOString(),
          })
        }
      )
    })

    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.warn(`[Realtime] Error en canal de grupo ${groupId}. Se mantiene socket/API como respaldo.`)
      }
    })

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
      if (socket) {
        socket.emit('leave_room', { tripId: groupId })
        eventList.forEach((event) => socket.off(event, schedule))
      }
      void supabase.removeChannel(channel)
    }
  }, [socket, groupId, onRefresh, debounceMs, normalizedEvents, normalizedTables])
}
