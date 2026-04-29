import { useEffect, useState } from 'react'
import type { FC } from 'react'
import type { Expense } from './BudgetDashboard'

interface Props {
  open: boolean
  members: string[]
  editingExpense?: Expense | null
  onClose: () => void
  onSave: (expense: Expense) => void
}

const CATEGORIES: { value: Expense['categoria']; label: string }[] = [
  { value: 'transporte', label: 'Transporte' },
  { value: 'hospedaje', label: 'Hospedaje' },
  { value: 'actividad', label: 'Actividad' },
  { value: 'comida', label: 'Comida' },
  { value: 'otro', label: 'Otro' },
]

export const RegisterExpenseModal: FC<Props> = ({ open, members, editingExpense, onClose, onSave }) => {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Expense['categoria']>('transporte')
  const [paidBy, setPaidBy] = useState(members[0] ?? '')
  const [splitType, setSplitType] = useState<Expense['splitType']>('equitativa')
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    if (editingExpense) {
      setAmount(String(editingExpense.monto))
      setDescription(editingExpense.titulo)
      setCategory(editingExpense.categoria)
      setPaidBy(editingExpense.pagadoPor)
      setSplitType(editingExpense.splitType ?? 'equitativa')
      setSplitAmounts(
        Object.fromEntries(
          Object.entries(editingExpense.splitAmounts ?? {}).map(([k, v]) => [k, String(v)])
        )
      )
    } else {
      setAmount('')
      setDescription('')
      setCategory('transporte')
      setPaidBy(members[0] ?? '')
      setSplitType('equitativa')
      setSplitAmounts({})
    }
  }, [open, editingExpense])

  if (!open) return null

  const totalAmount = parseFloat(amount) || 0
  const splitSum =
    splitType === 'personalizada'
      ? members.reduce((sum, m) => sum + (parseFloat(splitAmounts[m] ?? '0') || 0), 0)
      : totalAmount
  const splitError =
    splitType === 'personalizada' && totalAmount > 0 && Math.abs(splitSum - totalAmount) > 0.01
      ? `La suma de los montos ($${Math.round(splitSum)}) no coincide con el total ($${Math.round(totalAmount)})`
      : null
  const isValid = totalAmount > 0 && description.trim().length > 0 && splitError === null

  const handleSave = () => {
    if (!isValid) return

    const parsedSplitAmounts: Record<string, number> | undefined =
      splitType === 'personalizada'
        ? Object.fromEntries(members.map((m) => [m, parseFloat(splitAmounts[m] ?? '0') || 0]))
        : undefined

    const expense: Expense = {
      id: editingExpense ? editingExpense.id : crypto.randomUUID(),
      titulo: description.trim(),
      categoria: category,
      monto: totalAmount,
      pagadoPor: paidBy,
      splitType,
      fecha: editingExpense ? editingExpense.fecha : new Date().toISOString().split('T')[0],
      ...(parsedSplitAmounts !== undefined && { splitAmounts: parsedSplitAmounts }),
    }

    if (editingExpense) {
      console.log('Gasto editado:', expense)
    } else {
      console.log('Gasto registrado:', expense)
    }

    onSave(expense)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(13,8,32,0.75)' }}
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-lg flex-col rounded-t-3xl bg-white max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — siempre visible */}
        <div className="shrink-0 px-6 pt-6">
          <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-[#E2E8F0]" />

          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-[#1E0A4E]">
              {editingExpense ? 'Editar gasto' : 'Registrar gasto'}
            </h2>
            <button onClick={onClose} className="text-[#7A8799] transition-colors hover:text-[#3D4A5C]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Cuerpo scrolleable */}
        <div className="flex-1 overflow-y-auto px-6">
          <div className="flex flex-col gap-4 pb-2">
            <div>
              <label className="mb-1.5 block font-body text-sm font-medium text-[#3D4A5C]">Monto</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-body text-sm text-[#7A8799]">$</span>
                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] py-3 pl-7 pr-4 font-body text-sm text-[#3D4A5C] outline-none transition-colors focus:border-[#1E6FD9]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block font-body text-sm font-medium text-[#3D4A5C]">Descripción</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ej. Vuelos, Hotel, Tour..."
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] px-4 py-3 font-body text-sm text-[#3D4A5C] outline-none transition-colors focus:border-[#1E6FD9]"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-body text-sm font-medium text-[#3D4A5C]">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Expense['categoria'])}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] px-4 py-3 font-body text-sm text-[#3D4A5C] outline-none transition-colors focus:border-[#1E6FD9]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block font-body text-sm font-medium text-[#3D4A5C]">Pagador</label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] px-4 py-3 font-body text-sm text-[#3D4A5C] outline-none transition-colors focus:border-[#1E6FD9]"
              >
                {members.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block font-body text-sm font-medium text-[#3D4A5C]">Tipo de División</label>
              <div className="flex gap-2">
                {(['equitativa', 'personalizada'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSplitType(type)}
                    className={[
                      'flex-1 rounded-xl border py-2.5 font-body text-sm font-medium transition-colors',
                      splitType === type
                        ? 'border-[#1E6FD9] bg-[#1E6FD9] text-white'
                        : 'border-[#E2E8F0] bg-[#F4F6F8] text-[#7A8799] hover:border-[#1E6FD9]/50',
                    ].join(' ')}
                  >
                    {type === 'equitativa' ? 'Equitativa' : 'Personalizada'}
                  </button>
                ))}
              </div>
            </div>

            {splitType === 'personalizada' && (
              <div className="flex flex-col gap-2 rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] px-4 py-3">
                <p className="font-body text-xs font-medium text-[#7A8799]">Monto por persona</p>
                {members.map((member) => (
                  <div key={member} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 font-body text-sm text-[#3D4A5C]">{member}</span>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-body text-sm text-[#7A8799]">$</span>
                      <input
                        type="number"
                        min="0"
                        value={splitAmounts[member] ?? ''}
                        onChange={(e) => setSplitAmounts((prev) => ({ ...prev, [member]: e.target.value }))}
                        placeholder="0"
                        className="w-full rounded-lg border border-[#E2E8F0] bg-white py-2 pl-6 pr-3 font-body text-sm text-[#3D4A5C] outline-none transition-colors focus:border-[#1E6FD9]"
                      />
                    </div>
                  </div>
                ))}
                {splitError && (
                  <p className="mt-1 font-body text-xs text-[#EF4444]">{splitError}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer — siempre visible */}
        <div className="shrink-0 px-6 pb-8 pt-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] py-3.5 font-body text-sm font-semibold text-[#7A8799] transition-colors hover:border-[#3D4A5C] hover:text-[#3D4A5C]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isValid}
              className="flex-1 rounded-xl bg-[#1E6FD9] py-3.5 font-body text-sm font-semibold text-white transition-colors hover:bg-[#2C8BE6] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Guardar gasto
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
