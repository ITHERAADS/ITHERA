import { useEffect, useMemo, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { GoogleMiniMap } from '../../GoogleMiniMap/GoogleMiniMap'
import type { Group } from '../../../types/groups'
import { chatService, type ChatMessage } from '../../../services/chat'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Participant {
  id: string
  name: string
  role: 'Organizador' | 'Miembro'
  color: string
  isOnline: boolean
}

interface MemberFromBackend {
  id: string
  usuario_id?: string
  nombre?: string
  email?: string
  rol: 'admin' | 'viajero' | string
}

interface ChatAck {
  ok: boolean
  message?: ChatMessage
  error?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getParticipantColor(authorName: string | undefined, participants: Participant[]): string {
  const found = participants.find((participant) => participant.name === authorName)
  return found?.color ?? '#7A4FD6'
}

function formatChatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function IconSend({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2" stroke="currentColor" strokeWidth="2" fill="currentColor"/>
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RightPanelDashboard({
  members = [],
  group,
  isLoading = false,
  socket,
  isSocketConnected = false,
  accessToken,
  currentUserId,
  currentUserName = 'Usuario',
}: {
  members?: MemberFromBackend[]
  group?: Group | null
  isLoading?: boolean
  socket?: Socket | null
  isSocketConnected?: boolean
  accessToken?: string | null
  currentUserId?: string | number | null
  currentUserName?: string
}) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatError, setChatError] = useState<string | null>(null)
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const groupId = group?.id ? String(group.id) : null
  const currentUserIdStr = currentUserId != null ? String(currentUserId) : null

  const participants: Participant[] = useMemo(() => {
    return members.map((member, index) => {
      const name = member.nombre || member.email || 'Usuario'
      const colors = ['#1E6FD9', '#35C56A', '#7A4FD6', '#F59E0B']

      return {
        id: String(member.usuario_id ?? member.id),
        name,
        role: member.rol === 'admin' ? 'Organizador' : 'Miembro',
        color: colors[index % colors.length],
        isOnline: onlineUserIds.includes(String(member.usuario_id ?? member.id)),
      }
    })
  }, [members, onlineUserIds])

  const onlineCount = participants.filter((participant) => participant.isOnline).length

  useEffect(() => {
    if (!groupId || !accessToken) {
      setChatMessages([])
      setOnlineUserIds([])
      return
    }

    let isMounted = true

    const loadMessages = async () => {
      try {
        setIsChatLoading(true)
        setChatError(null)
        const response = await chatService.getMessages(groupId, accessToken, 50)

        if (isMounted) {
          setChatMessages(response.messages)
        }
      } catch (error) {
        if (isMounted) {
          setChatError(error instanceof Error ? error.message : 'No se pudo cargar el chat')
        }
      } finally {
        if (isMounted) {
          setIsChatLoading(false)
        }
      }
    }

    void loadMessages()

    return () => {
      isMounted = false
    }
  }, [groupId, accessToken])

  useEffect(() => {
    if (!socket || !groupId) return

    socket.emit('join_room', { tripId: groupId })

    const handleChatMessage = (message: ChatMessage & { clientId?: string | null }) => {
      if (String(message.groupId) !== groupId) return

      setChatMessages((prev) => {
        const withoutOptimistic = message.clientId
          ? prev.filter((item) => item.id !== message.clientId)
          : prev

        if (withoutOptimistic.some((item) => item.id === message.id)) {
          return withoutOptimistic
        }

        return [...withoutOptimistic, message]
      })
    }

    const handlePresenceUpdate = (payload: { tripId: string; onlineUserIds: string[] }) => {
      if (String(payload.tripId) !== groupId) return
      setOnlineUserIds(payload.onlineUserIds.map(String))
    }

    const handleError = (payload: { message?: string }) => {
      setChatError(payload.message ?? 'Error de conexión del chat')
    }

    socket.on('chat_message', handleChatMessage)
    socket.on('presence_update', handlePresenceUpdate)
    socket.on('error_event', handleError)

    return () => {
      socket.emit('leave_room', { tripId: groupId })
      socket.off('chat_message', handleChatMessage)
      socket.off('presence_update', handlePresenceUpdate)
      socket.off('error_event', handleError)
      setOnlineUserIds([])
    }
  }, [socket, groupId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [chatMessages.length])

  function handleSend() {
    const text = chatInput.trim()
    if (!text || !groupId || !accessToken) return

    setChatError(null)
    setChatInput('')

    const clientId = `local-${Date.now()}`
    const optimisticMessage: ChatMessage = {
      id: clientId,
      groupId,
      userId: currentUserIdStr ?? 'me',
      authorName: currentUserName,
      authorEmail: null,
      authorAvatarUrl: null,
      contenido: text,
      createdAt: new Date().toISOString(),
      clientId,
    }

    setChatMessages((prev) => [...prev, optimisticMessage])

    if (socket && isSocketConnected) {
      socket.timeout(7000).emit(
        'chat_send_message',
        { groupId, contenido: text, clientId },
        (err: Error | null, response?: ChatAck) => {
          if (err || !response?.ok) {
            setChatMessages((prev) => prev.filter((message) => message.id !== clientId))
            setChatError(response?.error ?? 'No se pudo enviar el mensaje por Socket.IO')
          }
        }
      )
      return
    }

    void chatService.sendMessage(groupId, text, accessToken).catch((error) => {
      setChatMessages((prev) => prev.filter((message) => message.id !== clientId))
      setChatError(error instanceof Error ? error.message : 'No se pudo enviar el mensaje')
    })
  }

  if (isLoading) {
    return (
      <>
        <section className="shrink-0">
          <div className="mb-3 h-3 w-24 animate-pulse rounded bg-gray-200" />
          <div className="mb-3 flex gap-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
            ))}
          </div>
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
                <div className="flex-1">
                  <div className="mb-1 h-3 w-24 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="shrink-0">
          <div className="mb-2 h-3 w-20 animate-pulse rounded bg-gray-200" />
          <div className="mb-2 h-28 w-full animate-pulse rounded-xl bg-gray-200" />
          <div className="mb-1 h-3 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-40 animate-pulse rounded bg-gray-200" />
        </section>

        <section className="flex flex-1 flex-col gap-2 min-h-0">
          <div className="h-3 w-28 animate-pulse rounded bg-gray-200" />
          <div className="flex-1 rounded-2xl border border-purpleMedium/20 bg-surface p-4">
            <div className="mb-3 h-16 w-32 animate-pulse rounded-2xl bg-gray-200" />
            <div className="ml-auto h-16 w-36 animate-pulse rounded-2xl bg-gray-200" />
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      {/* Participants */}
      <section className="shrink-0">
        <div className="flex items-center justify-between mb-3">
          <span className="font-body text-[10px] font-semibold text-gray500 uppercase tracking-widest">
            Participantes
          </span>
          <span className="font-body text-[11px] font-semibold text-greenAccent bg-greenAccent/10 rounded-full px-2 py-0.5">
            {onlineCount} en línea
          </span>
        </div>

        <div className="flex -space-x-2 mb-3">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white font-body font-bold text-xs shrink-0"
              style={{ backgroundColor: participant.color }}
              title={participant.name}
            >
              {participant.name[0]}
            </div>
          ))}
        </div>

        <ul className="flex flex-col gap-2.5">
          {participants.map((participant) => (
            <li key={participant.id} className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-body font-bold text-xs shrink-0"
                style={{ backgroundColor: participant.color }}
              >
                {participant.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body text-xs font-semibold text-gray700 truncate leading-none">
                  {participant.name}
                </p>
                <p className="font-body text-[11px] mt-0.5 leading-none" style={{ color: participant.color }}>
                  {participant.role}
                </p>
              </div>
              {participant.isOnline && (
                <span className="w-2 h-2 rounded-full bg-greenAccent shrink-0" />
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Mini map */}
      <section className="shrink-0">
        <p className="font-body text-[10px] font-semibold text-gray500 uppercase tracking-widest mb-2">
          Destino
        </p>

        <div className="mb-2">
          <GoogleMiniMap
            lat={group?.destino_latitud}
            lng={group?.destino_longitud}
            title={group?.destino || group?.nombre || 'Destino'}
          />
        </div>

        <p className="font-body text-xs font-bold text-purpleNavbar leading-none">
          {group?.destino || 'Destino pendiente'}
        </p>

        <p className="font-body text-[11px] text-gray500 mt-0.5 leading-none">
          {group?.destino_formatted_address || 'Ubicación no disponible'}
        </p>

        {group?.destino_latitud != null && group?.destino_longitud != null && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${group.destino_latitud},${group.destino_longitud}`}
            target="_blank"
            rel="noreferrer"
            className="font-body text-[11px] text-bluePrimary mt-1.5 hover:underline inline-block"
          >
            Ver en mapa completo →
          </a>
        )}
      </section>

      {/* Group chat */}
      <section className="flex flex-col gap-2 flex-1 min-h-0">
        <div className="flex items-center justify-between">
          <p className="font-body text-[10px] font-semibold text-gray500 uppercase tracking-widest">
            Chat del Grupo
          </p>
          <span className={`font-body text-[10px] font-semibold ${isSocketConnected ? 'text-greenAccent' : 'text-gray500'}`}>
            {isSocketConnected ? 'En tiempo real' : 'Reconectando'}
          </span>
        </div>

        <div className="bg-surface border border-purpleMedium/20 rounded-2xl p-4 flex flex-col gap-3 flex-1 min-h-0">
          <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto scrollbar-hide">
            {isChatLoading && (
              <p className="font-body text-[12px] text-gray500">Cargando mensajes...</p>
            )}

            {!isChatLoading && chatMessages.length === 0 && (
              <p className="font-body text-[12px] text-gray500">
                Aún no hay mensajes. Sé el primero en escribir al grupo.
              </p>
            )}

            {chatMessages.map((message) => {
              const isOwn = currentUserIdStr ? String(message.userId) === currentUserIdStr : message.id.startsWith('local-')
              const author = message.authorName || 'Usuario'

              return (
                <div key={message.id} className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  {!isOwn && (
                    <div
                      className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-white font-body font-bold text-[10px] mt-4"
                      style={{ backgroundColor: getParticipantColor(author, participants) }}
                    >
                      {author[0] ?? '?'}
                    </div>
                  )}
                  <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[80%]`}>
                    {!isOwn && (
                      <span className="font-body text-[10px] text-gray500 mb-0.5 ml-1">
                        {author}
                      </span>
                    )}
                    <div
                      className={[
                        'font-body text-[13px] px-3 py-2 leading-relaxed',
                        isOwn
                          ? 'text-white rounded-2xl rounded-tr-sm shadow-md'
                          : 'bg-white text-gray700 border border-[#E2E8F0] rounded-2xl rounded-tl-sm shadow-sm',
                      ].join(' ')}
                      style={isOwn ? { background: 'linear-gradient(135deg, #1E6FD9, #7A4FD6)' } : {}}
                    >
                      {message.contenido}
                      <p
                        className={`text-[9px] mt-1 text-right leading-none ${
                          isOwn ? 'text-white/50' : 'text-gray500/60'
                        }`}
                      >
                        {formatChatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {chatError && (
            <p className="font-body text-[11px] text-red-500">{chatError}</p>
          )}

          <div className="border-t border-purpleMedium/10" />

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') handleSend() }}
              placeholder="Escribe un mensaje..."
              disabled={!groupId || !accessToken}
              className="flex-1 bg-white border border-[#E2E8F0] focus:border-bluePrimary rounded-xl px-3 h-9 font-body text-[12px] text-gray700 placeholder-gray500 outline-none shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              onClick={handleSend}
              disabled={!chatInput.trim() || !groupId || !accessToken}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 hover:opacity-90 transition-opacity shadow-md p-2 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #1E6FD9, #7A4FD6)' }}
              aria-label="Enviar mensaje"
            >
              <IconSend />
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
