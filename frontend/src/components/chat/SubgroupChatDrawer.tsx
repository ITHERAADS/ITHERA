import { useCallback, useEffect, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { subgroupChatService, type SubgroupChatMessage } from '../../services/subgroup-chat'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Participant {
  id: string
  name: string
  color: string
  avatarUrl?: string | null
}

interface SubgroupChatAck {
  ok: boolean
  message?: SubgroupChatMessage
  error?: string
}

export interface SubgroupChatDrawerProps {
  open: boolean
  onClose: () => void
  groupId: string | null
  slotId: string | number | null
  subgroupId: string | number | null
  subgroupName: string
  socket: Socket | null
  isSocketConnected: boolean
  accessToken: string | null
  currentUserId: string | null
  currentUserName: string
  participants: Participant[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function getDateKey(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toDateString()
}

function formatDateLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Hoy'
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer'
  return date.toLocaleDateString('es-MX', { weekday: 'long', month: 'long', day: 'numeric' })
}

function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconSend() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" stroke="currentColor" strokeWidth="2" fill="currentColor" />
    </svg>
  )
}

function IconChatEmpty() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Avatar({
  name,
  color,
  avatarUrl,
  size = 'md',
}: {
  name: string
  color: string
  avatarUrl?: string | null
  size?: 'sm' | 'md'
}) {
  const cls = size === 'sm' ? 'w-6 h-6 text-[9px]' : 'w-8 h-8 text-xs'
  return (
    <div
      className={`${cls} overflow-hidden rounded-full flex items-center justify-center text-white font-body font-bold shrink-0`}
      style={{ backgroundColor: color }}
      title={name}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        (name[0] ?? '?').toUpperCase()
      )}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SubgroupChatDrawer({
  open,
  onClose,
  groupId,
  slotId,
  subgroupId,
  subgroupName,
  socket,
  isSocketConnected,
  accessToken,
  currentUserId,
  currentUserName,
  participants,
}: SubgroupChatDrawerProps) {
  const [messages, setMessages] = useState<SubgroupChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatError, setChatError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const subgroupIdStr = subgroupId != null ? String(subgroupId) : null
  const isLoading = false

  const subgroupInitials = subgroupName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  // Load messages when subgroup changes
  useEffect(() => {
    if (!groupId || !slotId || !subgroupIdStr || !accessToken) return

    let isMounted = true
    void subgroupChatService
      .getMessages(groupId, slotId, subgroupIdStr, accessToken, 50)
      .then((res) => {
        if (isMounted) {
          setMessages(res.messages)
          setChatError(null)
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setMessages([])
          setChatError(err instanceof Error ? err.message : 'No se pudo cargar el chat')
        }
      })
    return () => { isMounted = false }
  }, [groupId, slotId, subgroupIdStr, accessToken])

  // Socket: join subgroup room + chat listeners
  useEffect(() => {
    if (!socket || !subgroupIdStr) return

    socket.emit('join_subgroup_room', { subgroupId: subgroupIdStr })

    const handleMessage = (msg: SubgroupChatMessage & { clientId?: string | null }) => {
      if (String(msg.subgroupId) !== subgroupIdStr) return
      setMessages((prev) => {
        const base = msg.clientId ? prev.filter((m) => m.id !== msg.clientId) : prev
        return base.some((m) => m.id === msg.id) ? base : [...base, msg]
      })
    }

    const handleError = (payload: { message?: string }) => {
      setChatError(payload.message ?? 'Error de conexión del chat')
    }

    socket.on('subgroup_chat_message', handleMessage)
    socket.on('error_event', handleError)

    return () => {
      socket.emit('leave_subgroup_room', { subgroupId: subgroupIdStr })
      socket.off('subgroup_chat_message', handleMessage)
      socket.off('error_event', handleError)
    }
  }, [socket, subgroupIdStr])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  // Focus textarea when drawer opens
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => textareaRef.current?.focus(), 300)
    return () => clearTimeout(t)
  }, [open])

  const handleSend = useCallback(() => {
    const text = chatInput.trim()
    if (!text || !groupId || !slotId || !subgroupIdStr || !accessToken) return

    setChatError(null)
    setChatInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const clientId = `local-${Date.now()}`
    const optimistic: SubgroupChatMessage = {
      id: clientId,
      subgroupId: subgroupIdStr,
      userId: currentUserId ?? 'me',
      authorName: currentUserName,
      authorEmail: null,
      authorAvatarUrl: null,
      contenido: text,
      createdAt: new Date().toISOString(),
      clientId,
    }
    setMessages((prev) => [...prev, optimistic])

    if (socket && isSocketConnected) {
      socket.timeout(7000).emit(
        'subgroup_chat_send_message',
        { subgroupId: subgroupIdStr, contenido: text, clientId },
        (err: Error | null, res?: SubgroupChatAck) => {
          if (err || !res?.ok) {
            setMessages((prev) => prev.filter((m) => m.id !== clientId))
            setChatError(res?.error ?? 'No se pudo enviar el mensaje')
          }
        }
      )
      return
    }

    void subgroupChatService.sendMessage(groupId, slotId, subgroupIdStr, text, accessToken).catch((err: unknown) => {
      setMessages((prev) => prev.filter((m) => m.id !== clientId))
      setChatError(err instanceof Error ? err.message : 'No se pudo enviar el mensaje')
    })
  }, [chatInput, groupId, slotId, subgroupIdStr, accessToken, currentUserId, currentUserName, socket, isSocketConnected])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setChatInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 96)}px`
  }

  const messagesWithSeparator = messages.map((msg, i) => ({
    msg,
    showSeparator: i === 0 || getDateKey(msg.createdAt) !== getDateKey(messages[i - 1].createdAt),
  }))

  return (
    <>
      {/* Backdrop */}
      <div
        className={[
          'fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Chat del subgrupo ${subgroupName}`}
        className={[
          'fixed right-0 top-0 z-50 flex h-full w-[420px] max-w-full flex-col shadow-2xl',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        style={{ background: '#FAF9FD' }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-4 shrink-0"
          style={{ background: 'linear-gradient(135deg, #0A3E1E, #35C56A)' }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-heading font-bold text-sm text-white shrink-0"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            {subgroupInitials}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-heading font-bold text-sm text-white leading-tight truncate">{subgroupName}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSocketConnected ? 'bg-[#A7F3D0]' : 'bg-white/40'}`}
              />
              <span className="font-body text-[11px] text-white/70">
                {isSocketConnected ? 'Chat de subgrupo' : 'Reconectando...'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
            aria-label="Cerrar chat"
          >
            <IconClose />
          </button>
        </div>

        {/* Participants bar */}
        {participants.length > 0 && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-[#E2E8F0] bg-white shrink-0">
            <div className="flex -space-x-1.5">
              {participants.slice(0, 6).map((p) => (
                <div key={p.id} className="relative" title={p.name}>
                  <Avatar name={p.name} color={p.color} avatarUrl={p.avatarUrl} size="sm" />
                </div>
              ))}
            </div>
            <span className="font-body text-[11px] text-gray-500">
              {participants.length} miembro{participants.length !== 1 ? 's' : ''} en el subgrupo
            </span>
          </div>
        )}

        {/* Message list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-0.5 min-h-0">
          {!isLoading && messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="text-[#35C56A]/30">
                <IconChatEmpty />
              </div>
              <p className="font-heading font-bold text-sm text-[#0A3E1E]">Sé el primero en escribir</p>
              <p className="font-body text-[12px] text-gray-500 max-w-[180px]">
                Coordina con tu subgrupo en tiempo real
              </p>
            </div>
          )}

          {messagesWithSeparator.map(({ msg: message, showSeparator }) => {
            const isOwn = currentUserId
              ? String(message.userId) === String(currentUserId)
              : message.id.startsWith('local-')
            const author = message.authorName || 'Usuario'
            const pColor = participants.find((p) => p.name === author)?.color ?? '#35C56A'
            const pAvatar = participants.find((p) => p.name === author)?.avatarUrl ?? null

            return (
              <div key={message.id}>
                {showSeparator && (
                  <div className="flex items-center gap-2 my-3">
                    <div className="flex-1 h-px bg-[#E2E8F0]" />
                    <span className="font-body text-[10px] text-gray-500 px-2 capitalize">
                      {formatDateLabel(message.createdAt)}
                    </span>
                    <div className="flex-1 h-px bg-[#E2E8F0]" />
                  </div>
                )}

                <div className={`flex gap-2 mb-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  {!isOwn && (
                    <Avatar
                      name={author}
                      color={pColor}
                      avatarUrl={message.authorAvatarUrl ?? pAvatar}
                      size="sm"
                    />
                  )}
                  <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%]`}>
                    {!isOwn && (
                      <span className="font-body text-[10px] text-gray-500 mb-0.5 ml-1">{author}</span>
                    )}
                    <div
                      className={[
                        'font-body text-[13px] px-3 py-2 leading-relaxed',
                        isOwn
                          ? 'text-white rounded-2xl rounded-tr-sm shadow-md'
                          : 'bg-white text-gray-700 border border-[#E2E8F0] rounded-2xl rounded-tl-sm shadow-sm',
                      ].join(' ')}
                      style={isOwn ? { background: 'linear-gradient(135deg, #0A8A3E, #35C56A)' } : {}}
                    >
                      {message.contenido}
                      <p
                        className={`text-[9px] mt-1 text-right leading-none ${
                          isOwn ? 'text-white/50' : 'text-gray-500/60'
                        }`}
                      >
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                  {isOwn && <div className="w-6 shrink-0" />}
                </div>
              </div>
            )
          })}

          <div ref={bottomRef} />
        </div>

        {/* Error */}
        {chatError && (
          <div className="px-4 py-2 bg-[#EF4444]/10 border-t border-[#EF4444]/20 shrink-0">
            <p className="font-body text-[11px] text-[#EF4444]">{chatError}</p>
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t border-[#E2E8F0] bg-white shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={chatInput}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje..."
              disabled={!subgroupIdStr || !accessToken}
              rows={1}
              className="flex-1 resize-none bg-[#ECFDF5] border border-transparent focus:border-[#35C56A] rounded-xl px-3 py-2 font-body text-[13px] text-gray-700 placeholder-gray-400 outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-60 leading-relaxed"
              style={{ minHeight: '38px', maxHeight: '96px', overflowY: 'auto' }}
            />
            <button
              onClick={handleSend}
              disabled={!chatInput.trim() || !subgroupIdStr || !accessToken}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 hover:opacity-90 transition-opacity shadow-md disabled:cursor-not-allowed disabled:opacity-50 mb-0.5"
              style={{ background: 'linear-gradient(135deg, #0A8A3E, #35C56A)' }}
              aria-label="Enviar mensaje"
            >
              <IconSend />
            </button>
          </div>
          <p className="font-body text-[10px] text-gray-400 mt-1">
            Enter para enviar · Shift+Enter nueva línea
          </p>
        </div>
      </div>
    </>
  )
}
