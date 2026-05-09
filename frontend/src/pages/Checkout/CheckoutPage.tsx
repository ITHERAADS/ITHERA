import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckoutSummaryCard } from '../../components/checkout/CheckoutSummaryCard'
import { PaymentCardForm } from '../../components/checkout/PaymentCardForm'
import { PurchaseSuccessModal } from '../../components/checkout/PurchaseSuccessModal'
import { useAuth } from '../../context/useAuth'
import { checkoutService, type SimulatedCheckoutPayload, type SimulatedCheckoutResult } from '../../services/checkout'
import { proposalsService, type Proposal } from '../../services/proposals'

export function CheckoutPage() {
  const { type, proposalId } = useParams<{ type: 'flight' | 'hotel'; proposalId: string }>()
  const navigate = useNavigate()
  const { accessToken, sessionUser, localUser } = useAuth()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successResult, setSuccessResult] = useState<SimulatedCheckoutResult | null>(null)

  const mode = useMemo(() => type === 'hotel' ? 'hospedaje' : 'vuelo', [type])

  useEffect(() => {
    const loadProposal = async () => {
      if (!accessToken || !proposalId) return
      try {
        setLoading(true)
        setError(null)
        const response = await proposalsService.getProposal(proposalId, accessToken)
        setProposal(response.proposal)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar la propuesta')
      } finally {
        setLoading(false)
      }
    }

    void loadProposal()
  }, [accessToken, proposalId])

  const submitCheckout = async (payload: SimulatedCheckoutPayload) => {
    if (!accessToken || !proposalId) return
    try {
      setProcessing(true)
      setError(null)

      const response = mode === 'vuelo'
        ? await checkoutService.simulateFlightPayment(proposalId, payload, accessToken)
        : await checkoutService.simulateHotelReservation(proposalId, payload, accessToken)

      setSuccessResult(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la operación')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F3F6FB] px-4 py-8">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-8 text-center font-body text-sm text-[#64748B] shadow-sm">
          Cargando checkout...
        </div>
      </main>
    )
  }

  if (!proposal) {
    return (
      <main className="min-h-screen bg-[#F3F6FB] px-4 py-8">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-8 text-center shadow-sm">
          <p className="font-heading text-xl font-bold text-[#1E0A4E]">No se encontró la propuesta</p>
          <button onClick={() => navigate(-1)} className="mt-4 rounded-2xl bg-[#1E6FD9] px-5 py-2 font-body text-sm font-bold text-white">
            Regresar
          </button>
        </div>
      </main>
    )
  }

  const isApproved = proposal.estado === 'aprobada'

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#E8F1FF_0,#F8FAFC_35%,#F4F0FF_100%)] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <button
          onClick={() => navigate(-1)}
          className="mb-5 rounded-2xl border border-[#D9E2F2] bg-white/80 px-4 py-2 font-body text-sm font-bold text-[#1E0A4E] shadow-sm hover:bg-white"
        >
          ← Regresar
        </button>

        <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-[#1E0A4E] via-[#31206E] to-[#1E6FD9] p-6 text-white shadow-xl shadow-[#1E0A4E]/20">
          <p className="font-body text-xs font-bold uppercase tracking-[0.25em] text-white/70">
            ITHERA Checkout
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold">
            {mode === 'vuelo' ? 'Compra de vuelo' : 'Reserva de hospedaje'}
          </h1>
          <p className="mt-2 max-w-2xl font-body text-sm text-white/75">
            Confirma la operación, genera el comprobante PDF y lo guarda en la bóveda documental del grupo.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4 font-body text-sm font-semibold text-[#EF4444]">
            {error}
          </div>
        )}

        {!isApproved && (
          <div className="mb-5 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-4 font-body text-sm font-semibold text-[#92400E]">
            Esta propuesta todavía no está aprobada. Solo las propuestas ganadoras pueden comprarse o reservarse.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <CheckoutSummaryCard proposal={proposal} />
          <PaymentCardForm
            mode={mode}
            loading={processing || !isApproved}
            defaultEmail={sessionUser?.email ?? localUser?.email ?? ''}
            onSubmit={submitCheckout}
          />
        </div>
      </div>

      {successResult && (
        <PurchaseSuccessModal
          result={successResult}
          mode={mode}
          onClose={() => navigate(-1)}
        />
      )}
    </main>
  )
}
