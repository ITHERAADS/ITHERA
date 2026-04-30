import { useState } from 'react'
import type { Activity as DayActivity } from '../ui/DayView'

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconLock() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconX() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconAlertTriangle() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ModalState = 'idle' | 'processing' | 'error'

export interface ConfirmProposalModalProps {
  proposal: DayActivity
  onClose: () => void
  onConfirm: () => void
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ConfirmProposalModal({ proposal, onClose, onConfirm }: ConfirmProposalModalProps) {
  const [state, setState] = useState<ModalState>('idle')

  async function handleConfirm() {
    setState('processing')
    try {
      // Simula un proceso asíncrono (aquí se conectaría al backend en el futuro)
      await new Promise((resolve) => setTimeout(resolve, 1200))
      onConfirm()
    } catch {
      setState('error')
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget && state !== 'processing') onClose() }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[#7A4FD6]/10 flex items-center justify-center text-[#7A4FD6]">
            <IconLock />
          </div>
          <h2 className="font-heading font-bold text-[#1E0A4E] text-lg">
            ¿Confirmar propuesta?
          </h2>
          <p className="font-body text-sm text-[#1E0A4E]/60 leading-relaxed">
            Esta acción es irreversible. Una vez aceptada, la propuesta quedará bloqueada y no podrá modificarse.
          </p>
        </div>

        {/* ── Resumen propuesta ── */}
        <div className="mx-5 mb-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 flex items-center justify-between gap-3">
          <p className="font-body text-sm font-semibold text-[#1E0A4E] leading-tight line-clamp-2">
            {proposal.title}
          </p>
          {proposal.price !== undefined && (
            <p className="font-heading font-bold text-[#1E6FD9] text-sm shrink-0">
              ${proposal.price.toLocaleString('es-MX')} MXN
            </p>
          )}
        </div>

        {/* ── Estado error ── */}
        {state === 'error' && (
          <div className="mx-5 mb-4 rounded-xl border border-[#EF4444]/20 bg-[#FEF2F2] px-4 py-3 flex items-start gap-2">
            <span className="text-[#EF4444] mt-0.5 shrink-0"><IconAlertTriangle /></span>
            <div className="flex-1">
              <p className="font-body text-xs font-semibold text-[#EF4444]">
                Alguien más aceptó esta propuesta primero
              </p>
              <p className="font-body text-xs text-[#EF4444]/70 mt-0.5">
                La propuesta ya fue bloqueada por otro integrante del grupo.
              </p>
            </div>
          </div>
        )}

        {/* ── Advertencia ── */}
        {state !== 'error' && (
          <div className="mx-5 mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2">
            <span className="text-amber-500 mt-0.5 shrink-0"><IconAlertTriangle /></span>
            <p className="font-body text-xs text-amber-700">
              El resto del grupo será notificado y no podrá hacer cambios en esta propuesta.
            </p>
          </div>
        )}

        {/* ── Botones ── */}
        <div className="px-5 pb-5 flex flex-col gap-2">
          {state === 'error' ? (
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] py-3 font-body text-sm font-semibold text-[#1E0A4E]/70 hover:bg-[#F8FAFC] transition-colors"
            >
              <IconX />
              Cerrar
            </button>
          ) : (
            <>
              <button
                onClick={() => void handleConfirm()}
                disabled={state === 'processing'}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1E6FD9] py-3 font-body text-sm font-semibold text-white hover:bg-[#1a5fc2] transition-colors disabled:opacity-60"
              >
                {state === 'processing' ? (
                  <>
                    <Spinner />
                    Confirmando...
                  </>
                ) : (
                  'Confirmar'
                )}
              </button>
              <button
                onClick={onClose}
                disabled={state === 'processing'}
                className="w-full rounded-xl border border-[#E2E8F0] py-3 font-body text-sm font-semibold text-[#1E0A4E]/70 hover:bg-[#F8FAFC] transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
