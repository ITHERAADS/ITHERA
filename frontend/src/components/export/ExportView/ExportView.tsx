import { useState } from 'react'
import { useToast } from '../../ui/Toast/Toast'
import { ErrorModal } from '../../ui/ErrorModal/ErrorModal'
import { InlineBanner } from '../../ui/InlineBanner/InlineBanner'
import { ERROR_CODES } from '../../../constants/errorCodes'

type ExportFormat = 'pdf' | 'excel' | 'html'
type ExportSection = 'itinerario' | 'presupuesto' | 'miembros' | 'notas'
type TripEstado = 'planificacion' | 'activo' | 'finalizado' | 'cerrado'

interface MockTrip {
  nombre: string
  destino: string
  estado: TripEstado
}

const MOCK_TRIP: MockTrip = {
  nombre: 'Viaje a Cancún 2025',
  destino: 'Cancún, México',
  estado: 'finalizado',
}

const FORMAT_OPTIONS: { value: ExportFormat; label: string; description: string }[] = [
  { value: 'pdf',   label: 'PDF',       description: 'Documento listo para imprimir o compartir' },
  { value: 'excel', label: 'Excel / CSV', description: 'Hoja de cálculo para presupuestos y datos' },
  { value: 'html',  label: 'HTML',      description: 'Página web para ver en el navegador' },
]

const SECTION_OPTIONS: { value: ExportSection; label: string }[] = [
  { value: 'itinerario',  label: 'Itinerario' },
  { value: 'presupuesto', label: 'Presupuesto' },
  { value: 'miembros',    label: 'Miembros' },
  { value: 'notas',       label: 'Notas' },
]

function ProgressBar() {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
      <div className="animate-pulse h-full w-2/3 rounded-full bg-[#1E6FD9]" />
    </div>
  )
}

export interface ExportViewProps {
  groupId?: string
}

export function ExportView({ groupId }: ExportViewProps) {
  const { showToast, ToastContainer } = useToast()

  const [trip]                            = useState<MockTrip>(MOCK_TRIP)
  const [format, setFormat]               = useState<ExportFormat>('pdf')
  const [sections, setSections]           = useState<Set<ExportSection>>(
    new Set(['itinerario', 'presupuesto', 'miembros', 'notas'])
  )
  const [isGenerating, setIsGenerating]   = useState(false)
  const [isCopying, setIsCopying]         = useState(false)
  const [copied, setCopied]               = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [loadBannerDismissed, setLoadBannerDismissed] = useState(false)
  const [genBannerDismissed, setGenBannerDismissed]   = useState(false)

  const canExport = trip.estado === 'finalizado' || trip.estado === 'cerrado'

  function toggleSection(s: ExportSection) {
    setSections(prev => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }

  async function handleExport() {
    if (!canExport || sections.size === 0) return
    setIsGenerating(true)
    try {
      await new Promise<void>(res => setTimeout(res, 2000))
      showToast(`Exportación en ${format.toUpperCase()} generada correctamente.`, 'low')
    } catch {
      setShowErrorModal(true)
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleCopyLink() {
    if (!canExport) return
    setIsCopying(true)
    try {
      await new Promise<void>(res => setTimeout(res, 1200))
      const mockLink = `https://ithera.app/shared/${groupId ?? 'demo'}/export`
      await navigator.clipboard.writeText(mockLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast('No se pudo copiar el enlace.', 'medium')
    } finally {
      setIsCopying(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-[#1E0A4E]">Exportar viaje</h1>
        <p className="mt-1 font-body text-sm text-[#7A8799]">
          {trip.nombre} · {trip.destino}
        </p>
      </div>

      {/* ERR-75-001: trip not in exportable state */}
      {!canExport && (
        <InlineBanner message={ERROR_CODES['ERR-75-001'].message} />
      )}

      {/* ERR-74-001: load error (dismissible) */}
      {!loadBannerDismissed && false && (
        <InlineBanner
          message={ERROR_CODES['ERR-74-001'].message}
          onDismiss={() => setLoadBannerDismissed(true)}
        />
      )}

      {/* ERR-74-002: generation error (dismissible) */}
      {!genBannerDismissed && false && (
        <InlineBanner
          message={ERROR_CODES['ERR-74-002'].message}
          onDismiss={() => setGenBannerDismissed(true)}
        />
      )}

      {/* Format selector */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 space-y-4">
        <h2 className="font-heading text-base font-bold text-[#1E0A4E]">Formato de exportación</h2>
        <div className="space-y-2">
          {FORMAT_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={[
                'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                format === opt.value
                  ? 'border-[#1E6FD9] bg-[#EBF3FF]'
                  : 'border-[#E2E8F0] hover:bg-[#F4F6F8]',
              ].join(' ')}
            >
              <input
                type="radio"
                name="format"
                value={opt.value}
                checked={format === opt.value}
                onChange={() => setFormat(opt.value)}
                className="mt-0.5 accent-[#1E6FD9]"
              />
              <div>
                <p className="font-heading text-sm font-bold text-[#3D4A5C]">{opt.label}</p>
                <p className="font-body text-xs text-[#7A8799]">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Sections selector */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 space-y-4">
        <h2 className="font-heading text-base font-bold text-[#1E0A4E]">Secciones a incluir</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SECTION_OPTIONS.map(opt => {
            const checked = sections.has(opt.value)
            return (
              <label
                key={opt.value}
                className={[
                  'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors',
                  checked
                    ? 'border-[#1E6FD9] bg-[#EBF3FF] text-[#1E6FD9]'
                    : 'border-[#E2E8F0] text-[#3D4A5C] hover:bg-[#F4F6F8]',
                ].join(' ')}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleSection(opt.value)}
                  className="accent-[#1E6FD9]"
                />
                <span className="font-body text-sm">{opt.label}</span>
              </label>
            )
          })}
        </div>
        {sections.size === 0 && (
          <p className="font-body text-xs text-[#EF4444]">
            Selecciona al menos una sección para exportar.
          </p>
        )}
      </div>

      {/* Progress bar */}
      {isGenerating && (
        <div className="space-y-2">
          <p className="font-body text-sm text-[#7A8799]">Generando archivo…</p>
          <ProgressBar />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={handleExport}
          disabled={!canExport || isGenerating || sections.size === 0}
          className={[
            'flex-1 rounded-lg px-5 py-3 font-heading text-sm font-bold text-white transition-colors',
            canExport && !isGenerating && sections.size > 0
              ? 'bg-[#1E6FD9] hover:bg-[#2C8BE6]'
              : 'cursor-not-allowed bg-[#1E6FD9]/40',
          ].join(' ')}
        >
          {isGenerating ? 'Generando…' : `Exportar como ${format.toUpperCase()}`}
        </button>

        <button
          onClick={handleCopyLink}
          disabled={!canExport || isCopying}
          className={[
            'flex-1 rounded-lg border px-5 py-3 font-heading text-sm font-bold transition-colors',
            canExport && !isCopying
              ? 'border-[#1E6FD9] text-[#1E6FD9] hover:bg-[#EBF3FF]'
              : 'cursor-not-allowed border-[#E2E8F0] text-[#7A8799]',
          ].join(' ')}
        >
          {isCopying ? 'Generando…' : copied ? 'Copiado ✓' : 'Copiar enlace para compartir'}
        </button>
      </div>

      {/* ERR-75-002 critical error modal */}
      <ErrorModal
        isOpen={showErrorModal}
        title="Error al exportar"
        message={ERROR_CODES['ERR-75-002'].message}
        errorCode="ERR-75-002"
        onRetry={() => { setShowErrorModal(false); void handleExport() }}
        onClose={() => setShowErrorModal(false)}
      />

      {ToastContainer()}
    </div>
  )
}
