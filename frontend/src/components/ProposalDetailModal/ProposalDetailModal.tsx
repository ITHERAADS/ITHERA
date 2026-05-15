import { useState, useEffect } from 'react'
import type { Socket } from 'socket.io-client'
import type { Activity as DayActivity } from '../ui/DayView'
import { proposalsService, type ProposalComment } from '../../services/proposals'
import { useAuth } from '../../context/useAuth'

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconX() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconMapPin() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function IconTag() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="7" y1="7" x2="7.01" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconThumbUp() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconThumbDown() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return `hace ${Math.floor(diff / 86400)} días`
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonComment() {
  return (
    <div className="flex gap-3 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="h-3 w-24 rounded bg-gray-200" />
        <div className="h-3 w-full rounded bg-gray-200" />
        <div className="h-3 w-2/3 rounded bg-gray-200" />
      </div>
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProposalDetailModalProps {
  proposal: DayActivity
  tripId: string
  onClose: () => void
  onAccept: () => void
  socket?: Socket | null
}


type RealtimeCommentRaw = {
  id?: string | number
  id_comentario?: string | number
  proposalId?: string | number
  id_propuesta?: string | number
  usuarioId?: string | number
  id_usuario?: string | number
  authorName?: string | null
  nombre?: string | null
  contenido?: string | null
  createdAt?: string
  created_at?: string
  updatedAt?: string
  updated_at?: string
}

type ProposalCommentSocketPayload = {
  proposalId?: string | number
  entidadId?: string | number
  commentId?: string | number
  comment?: RealtimeCommentRaw
}

function asRealtimeCommentRaw(value: unknown): RealtimeCommentRaw | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as RealtimeCommentRaw
    : null
}

function normalizeRealtimeComment(raw: unknown): ProposalComment | null {
  const record = asRealtimeCommentRaw(raw)
  if (!record) return null
  return {
    id: String(record.id ?? record.id_comentario ?? ''),
    proposalId: String(record.proposalId ?? record.id_propuesta ?? ''),
    usuarioId: String(record.usuarioId ?? record.id_usuario ?? ''),
    authorName: record.authorName ?? record.nombre ?? null,
    contenido: String(record.contenido ?? ''),
    createdAt: String(record.createdAt ?? record.created_at ?? new Date().toISOString()),
    updatedAt: String(record.updatedAt ?? record.updated_at ?? new Date().toISOString()),
  }
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ProposalDetailModal({ proposal, tripId, onClose, onAccept, socket }: ProposalDetailModalProps) {
  const { accessToken } = useAuth()
  const isConfirmed = proposal.status === 'confirmada'

  const [comments, setComments] = useState<ProposalComment[]>([])
  const [draft, setDraft]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [sending, setSending]   = useState(false)
  const [voting, setVoting]     = useState(false)
  const [voteError, setVoteError] = useState('')
  const [voteSuccess, setVoteSuccess] = useState('')

  // Cargar comentarios al abrir
  useEffect(() => {
    if (!proposal.proposalId || !accessToken) return
    setLoading(true)
    proposalsService
      .getComments(tripId, proposal.proposalId, accessToken)
      .then((res) => setComments(res.comments ?? []))
      .catch(() => setComments([]))
      .finally(() => setLoading(false))
  }, [proposal.proposalId, tripId, accessToken])



  useEffect(() => {
    if (!socket || !proposal.proposalId) return

    const currentProposalId = String(proposal.proposalId)
    const belongsToThisProposal = (payload: ProposalCommentSocketPayload) => String(payload.proposalId ?? payload.entidadId ?? '') === currentProposalId

    const handleCreated = (payload: ProposalCommentSocketPayload) => {
      if (!belongsToThisProposal(payload)) return
      const comment = normalizeRealtimeComment(payload.comment)
      if (!comment?.id) return
      setComments((prev) => prev.some((item) => item.id === comment.id) ? prev : [...prev, comment])
    }

    const handleUpdated = (payload: ProposalCommentSocketPayload) => {
      if (!belongsToThisProposal(payload)) return
      const comment = normalizeRealtimeComment(payload.comment)
      if (!comment?.id) return
      setComments((prev) => prev.map((item) => item.id === comment.id ? comment : item))
    }

    const handleDeleted = (payload: ProposalCommentSocketPayload) => {
      if (!belongsToThisProposal(payload)) return
      const commentId = String(payload.commentId ?? '')
      if (!commentId) return
      setComments((prev) => prev.filter((item) => item.id !== commentId))
    }

    socket.on('proposal_comment_created', handleCreated)
    socket.on('proposal_comment_updated', handleUpdated)
    socket.on('proposal_comment_deleted', handleDeleted)

    return () => {
      socket.off('proposal_comment_created', handleCreated)
      socket.off('proposal_comment_updated', handleUpdated)
      socket.off('proposal_comment_deleted', handleDeleted)
    }
  }, [socket, proposal.proposalId])

  const heroImage =
    proposal.image ||
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&h=500&fit=crop'

  const chips = [
    proposal.time     && { icon: <IconClock />,   label: proposal.time },
    proposal.location && { icon: <IconMapPin />,  label: proposal.location },
    proposal.category && { icon: <IconTag />,     label: proposal.category },
    proposal.votes !== undefined && { icon: <IconThumbUp />, label: `${proposal.votes} votos` },
  ].filter(Boolean) as { icon: React.ReactNode; label: string }[]

  async function handleSendComment() {
    const text = draft.trim()
    if (!text || !proposal.proposalId || !accessToken) return
    try {
      setSending(true)
      const res = await proposalsService.addComment(tripId, proposal.proposalId, { contenido: text }, accessToken)
      setComments((prev) => prev.some((item) => item.id === res.comment.id) ? prev : [...prev, res.comment])
      setDraft('')
    } finally {
      setSending(false)
    }
  }

  async function handleVote(voto: 'a_favor' | 'en_contra') {
    if (!proposal.proposalId || !accessToken) return
    try {
      setVoting(true)
      setVoteError('')
      setVoteSuccess('')
      await proposalsService.voteProposal(tripId, proposal.proposalId, { voto }, accessToken)
      setVoteSuccess(voto === 'a_favor' ? '¡Votaste a favor!' : 'Votaste en contra.')
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setVoteError(
        msg.toLowerCase().includes('ya emitiste')
          ? 'Ya votaste en esta propuesta.'
          : 'Error al votar, intenta de nuevo.'
      )
    } finally {
      setVoting(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSendComment()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* ── Hero image ── */}
        <div className="relative h-52 shrink-0 overflow-hidden">
          <img src={heroImage} alt={proposal.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Badge estado */}
          <div className="absolute top-4 left-4">
            <span
              className="rounded-full px-3 py-1 font-body text-[11px] font-bold text-white uppercase tracking-wide"
              style={{ backgroundColor: isConfirmed ? '#35C56A' : '#7A4FD6' }}
            >
              {isConfirmed ? 'Confirmado' : 'Por confirmar'}
            </span>
          </div>

          {/* Botón cerrar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
            aria-label="Cerrar"
          >
            <IconX />
          </button>

          {/* Título sobre imagen */}
          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="font-heading font-bold text-white text-xl leading-tight drop-shadow">
              {proposal.title}
            </h2>
          </div>
        </div>

        {/* ── Contenido scrollable ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

          {/* Precio */}
          {proposal.price !== undefined && (
            <p className="font-heading font-bold text-2xl text-[#1E0A4E]">
              ${proposal.price.toLocaleString('es-MX')}{' '}
              <span className="font-body text-sm font-normal text-[#1E0A4E]/50">
                {proposal.currency || 'MXN'}
              </span>
            </p>
          )}

          {/* Descripción */}
          {proposal.description && (
            <p className="font-body text-sm text-[#1E0A4E]/70 leading-relaxed">
              {proposal.description}
            </p>
          )}

          {/* Chips */}
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {chips.map((chip, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#F0F4FF] px-3 py-1 font-body text-xs text-[#1E0A4E]/70"
                >
                  {chip.icon}
                  {chip.label}
                </span>
              ))}
            </div>
          )}

          {/* Propuesto por */}
          {proposal.proposedBy && (
            <p className="font-body text-xs text-[#1E0A4E]/50 italic">
              Propuesto por{' '}
              <span className="font-semibold not-italic text-[#1E0A4E]/70">{proposal.proposedBy}</span>
            </p>
          )}

          {/* Botones de voto */}
          {!isConfirmed && (
            <div className="flex gap-2">
              <button
                onClick={() => void handleVote('a_favor')}
                disabled={voting}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#35C56A] text-[#35C56A] py-2 font-body text-xs font-semibold hover:bg-[#35C56A]/10 transition-colors disabled:opacity-50"
              >
                <IconThumbUp />
                A favor
              </button>
              <button
                onClick={() => void handleVote('en_contra')}
                disabled={voting}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#EF4444] text-[#EF4444] py-2 font-body text-xs font-semibold hover:bg-[#EF4444]/10 transition-colors disabled:opacity-50"
              >
                <IconThumbDown />
                En contra
              </button>
            </div>
          )}

          {voteError && (
            <p className="font-body text-xs text-[#EF4444] bg-[#FEF2F2] border border-[#EF4444]/20 rounded-xl px-3 py-2">
              {voteError}
            </p>
          )}
          {voteSuccess && (
            <p className="font-body text-xs text-[#35C56A] bg-[#35C56A]/10 border border-[#35C56A]/20 rounded-xl px-3 py-2">
              {voteSuccess}
            </p>
          )}

          {/* Divider */}
          <div className="border-t border-[#E2E8F0]" />

          {/* ── Hilo de comentarios ── */}
          <div className="flex flex-col gap-3">
            <h3 className="font-heading font-bold text-[#1E0A4E] text-sm">Comentarios</h3>

            {loading ? (
              <div className="flex flex-col gap-3">
                <SkeletonComment />
                <SkeletonComment />
              </div>
            ) : comments.length === 0 ? (
              <p className="font-body text-xs text-[#1E0A4E]/40 text-center py-4">
                Sé el primero en opinar sobre esta opción
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-body text-xs font-bold shrink-0"
                      style={{ backgroundColor: '#1E6FD9' }}
                    >
                      {getInitials(comment.authorName || `U${comment.usuarioId}`)}
                    </div>
                    <div className="flex-1 bg-[#F8FAFC] rounded-xl px-3 py-2">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="font-body text-xs font-semibold text-[#1E0A4E]">
                          {comment.authorName || `Usuario ${comment.usuarioId}`}
                        </p>
                        <p className="font-body text-[10px] text-[#1E0A4E]/40">{timeAgo(comment.createdAt)}</p>
                      </div>
                      <p className="font-body text-xs text-[#1E0A4E]/70">{comment.contenido}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-1">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe un comentario..."
                rows={2}
                className="flex-1 resize-none rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 font-body text-xs text-[#1E0A4E] placeholder-gray-400 outline-none transition focus:border-[#1E6FD9] focus:ring-2 focus:ring-[#1E6FD9]/20"
              />
              <button
                onClick={() => void handleSendComment()}
                disabled={!draft.trim() || sending}
                className="self-end rounded-xl bg-[#1E6FD9] text-white font-body text-xs font-semibold px-3 py-2 hover:bg-[#1a5fc2] transition-colors disabled:opacity-40"
              >
                {sending ? '...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Botón aceptar ── */}
        <div className="px-5 py-4 border-t border-[#E2E8F0] bg-white shrink-0">
          <button
            onClick={onAccept}
            disabled={isConfirmed}
            className={[
              'w-full flex items-center justify-center gap-2 rounded-xl py-3 font-body text-sm font-semibold transition-colors',
              isConfirmed
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-[#1E6FD9] text-white hover:bg-[#1a5fc2]',
            ].join(' ')}
          >
            <IconCheck />
            {isConfirmed ? 'Propuesta confirmada' : 'Aceptar propuesta'}
          </button>
        </div>
      </div>
    </div>
  )
}
