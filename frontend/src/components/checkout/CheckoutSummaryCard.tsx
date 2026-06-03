import type { Proposal, ProposalDetailFlight, ProposalDetailHotel } from '../../services/proposals'

function formatMoney(value: number | string | null | undefined, currency?: string | null) {
  const amount = Number(value ?? 0)
  const safeCurrency = currency ?? 'MXN'
  if (!Number.isFinite(amount)) return `$0 ${safeCurrency}`
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: safeCurrency }).format(amount)
}

function isFlightProposal(proposal: Proposal): proposal is Proposal & { detalle?: ProposalDetailFlight | null } {
  return proposal.tipo === 'vuelo' || proposal.tipo_item === 'vuelo'
}

function isHotelProposal(proposal: Proposal): proposal is Proposal & { detalle?: ProposalDetailHotel | null } {
  return proposal.tipo === 'hospedaje' || proposal.tipo_item === 'hospedaje'
}

function getFlightDetail(proposal: Proposal): ProposalDetailFlight {
  return isFlightProposal(proposal) && proposal.detalle ? proposal.detalle : {}
}

function getHotelDetail(proposal: Proposal): ProposalDetailHotel {
  return isHotelProposal(proposal) && proposal.detalle ? proposal.detalle : {}
}

function getAmount(proposal: Proposal) {
  if (isFlightProposal(proposal)) return getFlightDetail(proposal).precio ?? 0
  return getHotelDetail(proposal).precio_total ?? 0
}

function getCurrency(proposal: Proposal) {
  if (isFlightProposal(proposal)) return getFlightDetail(proposal).moneda ?? 'MXN'
  return getHotelDetail(proposal).moneda ?? 'MXN'
}

function textValue(value: string | number | null | undefined, fallback: string) {
  if (value === null || value === undefined || value === '') return fallback
  return String(value)
}

function routeValue(name?: string | null, code?: string | null) {
  const composed = `${name ?? ''} ${code ? `(${code})` : ''}`.trim()
  return composed || 'No especificado'
}

export function CheckoutSummaryCard({ proposal }: { proposal: Proposal }) {
  const isFlight = isFlightProposal(proposal)
  const flightDetail = getFlightDetail(proposal)
  const hotelDetail = getHotelDetail(proposal)

  return (
    <div className="flex flex-col gap-5 rounded-3xl border border-white/60 bg-white/90 p-6 shadow-xl shadow-[#1E0A4E]/10 backdrop-blur">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-body text-sm font-bold uppercase tracking-[0.18em] text-[#7A4FD6]">
            {isFlight ? 'Compra de vuelo' : 'Reserva de hospedaje'}
          </p>
          <h2 className="mt-1.5 font-heading text-2xl font-extrabold leading-snug text-[#1E0A4E]">
            {proposal.titulo}
          </h2>
          <p className="mt-1.5 font-body text-base text-[#64748B]">
            {proposal.descripcion || 'Propuesta aprobada por el grupo.'}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#35C56A]/12 px-3.5 py-1.5 font-body text-sm font-bold text-[#35C56A]">
          Ganadora
        </span>
      </div>

      {/* Info grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {isFlight ? (
          <>
            <Info label="Aerolínea" value={textValue(flightDetail.aerolinea, 'No especificada')} color="blue" />
            <Info label="Vuelo" value={textValue(flightDetail.numero_vuelo, 'No especificado')} color="purple" />
            <Info label="Origen" value={routeValue(flightDetail.origen_nombre, flightDetail.origen_codigo)} color="blue" />
            <Info label="Destino" value={routeValue(flightDetail.destino_nombre, flightDetail.destino_codigo)} color="purple" />
            <Info label="Salida" value={textValue(flightDetail.salida, 'No especificada')} color="green" />
            <Info label="Llegada" value={textValue(flightDetail.llegada, 'No especificada')} color="green" />
          </>
        ) : (
          <>
            <Info label="Hotel" value={textValue(hotelDetail.nombre, proposal.titulo)} color="blue" />
            <Info label="Dirección" value={textValue(hotelDetail.direccion, 'No especificada')} color="purple" />
            <Info label="Check-in" value={textValue(hotelDetail.check_in, 'No especificado')} color="green" />
            <Info label="Check-out" value={textValue(hotelDetail.check_out, 'No especificado')} color="green" />
            <Info label="Proveedor" value={textValue(hotelDetail.proveedor, 'ITHERA')} color="blue" />
            <Info label="Calificación" value={textValue(hotelDetail.calificacion, 'No especificada')} color="amber" />
          </>
        )}
      </div>

      {/* Total */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1251A3] via-[#1E6FD9] to-[#7A4FD6] p-5 text-white">
        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-8 left-4 h-24 w-24 rounded-full bg-white/[0.07] blur-xl" />
        <div className="relative">
          <p className="font-body text-sm font-bold uppercase tracking-[0.18em] text-white/65">Total</p>
          <p className="mt-1 font-heading text-4xl font-extrabold leading-none">
            {formatMoney(getAmount(proposal), getCurrency(proposal))}
          </p>
          <p className="mt-2 font-body text-sm text-white/70">
            El comprobante PDF se guardará automáticamente en la bóveda.
          </p>
        </div>
      </div>
    </div>
  )
}

const colorMap = {
  blue:   { border: 'border-[#BFDBFE]', bg: 'bg-[#EFF6FF]', label: 'text-[#1E6FD9]' },
  purple: { border: 'border-[#DDD6FE]', bg: 'bg-[#F5F3FF]', label: 'text-[#7A4FD6]' },
  green:  { border: 'border-[#BBF7D0]', bg: 'bg-[#F0FDF4]', label: 'text-[#16794A]' },
  amber:  { border: 'border-[#FDE68A]', bg: 'bg-[#FFFBEB]', label: 'text-[#92400E]' },
}

function Info({ label, value, color = 'blue' }: { label: string; value: string; color?: keyof typeof colorMap }) {
  const c = colorMap[color]
  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} px-4 py-3`}>
      <p className={`font-body text-xs font-bold uppercase tracking-wide ${c.label}`}>{label}</p>
      <p className="mt-1.5 font-body text-base font-semibold leading-snug text-[#1E0A4E]">{value}</p>
    </div>
  )
}
