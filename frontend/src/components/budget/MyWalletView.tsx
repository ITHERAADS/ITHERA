import { useState } from 'react'
import type { FC } from 'react'
import type {
  BudgetMember,
  BudgetPaymentHistoryItem,
  BudgetSettlement,
  MarkSettlementPaymentPayload,
} from '../../services/budget'

interface WalletEntry {
  id: string
  fromUserId: string
  toUserId: string
  persona: string
  monto: number
  status: 'Pendiente'
}

function formatMXN(n: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(n)
}

function StatusBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-[#E2E8F0] bg-[#F4F6F8] px-2 py-0.5 font-body text-[11px] font-semibold text-[#7A8799]">
      Pendiente
    </span>
  )
}

interface Props {
  onBack: () => void
  settlements?: BudgetSettlement[]
  paymentHistory?: BudgetPaymentHistoryItem[]
  members?: BudgetMember[]
  myRole?: string
  currentUserId?: string | null
  onMarkPaid?: (payload: MarkSettlementPaymentPayload) => Promise<void>
}

export const MyWalletView: FC<Props> = ({
  onBack,
  settlements = [],
  paymentHistory = [],
  members = [],
  myRole = 'viajero',
  currentUserId,
  onMarkPaid,
}) => {
  const [historialOpen, setHistorialOpen] = useState(false)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const nameById = new Map(members.map((member) => [String(member.usuario_id), member.nombre || member.email]))
  const isAdmin = String(myRole).toLowerCase() === 'admin'

  const meDeben: WalletEntry[] = settlements
    .filter((settlement) => String(settlement.to) === String(currentUserId))
    .map((settlement) => ({
      id: `${settlement.from}-${settlement.to}`,
      fromUserId: String(settlement.from),
      toUserId: String(settlement.to),
      persona: nameById.get(String(settlement.from)) ?? `Usuario ${settlement.from}`,
      monto: settlement.amount,
      status: 'Pendiente',
    }))

  const leDebo: WalletEntry[] = settlements
    .filter((settlement) => String(settlement.from) === String(currentUserId))
    .map((settlement) => ({
      id: `${settlement.from}-${settlement.to}`,
      fromUserId: String(settlement.from),
      toUserId: String(settlement.to),
      persona: nameById.get(String(settlement.to)) ?? `Usuario ${settlement.to}`,
      monto: settlement.amount,
      status: 'Pendiente',
    }))

  const historyRows = paymentHistory.map((item) => ({
    id: item.id,
    fromName: nameById.get(String(item.from)) ?? `Usuario ${item.from}`,
    toName: nameById.get(String(item.to)) ?? `Usuario ${item.to}`,
    amount: item.amount,
    paidAt: item.paid_at,
  }))

  const totalOweMe = meDeben.reduce((sum, entry) => sum + entry.monto, 0)
  const totalIOwe = leDebo.reduce((sum, entry) => sum + entry.monto, 0)
  const netBalance = totalOweMe - totalIOwe
  const isPositive = netBalance >= 0
  const isAlDia = netBalance === 0

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-[#F4F6F8]">
      <div className="bg-[#1E0A4E] px-6 pb-8 pt-6">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 font-body text-sm text-white/70 transition-colors hover:text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver al presupuesto
        </button>

        <p className="mb-1 font-body text-sm text-white/60">Balance personal</p>
        <h1 className="mb-4 font-heading text-2xl font-bold text-white">Mi Cartera</h1>

        {isAlDia ? (
          <div className="rounded-2xl border border-[#35C56A]/30 bg-[#35C56A]/20 px-4 py-4">
            <p className="font-heading text-lg font-bold text-[#35C56A]">Al dia</p>
            <p className="font-body text-xs text-white/70">Estas al corriente con la liquidacion actual</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-4">
            <p className="mb-1 font-body text-xs text-white/60">Total Neto</p>
            <p className="font-heading text-3xl font-bold" style={{ color: isPositive ? '#35C56A' : '#EF4444' }}>
              {isPositive ? '+' : ''}{formatMXN(netBalance)}
            </p>
            <p className="mt-1 font-body text-xs text-white/50">
              {isPositive ? 'El grupo te debe en total' : 'Debes en total al grupo'}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-5 px-6 py-5">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#35C56A]" />
            <h2 className="font-heading text-sm font-bold text-[#3D4A5C]">Te deben</h2>
            <span className="ml-auto font-body text-sm font-semibold text-[#35C56A]">{formatMXN(totalOweMe)}</span>
          </div>
          <div className="flex flex-col gap-2">
            {meDeben.length === 0 ? (
              <p className="py-4 text-center font-body text-sm text-[#7A8799]">Nadie te debe nada</p>
            ) : meDeben.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3">
                <div>
                  <p className="font-body text-sm font-semibold text-[#3D4A5C]">{entry.persona}</p>
                  <p className="font-body text-xs text-[#7A8799]">Liquidacion minima</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-heading text-sm font-bold text-[#35C56A]">+{formatMXN(entry.monto)}</span>
                  <StatusBadge />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
            <h2 className="font-heading text-sm font-bold text-[#3D4A5C]">Tu debes</h2>
            <span className="ml-auto font-body text-sm font-semibold text-[#EF4444]">{formatMXN(totalIOwe)}</span>
          </div>
          <div className="flex flex-col gap-2">
            {leDebo.length === 0 ? (
              <p className="py-4 text-center font-body text-sm text-[#7A8799]">No debes nada</p>
            ) : leDebo.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3">
                <div>
                  <p className="font-body text-sm font-semibold text-[#3D4A5C]">{entry.persona}</p>
                  <p className="font-body text-xs text-[#7A8799]">Liquidacion minima</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-heading text-sm font-bold text-[#EF4444]">-{formatMXN(entry.monto)}</span>
                  <div className="flex items-center gap-2">
                    <StatusBadge />
                    {(isAdmin || String(currentUserId) === entry.fromUserId) && onMarkPaid && (
                      <button
                        onClick={async () => {
                          setMarkingId(entry.id)
                          try {
                            await onMarkPaid({
                              from_user_id: entry.fromUserId,
                              to_user_id: entry.toUserId,
                              amount: entry.monto,
                            })
                          } finally {
                            setMarkingId(null)
                          }
                        }}
                        disabled={markingId === entry.id}
                        className="rounded-lg border border-[#EF4444]/20 px-2 py-0.5 font-body text-[11px] font-semibold text-[#EF4444] transition-colors hover:bg-[#FEF2F2] disabled:opacity-50"
                      >
                        {markingId === entry.id ? 'Guardando...' : 'Marcar pagado'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
          <button
            onClick={() => setHistorialOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-4"
          >
            <span className="font-heading text-sm font-bold text-[#3D4A5C]">Historial de pagos</span>
            <span className="font-body text-xs text-[#7A8799]">{historialOpen ? 'Ocultar' : 'Ver'}</span>
          </button>
          {historialOpen && (
            <div className="border-t border-[#E2E8F0] px-4 pb-4 pt-3">
              {historyRows.length === 0 ? (
                <p className="font-body text-xs text-[#7A8799]">Aun no hay pagos marcados.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {historyRows.map((row) => (
                    <div key={row.id} className="flex items-center justify-between rounded-xl bg-[#F8FAFC] px-3 py-2">
                      <div>
                        <p className="font-body text-xs font-semibold text-[#3D4A5C]">
                          {row.fromName} pago a {row.toName}
                        </p>
                        <p className="font-body text-[11px] text-[#7A8799]">
                          {new Date(row.paidAt).toLocaleDateString('es-MX')}
                        </p>
                      </div>
                      <span className="font-body text-xs font-semibold text-[#35C56A]">{formatMXN(row.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
