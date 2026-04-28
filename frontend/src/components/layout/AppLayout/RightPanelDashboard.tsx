import { useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Participant {
  id: string
  name: string
  role: 'Organizador' | 'Miembro'
  color: string
  isOnline: boolean
}

interface ChatMessage {
  id: string
  text: string
  isOwn: boolean
  author?: string
  timestamp: string
}

interface MemberFromBackend {
  id: string
  nombre?: string
  email?: string
  rol: 'admin' | 'viajero' | string
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const PARTICIPANTS: Participant[] = [
  { id: '1', name: 'Bryan A.',    role: 'Organizador', color: '#1E6FD9', isOnline: true  },
  { id: '2', name: 'Ana L.',      role: 'Miembro',     color: '#35C56A', isOnline: true  },
  { id: '3', name: 'Luis R.',     role: 'Miembro',     color: '#7A4FD6', isOnline: true  },
  { id: '4', name: 'Mariana G.', role: 'Miembro',     color: '#F59E0B', isOnline: false },
]

const INITIAL_MESSAGES: ChatMessage[] = [
  { id: '1', text: 'El hotel confirmó check-in a las 2 pm', isOwn: false, author: 'Ana L.',   timestamp: '10:42 am' },
  { id: '2', text: 'Perfecto, ya agregué el traslado',       isOwn: true,  author: 'Bryan A.', timestamp: '10:44 am' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function getParticipantColor(authorName: string | undefined, participants: Participant[]): string {
  const found = participants.find((p) => p.name === authorName)
  return found?.color ?? '#7A4FD6'
}

function IconMapPin({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/>
      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
    </svg>
  )
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

export function RightPanelDashboard({ members = [] }: { members?: MemberFromBackend[] }) {

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES)
  const [chatInput, setChatInput] = useState('')

  const participants: Participant[] =
    members.length > 0
      ? members.map((member, index) => {
          const name = member.nombre || member.email || 'Usuario'
          const colors = ['#1E6FD9', '#35C56A', '#7A4FD6', '#F59E0B']

          return {
            id: member.id,
            name,
            role: member.rol === 'admin' ? 'Organizador' : 'Miembro',
            color: colors[index % colors.length],
            isOnline: true,
          }
        })
      : PARTICIPANTS

  const onlineCount = participants.filter((p) => p.isOnline).length

  function handleSend() {
    const text = chatInput.trim()
    if (!text) return
    const now       = new Date()
    const timestamp = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })
    setChatMessages((prev) => [
      ...prev,
      { id: String(Date.now()), text, isOwn: true, author: 'Bryan A.', timestamp },
    ])
    setChatInput('')
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

        {/* Overlapping avatars */}
        <div className="flex -space-x-2 mb-3">
          {participants.map((p) => (
            <div
              key={p.id}
              className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white font-body font-bold text-xs shrink-0"
              style={{ backgroundColor: p.color }}
              title={p.name}
            >
              {p.name[0]}
            </div>
          ))}
        </div>

        {/* Participant list */}
        <ul className="flex flex-col gap-2.5">
          {participants.map((p) => (
            <li key={p.id} className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-body font-bold text-xs shrink-0"
                style={{ backgroundColor: p.color }}
              >
                {p.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body text-xs font-semibold text-gray700 truncate leading-none">
                  {p.name}
                </p>
                <p className="font-body text-[11px] mt-0.5 leading-none" style={{ color: p.color }}>
                  {p.role}
                </p>
              </div>
              {p.isOnline && (
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
        <div className="relative rounded-xl h-28 overflow-hidden mb-2 bg-[#D4E9F7]">
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, #B8D9F0 0%, #7EC8E3 40%, #4AA8D8 70%, #2A7DB5 100%)',
            }}
          />
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center drop-shadow-lg">
              <div className="w-8 h-8 rounded-full bg-bluePrimary flex items-center justify-center shadow-lg text-white">
                <IconMapPin size={14} />
              </div>
              <div className="w-0.5 h-3 bg-bluePrimary" />
            </div>
          </div>
        </div>
        <p className="font-body text-xs font-bold text-purpleNavbar leading-none">Cancún, Q.R.</p>
        <p className="font-body text-[11px] text-gray500 mt-0.5 leading-none">Riviera Maya · México</p>
        <button className="font-body text-[11px] text-bluePrimary mt-1.5 hover:underline">
          Ver en mapa completo →
        </button>
      </section>

      {/* Group chat */}
      <section className="flex flex-col gap-2 flex-1 min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="font-body text-[10px] font-semibold text-gray500 uppercase tracking-widest">
            Chat del Grupo
          </p>
          <div className="flex -space-x-1">
            {participants.filter((p) => p.isOnline).map((p) => (
              <div
                key={p.id}
                className="w-5 h-5 rounded-full border border-[#FAF9FD] flex items-center justify-center text-white font-body font-bold text-[9px] shrink-0"
                style={{ backgroundColor: p.color }}
                title={p.name}
              >
                {p.name[0]}
              </div>
            ))}
          </div>
        </div>

        {/* Chat card */}
        <div className="bg-surface border border-purpleMedium/20 rounded-2xl p-4 flex flex-col gap-3 flex-1 min-h-0">
          {/* Messages */}
          <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto scrollbar-hide">
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
                {!msg.isOwn && (
                  <div
                    className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-white font-body font-bold text-[10px] mt-4"
                    style={{ backgroundColor: getParticipantColor(msg.author, participants) }}
                  >
                    {msg.author?.[0] ?? '?'}
                  </div>
                )}
                <div className={`flex flex-col ${msg.isOwn ? 'items-end' : 'items-start'} max-w-[80%]`}>
                  {!msg.isOwn && msg.author && (
                    <span className="font-body text-[10px] text-gray500 mb-0.5 ml-1">
                      {msg.author}
                    </span>
                  )}
                  <div
                    className={[
                      'font-body text-[13px] px-3 py-2 leading-relaxed',
                      msg.isOwn
                        ? 'text-white rounded-2xl rounded-tr-sm shadow-md'
                        : 'bg-white text-gray700 border border-[#E2E8F0] rounded-2xl rounded-tl-sm shadow-sm',
                    ].join(' ')}
                    style={msg.isOwn ? { background: 'linear-gradient(135deg, #1E6FD9, #7A4FD6)' } : {}}
                  >
                    {msg.text}
                    <p
                      className={`text-[9px] mt-1 text-right leading-none ${
                        msg.isOwn ? 'text-white/50' : 'text-gray500/60'
                      }`}
                    >
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-purpleMedium/10" />

          {/* Input row */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
              placeholder="Escribe un mensaje..."
              className="flex-1 bg-white border border-[#E2E8F0] focus:border-bluePrimary rounded-xl px-3 h-9 font-body text-[12px] text-gray700 placeholder-gray500 outline-none shadow-sm transition-colors"
            />
            <button
              onClick={handleSend}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 hover:opacity-90 transition-opacity shadow-md p-2"
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
