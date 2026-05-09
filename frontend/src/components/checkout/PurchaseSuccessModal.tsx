import type { SimulatedCheckoutResult } from '../../services/checkout'

export function PurchaseSuccessModal({
  result,
  mode,
  onClose,
}: {
  result: SimulatedCheckoutResult
  mode: 'vuelo' | 'hospedaje'
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E0A4E]/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#35C56A]/10 text-[#35C56A]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="mt-4 text-center font-heading text-2xl font-bold text-[#1E0A4E]">
          {mode === 'vuelo' ? 'Compra lista' : 'Reserva lista'}
        </h2>
        <p className="mt-2 text-center font-body text-sm text-[#64748B]">
          Se generó el PDF y se guardó automáticamente en la bóveda del viaje.
        </p>
        <div className="mt-5 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <p className="font-body text-xs uppercase tracking-[0.18em] text-[#94A3B8]">Folio</p>
          <p className="mt-1 font-mono text-lg font-bold text-[#1E0A4E]">{result.folio}</p>
          {result.document?.file_url && (
            <a
              href={result.document.file_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex rounded-xl bg-[#1E6FD9] px-4 py-2 font-body text-xs font-bold text-white"
            >
              Abrir PDF
            </a>
          )}
        </div>
        <button
          onClick={onClose}
          className="mt-5 w-full rounded-2xl border border-[#E2E8F0] px-4 py-3 font-body text-sm font-bold text-[#1E0A4E] hover:bg-[#F8FAFC]"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
