import type { Proposal, ProposalDetailFlight, ProposalDetailHotel } from '../../services/proposals'

function formatMoney(value: number | string | null | undefined, currency?: string | null) {
  const amount = Number(value ?? 0)
  const safeCurrency = currency ?? 'MXN'

  if (!Number.isFinite(amount)) return `$0 ${safeCurrency}`

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: safeCurrency,
  }).format(amount)
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
    <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-xl shadow-[#1E0A4E]/10 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-body text-xs font-bold uppercase tracking-[0.2em] text-[#7A4FD6]">
            {isFlight ? 'Compra de vuelo' : 'Reserva de hospedaje'}
          </p>
          <h2 className="mt-1 font-heading text-xl font-bold text-[#1E0A4E]">
            {proposal.titulo}
          </h2>
          <p className="mt-1 font-body text-sm text-[#64748B]">
            {proposal.descripcion || 'Propuesta aprobada por el grupo.'}
          </p>
        </div>
        <span className="rounded-full bg-[#35C56A]/10 px-3 py-1 font-body text-xs font-bold text-[#35C56A]">
          Ganadora
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {isFlight ? (
          <>
            <Info label="Aerolínea" value={textValue(flightDetail.aerolinea, 'No especificada')} />
            <Info label="Vuelo" value={textValue(flightDetail.numero_vuelo, 'No especificado')} />
            <Info label="Origen" value={routeValue(flightDetail.origen_nombre, flightDetail.origen_codigo)} />
            <Info label="Destino" value={routeValue(flightDetail.destino_nombre, flightDetail.destino_codigo)} />
            <Info label="Salida" value={textValue(flightDetail.salida, 'No especificada')} />
            <Info label="Llegada" value={textValue(flightDetail.llegada, 'No especificada')} />
          </>
        ) : (
          <>
            <Info label="Hotel" value={textValue(hotelDetail.nombre, proposal.titulo)} />
            <Info label="Dirección" value={textValue(hotelDetail.direccion, 'No especificada')} />
            <Info label="Check-in" value={textValue(hotelDetail.check_in, 'No especificado')} />
            <Info label="Check-out" value={textValue(hotelDetail.check_out, 'No especificado')} />
            <Info label="Proveedor" value={textValue(hotelDetail.proveedor, 'Simulación interna')} />
            <Info label="Calificación" value={textValue(hotelDetail.calificacion, 'No especificada')} />
          </>
        )}
      </div>

      <div className="mt-5 rounded-2xl bg-gradient-to-r from-[#1E6FD9] to-[#7A4FD6] p-4 text-white">
        <p className="font-body text-xs uppercase tracking-[0.18em] text-white/75">Total simulado</p>
        <p className="mt-1 font-heading text-2xl font-bold">
          {formatMoney(getAmount(proposal), getCurrency(proposal))}
        </p>
        <p className="mt-1 font-body text-xs text-white/75">
          No se realiza ningún cargo real. El ticket PDF se guardará en la bóveda.
        </p>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
      <p className="font-body text-[11px] font-bold uppercase tracking-wide text-[#94A3B8]">{label}</p>
      <p className="mt-1 line-clamp-2 font-body text-sm font-semibold text-[#1E0A4E]">{value}</p>
    </div>
  )
}
