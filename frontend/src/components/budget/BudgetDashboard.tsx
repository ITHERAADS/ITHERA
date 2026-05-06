import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FC } from 'react'
import { RegisterExpenseModal } from './RegisterExpenseModal'
import { MyWalletView } from './MyWalletView'
import { getCurrentGroup } from '../../services/groups'
import { budgetService, type BudgetExpenseApi, type BudgetMember, type SaveExpensePayload } from '../../services/budget'
import { useAuth } from '../../context/useAuth'
import { useSocket } from '../../hooks/useSocket'
import { useGroupRealtimeRefresh } from '../../hooks/useGroupRealtimeRefresh'

export interface Expense {
  id: string
  titulo: string
  categoria: 'transporte' | 'hospedaje' | 'actividad' | 'comida' | 'otro'
  monto: number
  pagadoPor: string
  paidByUserId: string
  splitType: 'equitativa' | 'personalizada'
  fecha: string
  splitAmounts?: Record<string, number>
  memberIds?: string[]
}

const INITIAL_BUDGET = 0

function formatMXN(n: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
}

function categoryColor(categoria: Expense['categoria']): string {
  switch (categoria) {
    case 'transporte': return '#1E6FD9'
    case 'hospedaje': return '#8B5CF6'
    case 'comida': return '#F59E0B'
    case 'actividad': return '#35C56A'
    default: return '#7A8799'
  }
}

function CategoryIcon({ categoria }: { categoria: Expense['categoria'] }) {
  if (categoria === 'transporte') {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="1" y="3" width="15" height="13" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M16 8h4l3 3v5h-7V8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><circle cx="5.5" cy="18.5" r="2.5" stroke="currentColor" strokeWidth="2" /><circle cx="18.5" cy="18.5" r="2.5" stroke="currentColor" strokeWidth="2" /></svg>
  }
  if (categoria === 'hospedaje') {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
  }
  if (categoria === 'comida') {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><line x1="6" y1="1" x2="6" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><line x1="10" y1="1" x2="10" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><line x1="14" y1="1" x2="14" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
  }
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
}

interface Props {
  groupId: string | null
}

function toExpense(api: BudgetExpenseApi): Expense {
  return {
    id: api.id,
    titulo: api.description,
    categoria: api.category,
    monto: Number(api.amount),
    pagadoPor: api.paid_by_name,
    paidByUserId: api.paid_by_user_id,
    splitType: api.split_type,
    fecha: api.expense_date,
    memberIds: api.splits.map((split) => split.user_id),
    splitAmounts: Object.fromEntries(api.splits.map((split) => [split.user_id, split.share])),
  }
}

export const BudgetDashboard: FC<Props> = ({ groupId }) => {
  const { accessToken, localUser } = useAuth()
  const { socket } = useSocket(accessToken)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [members, setMembers] = useState<BudgetMember[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [view, setView] = useState<'dashboard' | 'wallet'>('dashboard')
  const [totalBudget, setTotalBudget] = useState(INITIAL_BUDGET)
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [adjustValue, setAdjustValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [savingExpense, setSavingExpense] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reloadBudget = useCallback(async () => {
    if (!groupId || !accessToken) return
    try {
      setLoading(true)
      setError(null)
      const dashboard = await budgetService.getDashboard(groupId, accessToken)
      setTotalBudget(Number(dashboard.totalBudget ?? 0))
      setMembers(dashboard.members ?? [])
      setExpenses((dashboard.expenses ?? []).map(toExpense))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar finanzas')
    } finally {
      setLoading(false)
    }
  }, [groupId, accessToken])

  useEffect(() => {
    void reloadBudget()
  }, [reloadBudget])

  useGroupRealtimeRefresh({
    socket,
    groupId,
    onRefresh: async (payload) => {
      const tipo = String(payload.tipo ?? '')
      if (!tipo || tipo.includes('finanzas') || tipo.includes('gasto') || tipo.includes('presupuesto') || tipo.includes('propuesta')) {
        await reloadBudget()
      }
    },
  })

  const comprometido = expenses.reduce((sum, e) => sum + e.monto, 0)
  const disponible = totalBudget - comprometido
  const isOverBudget = totalBudget > 0 && comprometido > totalBudget
  const pct = totalBudget > 0 ? Math.min((comprometido / totalBudget) * 100, 100) : 0
  const barColor = pct < 70 ? '#35C56A' : pct < 90 ? '#F59E0B' : '#EF4444'
  const barLabel = totalBudget <= 0 ? 'Presupuesto pendiente por definir' : pct < 70 ? 'Presupuesto saludable' : pct < 90 ? 'Atención: presupuesto al límite' : 'Presupuesto excedido'

  const myRole = getCurrentGroup()?.myRole ?? 'viajero'
  const currentUserId = localUser?.id_usuario ? String(localUser.id_usuario) : ''
  const canCreateExpenses = Boolean(currentUserId)
  const canAdjustBudget = myRole === 'admin'
  const canManageExpense = (expense: Expense) => myRole === 'admin' || String(expense.paidByUserId) === currentUserId

  const categoryTotals = useMemo(() => ({
    transporte: expenses.filter(e => e.categoria === 'transporte').reduce((s, e) => s + e.monto, 0),
    hospedaje: expenses.filter(e => e.categoria === 'hospedaje').reduce((s, e) => s + e.monto, 0),
    actividad: expenses.filter(e => e.categoria === 'actividad').reduce((s, e) => s + e.monto, 0),
    comida: expenses.filter(e => e.categoria === 'comida').reduce((s, e) => s + e.monto, 0),
  }), [expenses])

  const buildPayload = (expense: Expense): SaveExpensePayload => ({
    group_id: groupId ?? '',
    paid_by_user_id: expense.paidByUserId,
    amount: expense.monto,
    description: expense.titulo,
    category: expense.categoria,
    split_type: expense.splitType,
    expense_date: expense.fecha,
    member_ids: expense.memberIds?.length ? expense.memberIds : members.map((member) => member.id),
    split_amounts: expense.splitAmounts,
  })

  const handleSaveExpense = async (expense: Expense) => {
    if (!groupId || !accessToken || savingExpense) return
    try {
      setSavingExpense(true)
      setError(null)
      const payload = buildPayload(expense)
      if (editingExpense) {
        await budgetService.updateExpense(editingExpense.id, payload, accessToken)
      } else {
        await budgetService.createExpense(payload, accessToken)
      }
      setShowModal(false)
      setEditingExpense(null)
      await reloadBudget()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el gasto')
    } finally {
      setSavingExpense(false)
    }
  }

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!groupId || !accessToken) return
    if (window.confirm('¿Eliminar este gasto? Esta acción no se puede deshacer.')) {
      try {
        setError(null)
        await budgetService.deleteExpense(groupId, id, accessToken)
        await reloadBudget()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo eliminar el gasto')
      }
    }
  }

  const handleAdjustBudget = async () => {
    if (!groupId || !accessToken) return
    const val = parseFloat(adjustValue)
    if (!isNaN(val) && val >= 0) {
      await budgetService.updateGroupBudget(groupId, val, accessToken)
      setTotalBudget(val)
      setShowAdjustModal(false)
      setAdjustValue('')
      await reloadBudget()
    }
  }

  if (view === 'wallet') return <MyWalletView onBack={() => setView('dashboard')} />

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-[#F4F6F8]">
      <div className="bg-[#1E0A4E] px-6 pt-6 pb-8">
        <p className="mb-1 font-body text-sm text-white/60">Presupuesto del viaje</p>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-heading text-2xl font-bold text-white">Finanzas del Grupo</h1>
          {canAdjustBudget && (
            <button onClick={() => { setAdjustValue(String(totalBudget)); setShowAdjustModal(true) }} className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 font-body text-xs font-medium text-white/80 transition-colors hover:bg-white/20">
              Ajustar presupuesto
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border-[0.5px] border-[#E2E8F0] bg-white px-3 py-3"><p className="mb-1 font-body text-[10px] text-[#7A8799]">Total Viaje</p><p className="font-heading text-base font-bold text-[#3D4A5C]">{formatMXN(totalBudget)}</p></div>
          <div className={["rounded-xl border-[0.5px] px-3 py-3", isOverBudget ? 'border-[#EF4444] bg-[#EF4444]' : 'border-[#E2E8F0] bg-white'].join(' ')}><p className={['mb-1 font-body text-[10px]', isOverBudget ? 'text-white' : 'text-[#7A8799]'].join(' ')}>Comprometido</p><p className={['font-heading text-base font-bold', isOverBudget ? 'text-white' : 'text-[#EF4444]'].join(' ')}>{formatMXN(comprometido)}</p></div>
          <div className="rounded-xl border-[0.5px] border-[#E2E8F0] bg-white px-3 py-3"><p className="mb-1 font-body text-[10px] text-[#7A8799]">Disponible</p><p className="font-heading text-base font-bold text-[#35C56A]">{formatMXN(disponible)}</p></div>
        </div>
      </div>

      {isOverBudget && <div className="bg-[#B91C1C] px-6 py-3"><p className="font-body font-semibold text-white" style={{ fontSize: '14px' }}>¡Presupuesto excedido!</p></div>}

      <div className="border-b border-[#E2E8F0] bg-white px-6 py-4">
        <div className="mb-2 flex items-center justify-between"><span className="font-body text-xs text-[#7A8799]">Comprometido del total</span><span className="font-body text-xs font-semibold" style={{ color: barColor }}>{pct.toFixed(1)}%</span></div>
        <div className="h-2.5 overflow-hidden rounded-full bg-[#E2E8F0]"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: barColor }} /></div>
        <p className="mt-1.5 font-body text-[11px] text-[#7A8799]">{barLabel}</p>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-6 py-5">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-body text-sm text-red-700">{error}</div>}
        {loading && <div className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 font-body text-sm text-[#7A8799]">Actualizando finanzas...</div>}

        <div className="flex gap-3">
          {canCreateExpenses && <button onClick={() => { setEditingExpense(null); setShowModal(true) }} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1E6FD9] py-3 font-body text-sm font-semibold text-white transition-colors hover:bg-[#2C8BE6]">Registrar gasto</button>}
          <button onClick={() => setView('wallet')} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#1E6FD9] py-3 font-body text-sm font-semibold text-[#1E6FD9] transition-colors hover:bg-[#1E6FD9]/5">Mi Cartera</button>
        </div>

        <div>
          <h2 className="mb-3 font-heading text-sm font-bold text-[#3D4A5C]">Gastos del grupo</h2>
          <div className="flex flex-col gap-2">
            {expenses.length === 0 && <p className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-6 text-center font-body text-sm text-[#7A8799]">Aún no hay gastos registrados.</p>}
            {expenses.map((expense) => (
              <div key={expense.id} className="flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${categoryColor(expense.categoria)}18`, color: categoryColor(expense.categoria) }}><CategoryIcon categoria={expense.categoria} /></div>
                <div className="min-w-0 flex-1"><p className="truncate font-body text-sm font-semibold text-[#3D4A5C]">{expense.titulo}</p><p className="font-body text-xs text-[#7A8799]">Pagó {expense.pagadoPor} · {expense.fecha}</p></div>
                <span className="shrink-0 font-heading text-sm font-bold text-[#3D4A5C]">{formatMXN(expense.monto)}</span>
                {canManageExpense(expense) && <button onClick={() => openEdit(expense)} aria-label="Editar gasto" className="shrink-0 rounded-lg p-1.5 text-[#7A8799] transition-colors hover:bg-[#F4F6F8] hover:text-[#1E6FD9]">Editar</button>}
                {canManageExpense(expense) && <button onClick={() => void handleDelete(expense.id)} aria-label="Eliminar gasto" className="shrink-0 rounded-lg p-1.5 text-[#7A8799] transition-colors hover:bg-[#FEF2F2] hover:text-[#EF4444]">Eliminar</button>}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5 rounded-2xl border border-[#E2E8F0] bg-white p-4">
          <div>
            <h3 className="mb-3 font-heading text-sm font-bold text-[#3D4A5C]">Participantes</h3>
            <div className="flex flex-wrap gap-2">
              {members.map((member) => <div key={member.id} className="flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-[#F4F6F8] px-3 py-1.5"><div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1E0A4E] font-heading text-[10px] font-bold text-white">{member.nombre[0] ?? '?'}</div><span className="font-body text-xs text-[#3D4A5C]">{member.nombre}</span></div>)}
            </div>
          </div>

          <div>
            <h3 className="mb-3 font-heading text-sm font-bold text-[#3D4A5C]">Presupuesto Grupal</h3>
            <div className="flex flex-col gap-2.5">
              {([{ label: 'Vuelos', categoria: 'transporte' }, { label: 'Hospedaje', categoria: 'hospedaje' }, { label: 'Actividades', categoria: 'actividad' }, { label: 'Comida', categoria: 'comida' }] as { label: string; categoria: keyof typeof categoryTotals }[]).map(({ label, categoria }) => (
                <div key={categoria} className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${categoryColor(categoria)}18`, color: categoryColor(categoria) }}><CategoryIcon categoria={categoria} /></span><span className="font-body text-xs text-[#7A8799]">{label}</span></div><span className="font-body text-xs font-semibold text-[#3D4A5C]">{formatMXN(categoryTotals[categoria])}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <RegisterExpenseModal open={showModal} members={members} editingExpense={editingExpense} saving={savingExpense} onClose={() => { if (!savingExpense) { setShowModal(false); setEditingExpense(null) } }} onSave={(expense) => void handleSaveExpense(expense)} />

      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(13,8,32,0.75)' }} onClick={() => setShowAdjustModal(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 font-heading text-lg font-bold text-[#1E0A4E]">Ajustar presupuesto total</h2>
            <label className="mb-1.5 block font-body text-sm font-medium text-[#3D4A5C]">Nuevo presupuesto (MXN)</label>
            <div className="relative mb-4"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-body text-sm text-[#7A8799]">$</span><input type="number" min="0" value={adjustValue} onChange={(e) => setAdjustValue(e.target.value)} placeholder="0.00" autoFocus className="w-full rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] py-3 pl-7 pr-4 font-body text-sm text-[#3D4A5C] outline-none transition-colors focus:border-[#1E6FD9]" /></div>
            <div className="flex gap-3"><button onClick={() => setShowAdjustModal(false)} className="flex-1 rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] py-3 font-body text-sm font-semibold text-[#7A8799] transition-colors hover:border-[#3D4A5C] hover:text-[#3D4A5C]">Cancelar</button><button onClick={() => void handleAdjustBudget()} disabled={!adjustValue || parseFloat(adjustValue) < 0} className="flex-1 rounded-xl bg-[#1E6FD9] py-3 font-body text-sm font-semibold text-white transition-colors hover:bg-[#2C8BE6] disabled:cursor-not-allowed disabled:opacity-40">Guardar</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
