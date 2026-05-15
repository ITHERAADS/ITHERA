import { useMemo, useState } from 'react'
import type { FC } from 'react'
import type { BudgetMember, BudgetPaymentHistoryItem, BudgetSettlement } from '../../services/budget'

interface WalletEntry {
  pairId: string
  fromUserId: string
  toUserId: string
  persona: string
  monto: number
}

interface Props {
  onBack: () => void
  isReadOnly?: boolean
  settlements?: BudgetSettlement[]
  paymentHistory?: BudgetPaymentHistoryItem[]
  members?: BudgetMember[]
  currentUserId?: string | null
  onRegisterPayment?: (payload: {
    from_user_id: string
    to_user_id: string
    amount: number
    payment_method: 'efectivo_presencial' | 'transferencia'
    note?: string | null
    proofFile?: File | null
  }) => Promise<void>
  onReviewPayment?: (paymentId: string, payload: { status: 'confirmado' | 'rechazado'; rejection_reason?: string | null }) => Promise<void>
  onUpdateSentPayment?: (paymentId: string, payload: {
    amount: number
    payment_method: 'efectivo_presencial' | 'transferencia'
    note?: string | null
    proofFile?: File | null
  }) => Promise<void>
  onDeleteSentPayment?: (paymentId: string) => Promise<void>
  onGenerateReceipt?: (payload: {
    debtor_user_id: string
    debtor_name: string
    creditor_user_id: string
    creditor_name: string
    amount: number
    folio: string
    fileName: string
    receiptText: string
    save_to_vault: boolean
  }) => Promise<void>
}

const formatMXN = (n: number): string => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
const round2 = (n: number): number => Math.round(n * 100) / 100
const paymentStatusLabel: Record<BudgetPaymentHistoryItem['status'], string> = { pendiente_validacion: 'Pendiente de validacion', confirmado: 'Confirmado', rechazado: 'Rechazado' }

export const MyWalletView: FC<Props> = ({
  onBack,
  isReadOnly = false,
  settlements = [],
  paymentHistory = [],
  members = [],
  currentUserId,
  onRegisterPayment,
  onReviewPayment,
  onUpdateSentPayment,
  onDeleteSentPayment,
  onGenerateReceipt,
}) => {
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'loading' | 'done'>('idle')
  const [exportingPdf, setExportingPdf] = useState(false)
  const [reviewBusyId, setReviewBusyId] = useState<string | null>(null)
  const [receiptBusyPairId, setReceiptBusyPairId] = useState<string | null>(null)
  const [receiptDonePairIds, setReceiptDonePairIds] = useState<Set<string>>(new Set())
  const [receiptModalEntry, setReceiptModalEntry] = useState<WalletEntry | null>(null)
  const [historialOpen, setHistorialOpen] = useState(false)
  const [rejectReasonByPayment, setRejectReasonByPayment] = useState<Record<string, string>>({})

  const [payingEntry, setPayingEntry] = useState<WalletEntry | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<'efectivo_presencial' | 'transferencia'>('transferencia')
  const [payNote, setPayNote] = useState('')
  const [payProof, setPayProof] = useState<File | null>(null)

  const [editingPayment, setEditingPayment] = useState<BudgetPaymentHistoryItem | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editMethod, setEditMethod] = useState<'efectivo_presencial' | 'transferencia'>('transferencia')
  const [editNote, setEditNote] = useState('')
  const [editProof, setEditProof] = useState<File | null>(null)

  const nameById = useMemo(() => new Map(members.map((m) => [String(m.usuario_id), m.nombre || m.email])), [members])

  const meDeben: WalletEntry[] = settlements
    .filter((s) => String(s.to) === String(currentUserId))
    .map((s) => ({ pairId: `${s.from}-${s.to}`, fromUserId: String(s.from), toUserId: String(s.to), persona: nameById.get(String(s.from)) ?? `Usuario ${s.from}`, monto: s.amount }))
  const leDebo: WalletEntry[] = settlements
    .filter((s) => String(s.from) === String(currentUserId))
    .map((s) => ({ pairId: `${s.from}-${s.to}`, fromUserId: String(s.from), toUserId: String(s.to), persona: nameById.get(String(s.to)) ?? `Usuario ${s.to}`, monto: s.amount }))

  const pendingToReview = paymentHistory.filter((p) => p.status === 'pendiente_validacion' && String(p.to) === String(currentUserId))
  const sentByMe = paymentHistory.filter((p) => String(p.from) === String(currentUserId) && (p.status === 'pendiente_validacion' || p.status === 'rechazado'))
  const pendingPairSet = new Set(sentByMe.filter((p) => p.status === 'pendiente_validacion').map((p) => `${p.from}-${p.to}`))

  const totalOweMe = meDeben.reduce((s, i) => s + i.monto, 0)
  const totalIOwe = leDebo.reduce((s, i) => s + i.monto, 0)
  const net = totalOweMe - totalIOwe
  const projectedSettlements = useMemo(() => {
    const pairMap = new Map<string, number>()
    for (const s of settlements) {
      pairMap.set(`${s.from}->${s.to}`, Number(s.amount))
    }

    const pendingForProjection = paymentHistory.filter((p) =>
      p.status === 'pendiente_validacion' &&
      (String(p.from) === String(currentUserId) || String(p.to) === String(currentUserId))
    )

    const applyDelta = (from: string, to: string, amount: number) => {
      const forwardKey = `${from}->${to}`
      const reverseKey = `${to}->${from}`
      const forward = pairMap.get(forwardKey) ?? 0
      const reverse = pairMap.get(reverseKey) ?? 0
      if (forward > 0) {
        const nextForward = forward - amount
        if (nextForward > 0.01) {
          pairMap.set(forwardKey, nextForward)
        } else if (nextForward < -0.01) {
          pairMap.delete(forwardKey)
          pairMap.set(reverseKey, round2(reverse + Math.abs(nextForward)))
        } else {
          pairMap.delete(forwardKey)
        }
        return
      }
      pairMap.set(reverseKey, round2(reverse + amount))
    }

    for (const p of pendingForProjection) {
      applyDelta(String(p.from), String(p.to), Number(p.amount))
    }

    return Array.from(pairMap.entries())
      .map(([key, amount]) => {
        const [from, to] = key.split('->')
        return { from, to, amount: round2(amount) }
      })
      .filter((item) => item.amount > 0.01)
  }, [settlements, paymentHistory, currentUserId])

  const projectedMeDebenTotal = projectedSettlements
    .filter((s) => String(s.to) === String(currentUserId))
    .reduce((sum, s) => sum + s.amount, 0)
  const projectedYoDeboTotal = projectedSettlements
    .filter((s) => String(s.from) === String(currentUserId))
    .reduce((sum, s) => sum + s.amount, 0)
  const summaryText = useMemo(() => {
    const lines: string[] = []
    lines.push('Resumen de liquidacion')
    lines.push(`Fecha: ${new Date().toLocaleString('es-MX')}`)
    lines.push(`Te deben: ${formatMXN(totalOweMe)}`)
    lines.push(`Tu debes: ${formatMXN(totalIOwe)}`)
    lines.push(`Balance neto: ${formatMXN(net)}`)
    lines.push('')
    lines.push('Liquidaciones pendientes:')
    if (settlements.length === 0) {
      lines.push('- Sin liquidaciones pendientes')
    } else {
      for (const s of settlements) {
        const fromName = nameById.get(String(s.from)) ?? `Usuario ${s.from}`
        const toName = nameById.get(String(s.to)) ?? `Usuario ${s.to}`
        lines.push(`- ${fromName} paga a ${toName}: ${formatMXN(s.amount)}`)
      }
    }
    return lines.join('\n')
  }, [nameById, net, settlements, totalIOwe, totalOweMe])

  const buildLiquidationPdfHtml = () => {
    const escapeHtml = (value: string) =>
      value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')

    const generatedAt = new Date().toLocaleString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const settlementsHtml = settlements.length === 0
      ? `<p class="empty">Sin liquidaciones pendientes.</p>`
      : settlements.map((s, index) => {
        const fromName = nameById.get(String(s.from)) ?? `Usuario ${s.from}`
        const toName = nameById.get(String(s.to)) ?? `Usuario ${s.to}`
        return `
          <article class="row">
            <div class="index">${index + 1}</div>
            <div class="content">
              <h4>${escapeHtml(fromName)} paga a ${escapeHtml(toName)}</h4>
              <div class="chips">
                <span>Monto: ${escapeHtml(formatMXN(s.amount))}</span>
                <span>Deudor ID: ${escapeHtml(String(s.from))}</span>
                <span>Acreedor ID: ${escapeHtml(String(s.to))}</span>
              </div>
            </div>
          </article>
        `
      }).join('')

    return `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>Resumen de Liquidacion</title>
          <style>
            :root{--ink:#1E0A4E;--ink-soft:#2E1767;--blue:#1E6FD9;--paper:#fff;--muted:#64748B;}
            *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
            body{margin:0;font-family:"Segoe UI",Tahoma,Geneva,Verdana,sans-serif;background:linear-gradient(145deg,#EBE6FA 0%,#EAF2FF 100%);padding:24px;color:#243247;}
            .sheet{max-width:900px;margin:0 auto;background:var(--paper);border:1px solid #D9E4F7;border-radius:20px;overflow:hidden;box-shadow:0 24px 56px rgba(30,10,78,.18);}
            .hero{background:linear-gradient(120deg,var(--ink),var(--ink-soft));color:#fff;padding:28px 30px;}
            .hero h1{margin:0;font-size:30px;}
            .hero p{margin:8px 0 0;font-size:14px;color:rgba(255,255,255,.9);}
            .metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px;}
            .metric{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.24);padding:10px;border-radius:12px;}
            .metric b{display:block;font-size:20px;margin-top:4px;}
            .content{padding:18px 20px 26px;background:linear-gradient(180deg,#FAFCFF 0%,#FFFFFF 18%);}
            .section{border:1px solid #DEE7FB;border-radius:16px;background:#fff;overflow:hidden;}
            .section h3{margin:0;padding:12px 14px;background:linear-gradient(90deg,#F3EEFF,#F8FAFF);border-bottom:1px solid #E5ECFA;color:var(--ink);}
            .row{display:flex;gap:12px;border-bottom:1px solid #EEF2FB;padding:12px 14px;}
            .row:last-child{border-bottom:0;}
            .index{width:28px;height:28px;border-radius:999px;background:linear-gradient(140deg,var(--blue),#4A8DF0);color:#fff;display:grid;place-items:center;font-size:12px;font-weight:800;flex-shrink:0;}
            .content h4{margin:0;color:var(--ink);font-size:15px;}
            .chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px;}
            .chips span{background:#F3EEFF;border:1px solid #DCCEFF;color:#452A84;font-size:10.5px;padding:4px 8px;border-radius:999px;font-weight:600;}
            .empty{margin:0;padding:16px;color:var(--muted);font-size:13px;}
            .footer{border-top:1px solid #E5ECFA;background:#FAFCFF;padding:12px 20px;color:var(--muted);font-size:11px;display:flex;justify-content:space-between;}
            @media print{body{background:#EEE8FB;padding:0}.sheet{border:0;border-radius:0;box-shadow:none;max-width:100%}@page{size:A4;margin:10mm}}
          </style>
        </head>
        <body>
          <main class="sheet">
            <header class="hero">
              <h1>Resumen de liquidacion</h1>
              <p>Mi Cartera · ITHERA</p>
              <div class="metrics">
                <div class="metric"><span>Te deben</span><b>${escapeHtml(formatMXN(totalOweMe))}</b></div>
                <div class="metric"><span>Tu debes</span><b>${escapeHtml(formatMXN(totalIOwe))}</b></div>
                <div class="metric"><span>Balance neto</span><b>${escapeHtml(formatMXN(net))}</b></div>
              </div>
            </header>
            <section class="content">
              <div class="section">
                <h3>Liquidaciones pendientes</h3>
                ${settlementsHtml}
              </div>
            </section>
            <footer class="footer">
              <span>Generado por ITHERA</span>
              <span>${escapeHtml(generatedAt)}</span>
            </footer>
          </main>
        </body>
      </html>
    `
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-[#F4F6F8]">
      <div className="bg-[#1E0A4E] px-6 pb-8 pt-6">
        <button
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/12 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-white/20 hover:shadow-md"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver al presupuesto
        </button>
        <h1 className="text-2xl font-bold text-white">Mi Cartera</h1>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-6 py-5">
        {error && <div className="rounded-xl border border-[#FBC7C7] bg-[#FFF5F5] px-4 py-3 text-sm text-[#C03535]">{error}</div>}
        {isReadOnly && (
          <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
            Estas en modo solo lectura (sin conexion). Puedes consultar datos sincronizados, pero no modificar pagos.
          </div>
        )}

        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[#3D4A5C]">Resumen</h2>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    setCopyState('loading')
                    await navigator.clipboard.writeText(summaryText)
                    setCopyState('done')
                    window.setTimeout(() => setCopyState('idle'), 1800)
                  } catch {
                    setCopyState('idle')
                    setError('No se pudo copiar el resumen.')
                  }
                }}
                disabled={copyState === 'loading'}
                className="rounded-lg border border-[#CBD5E1] px-3 py-1 text-xs font-semibold text-[#334155]"
              >
                {copyState === 'loading' ? 'Copiando...' : copyState === 'done' ? 'Resumen copiado' : 'Copiar resumen'}
              </button>
              <button
                onClick={() => {
                  setExportingPdf(true)
                  const html = buildLiquidationPdfHtml()
                  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
                  const blobUrl = URL.createObjectURL(blob)
                  const win = window.open(blobUrl, '_blank')
                  if (!win) {
                    setExportingPdf(false)
                    URL.revokeObjectURL(blobUrl)
                    return setError('No se pudo abrir la ventana para exportar PDF.')
                  }
                  const cleanup = () => {
                    URL.revokeObjectURL(blobUrl)
                    setExportingPdf(false)
                  }
                  const onLoad = () => {
                    try {
                      win.focus()
                      win.print()
                    } finally {
                      cleanup()
                    }
                  }
                  try {
                    win.addEventListener('load', onLoad, { once: true })
                  } catch {
                    window.setTimeout(() => {
                      try {
                        win.focus()
                        win.print()
                      } finally {
                        cleanup()
                      }
                    }, 700)
                  }
                }}
                disabled={exportingPdf}
                className="rounded-lg bg-[#1E6FD9] px-3 py-1 text-xs font-semibold text-white"
              >
                {exportingPdf ? 'Exportando...' : 'Exportar PDF'}
              </button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-[#DCFCE7] bg-[#F0FDF4] px-3 py-2"><p className="text-xs text-[#166534]">Te deben</p><p className="text-lg font-bold text-[#15803D]">{formatMXN(totalOweMe)}</p></div>
            <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2"><p className="text-xs text-[#991B1B]">Tu debes</p><p className="text-lg font-bold text-[#DC2626]">{formatMXN(totalIOwe)}</p></div>
            <div className="rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-2"><p className="text-xs text-[#1E40AF]">Balance neto</p><p className="text-lg font-bold text-[#1D4ED8]">{formatMXN(net)}</p></div>
          </div>
          {sentByMe.some((p) => p.status === 'pendiente_validacion') && (
            <div className="mt-3 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2">
              <p className="text-xs font-semibold text-[#1E40AF]">Proyeccion si confirman tus pagos pendientes</p>
              <p className="text-xs text-[#334155]">
                Te deberian: <b>{formatMXN(projectedMeDebenTotal)}</b> · Tu deberias: <b>{formatMXN(projectedYoDeboTotal)}</b>
              </p>
            </div>
          )}
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-[#E2E8F0] p-3">
              <p className="mb-2 text-sm font-semibold">Te deben</p>
              {meDeben.length === 0 ? <p className="text-xs text-[#64748B]">Nadie te debe por ahora.</p> : meDeben.map((e) => (
                <div key={e.pairId} className="mb-2 rounded-lg border border-[#E2E8F0] px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{e.persona}</span>
                    <span className="text-sm font-semibold text-[#15803D]">+{formatMXN(e.monto)}</span>
                  </div>
                  <div className="mt-2">
                    <button
                      onClick={() => setReceiptModalEntry(e)}
                      disabled={isReadOnly || receiptBusyPairId === e.pairId}
                      className="rounded-lg border border-[#15803D] px-3 py-1 text-xs font-semibold text-[#15803D]"
                    >
                      {receiptBusyPairId === e.pairId ? 'Generando...' : receiptDonePairIds.has(e.pairId) ? 'Ya en boveda' : 'Generar recibo'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-[#E2E8F0] p-3">
              <p className="mb-2 text-sm font-semibold">Tu debes</p>
              {leDebo.length === 0 ? <p className="text-xs text-[#64748B]">No debes nada.</p> : leDebo.map((e) => {
                const hasPending = pendingPairSet.has(`${e.fromUserId}-${e.toUserId}`)
                return (
                  <div key={e.pairId} className="mb-2 rounded-lg border border-[#E2E8F0] px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{e.persona}</span>
                      <span className="text-sm font-semibold text-[#DC2626]">-{formatMXN(e.monto)}</span>
                    </div>
                    <div className="mt-2">
                      <button
                        disabled={isReadOnly || hasPending}
                        onClick={() => { setPayingEntry(e); setPayAmount(String(e.monto)); setPayMethod('transferencia'); setPayNote(''); setPayProof(null) }}
                        className="rounded-lg bg-[#1E6FD9] px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {hasPending ? 'Ya tienes un pago pendiente' : 'Pagar'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
          <h2 className="mb-3 text-sm font-bold text-[#3D4A5C]">Pagos por validar</h2>
          {pendingToReview.length === 0 ? <p className="text-xs text-[#64748B]">No hay pagos pendientes de tu validacion.</p> : pendingToReview.map((p) => (
            <div key={p.id} className="mb-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-3">
              <p className="text-sm font-semibold">{nameById.get(p.from) ?? `Usuario ${p.from}`} reporto {formatMXN(p.amount)}</p>
              <div className="mt-2 flex gap-2">
                <button
                  disabled={isReadOnly || reviewBusyId === p.id}
                  onClick={async () => {
                    setReviewBusyId(p.id)
                    try { await onReviewPayment?.(p.id, { status: 'confirmado' }) } finally { setReviewBusyId(null) }
                  }}
                  className="rounded-lg bg-[#16A34A] px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {reviewBusyId === p.id ? 'Confirmando...' : 'Confirmar'}
                </button>
                <input disabled={isReadOnly} value={rejectReasonByPayment[p.id] ?? ''} onChange={(e) => setRejectReasonByPayment((s) => ({ ...s, [p.id]: e.target.value }))} placeholder="Motivo rechazo" className="rounded-lg border border-[#CBD5E1] px-2 py-1 text-xs" />
                <button
                  disabled={isReadOnly || reviewBusyId === p.id}
                  onClick={async () => {
                    setReviewBusyId(p.id)
                    try { await onReviewPayment?.(p.id, { status: 'rechazado', rejection_reason: rejectReasonByPayment[p.id] ?? '' }) } finally { setReviewBusyId(null) }
                  }}
                  className="rounded-lg border border-[#DC2626] px-3 py-1 text-xs font-semibold text-[#DC2626] disabled:opacity-60"
                >
                  {reviewBusyId === p.id ? 'Rechazando...' : 'Rechazar'}
                </button>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
          <h2 className="mb-3 text-sm font-bold text-[#3D4A5C]">Pagos enviados por ti</h2>
          {sentByMe.length === 0 ? <p className="text-xs text-[#64748B]">No tienes pagos enviados pendientes/rechazados.</p> : sentByMe.map((p) => (
            <div key={p.id} className="mb-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">A {nameById.get(p.to) ?? `Usuario ${p.to}`} por {formatMXN(p.amount)}</p>
                <span className="text-xs text-[#64748B]">{paymentStatusLabel[p.status]}</span>
              </div>
              <div className="mt-2 flex gap-2">
                {p.status === 'pendiente_validacion' && (
                  <button
                    onClick={() => {
                      setEditingPayment(p)
                      setEditAmount(String(p.amount))
                      setEditMethod((p.payment_method ?? 'transferencia'))
                      setEditNote(p.note ?? '')
                      setEditProof(null)
                    }}
                    disabled={isReadOnly}
                    className="rounded-lg bg-[#1E6FD9] px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    Editar
                  </button>
                )}
                {p.status === 'pendiente_validacion' && (
                  <button
                    onClick={async () => {
                      setBusyId(p.id)
                      setError(null)
                      try { await onDeleteSentPayment?.(p.id) } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo eliminar') } finally { setBusyId(null) }
                    }}
                    disabled={isReadOnly || busyId === p.id}
                    className="rounded-lg border border-[#DC2626] px-3 py-1 text-xs font-semibold text-[#DC2626] disabled:opacity-60"
                  >
                    {busyId === p.id ? 'Eliminando...' : 'Eliminar'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
          <button onClick={() => setHistorialOpen((v) => !v)} className="flex w-full items-center justify-between px-4 py-4"><span className="text-sm font-bold text-[#3D4A5C]">Historial de pagos</span><span className="text-xs text-[#7A8799]">{historialOpen ? 'Ocultar' : 'Ver'}</span></button>
          {historialOpen && <div className="border-t border-[#E2E8F0] px-4 pb-4 pt-3">{paymentHistory.length === 0 ? <p className="text-xs text-[#64748B]">Aun no hay pagos.</p> : paymentHistory.map((p) => <div key={p.id} className="mb-2 rounded-xl bg-[#F8FAFC] px-3 py-2"><p className="text-xs font-semibold">{nameById.get(p.from) ?? `Usuario ${p.from}`} reporto pago a {nameById.get(p.to) ?? `Usuario ${p.to}`}</p><p className="text-[11px] text-[#64748B]">{formatMXN(p.amount)} - {paymentStatusLabel[p.status]}</p></div>)}</div>}
        </section>
      </div>

      {payingEntry && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4">
            <h3 className="mb-3 text-base font-bold">Registrar pago a {payingEntry.persona}</h3>
            <div className="grid gap-2">
              <input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="Monto" className="rounded-lg border border-[#CBD5E1] px-2 py-2 text-sm" />
              <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as 'efectivo_presencial' | 'transferencia')} className="rounded-lg border border-[#CBD5E1] px-2 py-2 text-sm"><option value="transferencia">Transferencia</option><option value="efectivo_presencial">Efectivo presencial</option></select>
              <input type="file" onChange={(e) => setPayProof(e.target.files?.[0] ?? null)} className="rounded-lg border border-[#CBD5E1] px-2 py-2 text-sm" />
              <input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Nota opcional" className="rounded-lg border border-[#CBD5E1] px-2 py-2 text-sm" />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setPayingEntry(null)} className="rounded-lg border border-[#CBD5E1] px-3 py-1.5 text-sm">Cancelar</button>
              <button onClick={async () => {
                const amount = Number(payAmount)
                if (!Number.isFinite(amount) || amount <= 0) return setError('Monto invalido')
                if (amount - payingEntry.monto > 0.01) return setError('El monto excede la deuda pendiente.')
                if (payMethod === 'transferencia' && !payProof) return setError('Para transferencia debes adjuntar comprobante.')
                setError(null)
                try {
                  setBusyId(`pay-${payingEntry.pairId}`)
                  await onRegisterPayment?.({ from_user_id: payingEntry.fromUserId, to_user_id: payingEntry.toUserId, amount, payment_method: payMethod, note: payNote || null, proofFile: payProof })
                  setPayingEntry(null)
                } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo registrar') } finally { setBusyId(null) }
              }} disabled={isReadOnly || busyId === `pay-${payingEntry.pairId}`} className="rounded-lg bg-[#1E6FD9] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
                {busyId === `pay-${payingEntry.pairId}` ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingPayment && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4">
            <h3 className="mb-3 text-base font-bold">Editar pago enviado</h3>
            <div className="grid gap-2">
              <input value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="rounded-lg border border-[#CBD5E1] px-2 py-2 text-sm" />
              <select value={editMethod} onChange={(e) => setEditMethod(e.target.value as 'efectivo_presencial' | 'transferencia')} className="rounded-lg border border-[#CBD5E1] px-2 py-2 text-sm"><option value="transferencia">Transferencia</option><option value="efectivo_presencial">Efectivo presencial</option></select>
              <input type="file" onChange={(e) => setEditProof(e.target.files?.[0] ?? null)} className="rounded-lg border border-[#CBD5E1] px-2 py-2 text-sm" />
              <input value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Nota opcional" className="rounded-lg border border-[#CBD5E1] px-2 py-2 text-sm" />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setEditingPayment(null)} className="rounded-lg border border-[#CBD5E1] px-3 py-1.5 text-sm">Cancelar</button>
              <button onClick={async () => {
                const amount = Number(editAmount)
                if (!Number.isFinite(amount) || amount <= 0) return setError('Monto invalido')
                if (editMethod === 'transferencia' && !editProof && !editingPayment.proof_document_id) return setError('Para transferencia debes adjuntar comprobante.')
                try {
                  setBusyId(`edit-${editingPayment.id}`)
                  await onUpdateSentPayment?.(editingPayment.id, { amount, payment_method: editMethod, note: editNote || null, proofFile: editProof })
                  setEditingPayment(null)
                } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo actualizar') } finally { setBusyId(null) }
              }} disabled={isReadOnly || busyId === `edit-${editingPayment.id}`} className="rounded-lg bg-[#1E6FD9] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
                {busyId === `edit-${editingPayment.id}` ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {receiptModalEntry && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4">
            <h3 className="mb-2 text-base font-bold">Generar recibo de cobro</h3>
            <p className="text-sm text-[#475569]">
              Puedes abrir la vista previa del recibo y decidir si tambien quieres guardarlo en la boveda.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setReceiptModalEntry(null)}
                className="rounded-lg border border-[#CBD5E1] px-3 py-1.5 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const e = receiptModalEntry
                  const now = new Date()
                  const folio = `RC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${now.getTime().toString().slice(-6)}`
                  const creditorName = nameById.get(String(e.toUserId)) ?? `Usuario ${e.toUserId}`
                  const debtorName = nameById.get(String(e.fromUserId)) ?? `Usuario ${e.fromUserId}`
                  const receiptText = [
                    'RECIBO DE COBRO',
                    `Folio: ${folio}`,
                    `Fecha de emision: ${now.toLocaleString('es-MX')}`,
                    `Acreedor: ${creditorName} (ID: ${e.toUserId})`,
                    `Deudor: ${debtorName} (ID: ${e.fromUserId})`,
                    `Monto: ${formatMXN(e.monto)}`,
                    '',
                    'Este recibo es snapshot del estado actual de deuda.',
                  ].join('\n')
                  try {
                    setReceiptBusyPairId(e.pairId)
                    await onGenerateReceipt?.({
                      debtor_user_id: e.fromUserId,
                      debtor_name: debtorName,
                      creditor_user_id: e.toUserId,
                      creditor_name: creditorName,
                      amount: e.monto,
                      folio,
                      fileName: `recibo_cobro_${folio}.pdf`,
                      receiptText,
                      save_to_vault: false,
                    })
                    setReceiptModalEntry(null)
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'No se pudo generar el recibo.')
                  } finally {
                    setReceiptBusyPairId(null)
                  }
                }}
                className="rounded-lg border border-[#1E6FD9] px-3 py-1.5 text-sm font-semibold text-[#1E6FD9]"
              >
                Solo vista previa
              </button>
              <button
                onClick={async () => {
                  const e = receiptModalEntry
                  const now = new Date()
                  const folio = `RC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${now.getTime().toString().slice(-6)}`
                  const creditorName = nameById.get(String(e.toUserId)) ?? `Usuario ${e.toUserId}`
                  const debtorName = nameById.get(String(e.fromUserId)) ?? `Usuario ${e.fromUserId}`
                  const receiptText = [
                    'RECIBO DE COBRO',
                    `Folio: ${folio}`,
                    `Fecha de emision: ${now.toLocaleString('es-MX')}`,
                    `Acreedor: ${creditorName} (ID: ${e.toUserId})`,
                    `Deudor: ${debtorName} (ID: ${e.fromUserId})`,
                    `Monto: ${formatMXN(e.monto)}`,
                    '',
                    'Este recibo es snapshot del estado actual de deuda.',
                  ].join('\n')
                  try {
                    setReceiptBusyPairId(e.pairId)
                    await onGenerateReceipt?.({
                      debtor_user_id: e.fromUserId,
                      debtor_name: debtorName,
                      creditor_user_id: e.toUserId,
                      creditor_name: creditorName,
                      amount: e.monto,
                      folio,
                      fileName: `recibo_cobro_${folio}.pdf`,
                      receiptText,
                      save_to_vault: true,
                    })
                    setReceiptDonePairIds((prev) => new Set(prev).add(e.pairId))
                    setReceiptModalEntry(null)
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'No se pudo generar el recibo.')
                  } finally {
                    setReceiptBusyPairId(null)
                  }
                }}
                className="rounded-lg bg-[#1E6FD9] px-3 py-1.5 text-sm font-semibold text-white"
              >
                Vista previa + guardar en boveda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
