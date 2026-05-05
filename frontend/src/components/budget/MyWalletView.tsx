import { useState } from 'react'
import type { FC } from 'react'

interface WalletEntry {
  id: string
  persona: string
  monto: number
  concepto: string
  status: 'Pendiente' | 'Pagado'
}

interface HistorialEntry {
  id: string
  persona: string
  monto: number
  concepto: string
  fecha: string
  tipo: 'cobrado' | 'pagado'
}

const INITIAL_WALLET: { meDeben: WalletEntry[]; leDebo: WalletEntry[] } = {
  meDeben: [
    { id: '1', persona: 'Carlos', monto: 1066, concepto: 'Vuelo CDMX → Cancún', status: 'Pendiente' },
    { id: '2', persona: 'Ximena', monto: 1500, concepto: 'Hotel Marriott', status: 'Pendiente' },
  ],
  leDebo: [
    { id: '3', persona: 'Bryan', monto: 266, concepto: 'Snorkel en Cozumel', status: 'Pendiente' },
  ],
}

const MOCK_HISTORIAL: HistorialEntry[] = [
  { id: 'h1', persona: 'María', monto: 500, concepto: 'Cena en el restaurante', fecha: '2025-06-15', tipo: 'cobrado' },
  { id: 'h2', persona: 'Luis', monto: 800, concepto: 'Taxi aeropuerto', fecha: '2025-06-10', tipo: 'pagado' },
  { id: 'h3', persona: 'Carlos', monto: 350, concepto: 'Entradas museo', fecha: '2025-06-05', tipo: 'cobrado' },
]

function formatMXN(n: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
}

function StatusBadge({ status }: { status: 'Pendiente' | 'Pagado' }) {
  if (status === 'Pagado') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#35C56A]/10 px-2 py-0.5 font-body text-[11px] font-semibold text-[#35C56A]">
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Pagado
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full border border-[#E2E8F0] bg-[#F4F6F8] px-2 py-0.5 font-body text-[11px] font-semibold text-[#7A8799]">
      Pendiente
    </span>
  )
}

interface Props {
  onBack: () => void
}

export const MyWalletView: FC<Props> = ({ onBack }) => {
  const [wallet, setWallet] = useState(INITIAL_WALLET)
  const [historialOpen, setHistorialOpen] = useState(false)

  const totalOweMe = wallet.meDeben.filter(e => e.status === 'Pendiente').reduce((sum, e) => sum + e.monto, 0)
  const totalIOwe = wallet.leDebo.filter(e => e.status === 'Pendiente').reduce((sum, e) => sum + e.monto, 0)
  const netBalance = totalOweMe - totalIOwe
  const isPositive = netBalance >= 0
  const isAlDia = netBalance === 0

  const markAsReceived = (id: string) => {
    setWallet((prev) => ({
      ...prev,
      meDeben: prev.meDeben.map((e) => e.id === id ? { ...e, status: 'Pagado' as const } : e),
    }))
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-[#F4F6F8]">
      {/* Header */}
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
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#35C56A]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="font-heading text-lg font-bold text-[#35C56A]">Al día</p>
                <p className="font-body text-xs text-white/70">Estás al corriente</p>
              </div>
            </div>
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
        {/* Te deben */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#35C56A]" />
            <h2 className="font-heading text-sm font-bold text-[#3D4A5C]">Te deben</h2>
            <span className="ml-auto font-body text-sm font-semibold text-[#35C56A]">{formatMXN(totalOweMe)}</span>
          </div>
          <div className="flex flex-col gap-2">
            {wallet.meDeben.length === 0 ? (
              <p className="py-4 text-center font-body text-sm text-[#7A8799]">Nadie te debe nada</p>
            ) : (
              wallet.meDeben.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col gap-2.5 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#35C56A]/10 font-heading text-sm font-bold text-[#35C56A]">
                        {entry.persona[0]}
                      </div>
                      <div>
                        <p className="font-body text-sm font-semibold text-[#3D4A5C]">{entry.persona}</p>
                        <p className="font-body text-xs text-[#7A8799]">{entry.concepto}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-heading text-sm font-bold text-[#35C56A]">+{formatMXN(entry.monto)}</span>
                      <StatusBadge status={entry.status} />
                    </div>
                  </div>
                  {entry.status === 'Pendiente' && (
                    <button
                      onClick={() => markAsReceived(entry.id)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#35C56A] py-2 font-body text-xs font-semibold text-[#35C56A] transition-colors hover:bg-[#35C56A]/5"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Marcar como recibido
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tú debes */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
            <h2 className="font-heading text-sm font-bold text-[#3D4A5C]">Tú debes</h2>
            <span className="ml-auto font-body text-sm font-semibold text-[#EF4444]">{formatMXN(totalIOwe)}</span>
          </div>
          <div className="flex flex-col gap-2">
            {wallet.leDebo.length === 0 ? (
              <p className="py-4 text-center font-body text-sm text-[#7A8799]">No debes nada</p>
            ) : (
              wallet.leDebo.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EF4444]/10 font-heading text-sm font-bold text-[#EF4444]">
                      {entry.persona[0]}
                    </div>
                    <div>
                      <p className="font-body text-sm font-semibold text-[#3D4A5C]">{entry.persona}</p>
                      <p className="font-body text-xs text-[#7A8799]">{entry.concepto}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-heading text-sm font-bold text-[#EF4444]">-{formatMXN(entry.monto)}</span>
                    <StatusBadge status={entry.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Historial de pagos (Acordeón) */}
        <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
          <button
            onClick={() => setHistorialOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-4"
          >
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="#7A4FD6" strokeWidth="2" />
                <polyline points="12 6 12 12 16 14" stroke="#7A4FD6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="font-heading text-sm font-bold text-[#3D4A5C]">Historial de pagos</span>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className={`transition-transform duration-200 ${historialOpen ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" stroke="#7A8799" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {historialOpen && (
            <div className="border-t border-[#E2E8F0] px-4 pb-4 pt-3">
              <div className="flex flex-col gap-3">
                {MOCK_HISTORIAL.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: entry.tipo === 'cobrado' ? '#35C56A18' : '#EF444418',
                          color: entry.tipo === 'cobrado' ? '#35C56A' : '#EF4444',
                        }}
                      >
                        {entry.tipo === 'cobrado' ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <polyline points="19 12 12 19 5 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="font-body text-xs font-semibold text-[#3D4A5C]">{entry.concepto}</p>
                        <p className="font-body text-[11px] text-[#7A8799]">{entry.persona} · {entry.fecha}</p>
                      </div>
                    </div>
                    <span
                      className="font-heading text-sm font-bold"
                      style={{ color: entry.tipo === 'cobrado' ? '#35C56A' : '#EF4444' }}
                    >
                      {entry.tipo === 'cobrado' ? '+' : '-'}{formatMXN(entry.monto)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
