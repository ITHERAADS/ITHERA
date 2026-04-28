import type { Activity } from '../ui/DayView/DayView'

export interface ProposalCardProps {
  activity: Activity
  proposalStatus?: 'pendiente' | 'procesando' | 'bloqueada' | 'error'
  onAccept?: (id: string) => void
  onDelete?: (id: string) => void
  onEdit?: (id: string) => void
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconClock({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconMapPin({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function IconThumbsUp({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconTrash({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function IconEdit({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconCheck({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function IconLock({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconSpinner({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
      <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// ── Category icon (centered on image) ────────────────────────────────────────

function CategoryIcon({ category }: { category: Activity['category'] }) {
  if (category === 'transporte') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19.5 2.5 18 1 16 1 14.5 2.5L11 6 2.8 4.2l-2 2 3.5 3.5L2 14l2 2 4.5-2 3.5 3.5 3.5 3.5 2-2z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (category === 'hospedaje') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M2 9V5a1 1 0 011-1h18a1 1 0 011 1v4" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <rect x="2" y="9" width="20" height="9" rx="1" stroke="white" strokeWidth="2" />
        <line x1="2" y1="18" x2="2" y2="21" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <line x1="22" y1="18" x2="22" y2="21" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Badge config ──────────────────────────────────────────────────────────────

const BADGE: Record<NonNullable<ProposalCardProps['proposalStatus']>, { label: string; bg: string }> = {
  pendiente:  { label: 'POR CONFIRMAR', bg: 'bg-[#7A4FD6]' },
  bloqueada:  { label: 'CONFIRMADO',    bg: 'bg-[#35C56A]' },
  procesando: { label: 'PROCESANDO',    bg: 'bg-[#1E6FD9]' },
  error:      { label: 'ERROR',         bg: 'bg-[#EF4444]' },
}

// ── ProposalCard ──────────────────────────────────────────────────────────────

export function ProposalCard({ activity, proposalStatus = 'pendiente', onAccept, onDelete, onEdit }: ProposalCardProps) {
  const badge = BADGE[proposalStatus]
  const isProcessing = proposalStatus === 'procesando'
  const isBlocked    = proposalStatus === 'bloqueada'
  const isError      = proposalStatus === 'error'

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden w-full max-w-sm">

      {/* ── Image ── */}
      <div className="relative h-40 overflow-hidden">
        <img
          src={activity.image}
          alt={activity.title}
          className="w-full h-full object-cover rounded-t-2xl"
          loading="lazy"
        />

        {/* Status badge */}
        <span className={`absolute top-3 left-3 ${badge.bg} text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full font-body`}>
          {badge.label}
        </span>

        {/* Price badge */}
        <span className="absolute top-3 right-3 bg-[#1E0A4E]/70 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full font-body">
          ${activity.price.toLocaleString('es-MX')} {activity.currency}
        </span>

        {/* Category icon — centered on image */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/30 backdrop-blur-sm rounded-full p-2">
            <CategoryIcon category={activity.category} />
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 py-4">
        <h3 className="font-heading font-bold text-[#1E0A4E] text-base leading-tight">
          {activity.title}
        </h3>
        <p className="font-body text-sm text-[#6B7280] mt-1 line-clamp-2">
          {activity.description}
        </p>

        {/* Info chips */}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="bg-[#F0EEF8] text-[#1E0A4E] text-[11px] font-body px-2.5 py-1 rounded-full flex items-center gap-1">
            <IconClock />
            {activity.time}
          </span>
          {activity.location && (
            <span className="bg-[#F0EEF8] text-[#1E0A4E] text-[11px] font-body px-2.5 py-1 rounded-full flex items-center gap-1">
              <IconMapPin />
              {activity.location}
            </span>
          )}
          {activity.votes !== undefined && (
            <span className="bg-[#F0EEF8] text-[#1E0A4E] text-[11px] font-body px-2.5 py-1 rounded-full flex items-center gap-1">
              <IconThumbsUp />
              {activity.votes} votos
            </span>
          )}
        </div>

        {activity.proposedBy && (
          <p className="font-body text-xs text-[#6B7280] italic mt-2">
            Propuesto por {activity.proposedBy}
          </p>
        )}
      </div>

      {/* ── Actions ── */}
      <div className="px-4 pb-4 pt-3 border-t border-[#E2E8F0]">

        {/* Error banner */}
        {isError && (
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-3 mb-3">
            <p className="font-body text-xs text-[#EF4444]">
              Alguien más aceptó esta propuesta primero.
            </p>
          </div>
        )}

        <div className="flex items-center">
          {/* Accept button */}
          {isBlocked ? (
            <button
              disabled
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#E5E7EB] text-[#9CA3AF] font-body font-semibold text-sm rounded-xl py-2.5 cursor-not-allowed"
            >
              <IconCheck size={12} />
              Confirmada
            </button>
          ) : isProcessing ? (
            <button
              disabled
              className="flex-1 flex items-center justify-center bg-[#1E6FD9] text-white font-body font-semibold text-sm rounded-xl py-2.5 opacity-70 cursor-not-allowed"
            >
              <IconSpinner size={16} />
            </button>
          ) : isError ? (
            <button
              disabled
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#E5E7EB] text-[#9CA3AF] font-body font-semibold text-sm rounded-xl py-2.5 cursor-not-allowed"
            >
              No disponible
            </button>
          ) : (
            <button
              onClick={() => onAccept?.(activity.id)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#1E6FD9] text-white font-body font-semibold text-sm rounded-xl py-2.5 hover:bg-[#1a5fc2] transition-colors"
            >
              <IconCheck size={12} />
              Aceptar propuesta
            </button>
          )}

          {/* Lock icon (bloqueada) */}
          {isBlocked && (
            <span className="ml-2 shrink-0 text-[#35C56A]">
              <IconLock size={16} />
            </span>
          )}

          {/* Delete button — hidden when bloqueada */}
          {!isBlocked && (
            <button
              onClick={isProcessing || isError ? undefined : () => onDelete?.(activity.id)}
              disabled={isProcessing}
              className={[
                'w-9 h-9 flex items-center justify-center rounded-xl border border-[#E2E8F0] text-[#EF4444] hover:bg-red-50 transition-colors ml-2 shrink-0',
                isProcessing ? 'opacity-40 cursor-not-allowed' : '',
              ].join(' ')}
              aria-label="Eliminar propuesta"
            >
              <IconTrash size={15} />
            </button>
          )}
          {!isBlocked && (
            <button
              onClick={isProcessing || isError ? undefined : () => onEdit?.(activity.id)}
              disabled={isProcessing}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#E2E8F0] text-[#1E6FD9] hover:bg-blue-50 transition-colors ml-2 shrink-0"
              aria-label="Editar propuesta"
            >
              <IconEdit size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
