import type { FC } from 'react'

interface WalletEntry {
  persona: string
  monto: number
  concepto: string
}

const MOCK_WALLET: { meDeben: WalletEntry[]; leDebo: WalletEntry[] } = {
  meDeben: [
    { persona: 'Carlos', monto: 1066, concepto: 'Vuelo CDMX → Cancún' },
    { persona: 'Ximena', monto: 1500, concepto: 'Hotel Marriott' },
  ],
  leDebo: [
    { persona: 'Bryan', monto: 266, concepto: 'Snorkel en Cozumel' },
  ],
}

function formatMXN(n: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
}

interface Props {
  onBack: () => void
}

export const MyWalletView: FC<Props> = ({ onBack }) => {
  const totalOweMe = MOCK_WALLET.meDeben.reduce((sum, e) => sum + e.monto, 0)
  const totalIOwe = MOCK_WALLET.leDebo.reduce((sum, e) => sum + e.monto, 0)
  const netBalance = totalOweMe - totalIOwe
  const isPositive = netBalance >= 0

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

        <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-4">
          <p className="mb-1 font-body text-xs text-white/60">Total Neto</p>
          <p className="font-heading text-3xl font-bold" style={{ color: isPositive ? '#35C56A' : '#EF4444' }}>
            {isPositive ? '+' : ''}{formatMXN(netBalance)}
          </p>
          <p className="mt-1 font-body text-xs text-white/50">
            {isPositive ? 'El grupo te debe en total' : 'Debes en total al grupo'}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-6 py-5">
        {/* They owe me */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#35C56A]" />
            <h2 className="font-heading text-sm font-bold text-[#3D4A5C]">Te deben</h2>
            <span className="ml-auto font-body text-sm font-semibold text-[#35C56A]">{formatMXN(totalOweMe)}</span>
          </div>
          <div className="flex flex-col gap-2">
            {MOCK_WALLET.meDeben.length === 0 ? (
              <p className="py-4 text-center font-body text-sm text-[#7A8799]">Nadie te debe nada</p>
            ) : (
              MOCK_WALLET.meDeben.map((entry) => (
                <div
                  key={entry.persona}
                  className="flex items-center justify-between rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#35C56A]/10 font-heading text-sm font-bold text-[#35C56A]">
                      {entry.persona[0]}
                    </div>
                    <div>
                      <p className="font-body text-sm font-semibold text-[#3D4A5C]">{entry.persona}</p>
                      <p className="font-body text-xs text-[#7A8799]">{entry.concepto}</p>
                    </div>
                  </div>
                  <span className="font-heading text-sm font-bold text-[#35C56A]">+{formatMXN(entry.monto)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* I owe */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
            <h2 className="font-heading text-sm font-bold text-[#3D4A5C]">Tú debes</h2>
            <span className="ml-auto font-body text-sm font-semibold text-[#EF4444]">{formatMXN(totalIOwe)}</span>
          </div>
          <div className="flex flex-col gap-2">
            {MOCK_WALLET.leDebo.length === 0 ? (
              <p className="py-4 text-center font-body text-sm text-[#7A8799]">No debes nada</p>
            ) : (
              MOCK_WALLET.leDebo.map((entry) => (
                <div
                  key={entry.persona}
                  className="flex items-center justify-between rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EF4444]/10 font-heading text-sm font-bold text-[#EF4444]">
                      {entry.persona[0]}
                    </div>
                    <div>
                      <p className="font-body text-sm font-semibold text-[#3D4A5C]">{entry.persona}</p>
                      <p className="font-body text-xs text-[#7A8799]">{entry.concepto}</p>
                    </div>
                  </div>
                  <span className="font-heading text-sm font-bold text-[#EF4444]">-{formatMXN(entry.monto)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
