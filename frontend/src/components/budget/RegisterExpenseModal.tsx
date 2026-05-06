/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import type { FC } from 'react'
import type { BudgetMember } from '../../services/budget'
import type { Expense } from './BudgetDashboard'
import type { BudgetMember } from '../../services/budget'

interface Props {
  open: boolean
  members: BudgetMember[]
  editingExpense?: Expense | null
  onClose: () => void
  onSave: (expense: Expense) => void | Promise<void>
  saving?: boolean
}

const CATEGORIES: { value: Expense['categoria']; label: string }[] = [
  { value: 'transporte', label: 'Transporte' },
  { value: 'hospedaje', label: 'Hospedaje' },
  { value: 'actividad', label: 'Actividad' },
  { value: 'comida', label: 'Comida' },
  { value: 'otro', label: 'Otro' },
]

export const RegisterExpenseModal: FC<Props> = ({ open, members, editingExpense, onClose, onSave, saving = false }) => {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState<Expense['categoria']>('transporte')
  const [paidBy, setPaidBy] = useState('')
  const [splitType, setSplitType] = useState<Expense['splitType']>('equitativa')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    const defaultMembers = members.map((member) => member.id)
    if (editingExpense) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAmount(String(editingExpense.monto))
      setDescription(editingExpense.titulo)
      setDate(editingExpense.fecha)
      setCategory(editingExpense.categoria)
      setPaidBy(editingExpense.paidByUserId || members[0]?.id || '')
      setSplitType(editingExpense.splitType ?? 'equitativa')
      setSelectedMembers(editingExpense.memberIds?.length ? editingExpense.memberIds : defaultMembers)
      setSplitAmounts(Object.fromEntries(Object.entries(editingExpense.splitAmounts ?? {}).map(([k, v]) => [k, String(v)])))
    } else {
      setAmount('')
      setDescription('')
      setDate(new Date().toISOString().split('T')[0])
      setCategory('transporte')
      setPaidBy(members[0]?.id ?? '')
      setSplitType('equitativa')
      setSelectedMembers(defaultMembers)
      setSplitAmounts({})
    }
  }, [open, editingExpense, members])

  const totalAmount = parseFloat(amount) || 0
  const selectedMemberSet = useMemo(() => new Set(selectedMembers), [selectedMembers])
  const splitSum = splitType === 'personalizada'
    ? selectedMembers.reduce((sum, memberId) => sum + (parseFloat(splitAmounts[memberId] ?? '0') || 0), 0)
    : totalAmount
  const splitValid = splitType === 'equitativa' || Math.abs(splitSum - totalAmount) < 0.02

  if (!open) return null

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) => {
      if (prev.includes(memberId)) return prev.length > 1 ? prev.filter((id) => id !== memberId) : prev
      return [...prev, memberId]
    })
  }

  const handleSubmit = () => {
    if (saving || !description.trim() || totalAmount <= 0 || !paidBy || selectedMembers.length === 0 || !splitValid) return
    void onSave({
      id: editingExpense?.id ?? crypto.randomUUID(),
      titulo: description.trim(),
      categoria: category,
      monto: Math.round(totalAmount * 100) / 100,
      pagadoPor: members.find((member) => member.id === paidBy)?.nombre ?? 'Sin nombre',
      paidByUserId: paidBy,
      splitType,
      fecha: date,
      memberIds: selectedMembers,
      splitAmounts: splitType === 'personalizada'
        ? Object.fromEntries(selectedMembers.map((memberId) => [memberId, parseFloat(splitAmounts[memberId] ?? '0') || 0]))
        : undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(13,8,32,0.75)' }} onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 font-heading text-lg font-bold text-[#1E0A4E]">{editingExpense ? 'Editar gasto' : 'Registrar gasto'}</h2>

        <div className="mb-3">
          <label className="mb-1.5 block font-body text-sm font-medium text-[#3D4A5C]">Descripción</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] px-4 py-3 font-body text-sm outline-none focus:border-[#1E6FD9]" placeholder="Ej. Hotel, vuelo, comida..." />
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block font-body text-sm font-medium text-[#3D4A5C]">Monto</label>
            <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] px-4 py-3 font-body text-sm outline-none focus:border-[#1E6FD9]" />
          </div>
          <div>
            <label className="mb-1.5 block font-body text-sm font-medium text-[#3D4A5C]">Fecha</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] px-4 py-3 font-body text-sm outline-none focus:border-[#1E6FD9]" />
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block font-body text-sm font-medium text-[#3D4A5C]">Categoría</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as Expense['categoria'])} className="w-full rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] px-4 py-3 font-body text-sm outline-none focus:border-[#1E6FD9]">
              {CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block font-body text-sm font-medium text-[#3D4A5C]">Pagó</label>
            <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className="w-full rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] px-4 py-3 font-body text-sm outline-none focus:border-[#1E6FD9]">
              {members.map((member) => <option key={member.id} value={member.id}>{member.nombre}</option>)}
            </select>
          </div>
        </div>

        <div className="mb-3">
          <label className="mb-1.5 block font-body text-sm font-medium text-[#3D4A5C]">División</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setSplitType('equitativa')} className={["rounded-xl border py-2 font-body text-sm font-semibold", splitType === 'equitativa' ? 'border-[#1E6FD9] bg-[#1E6FD9]/10 text-[#1E6FD9]' : 'border-[#E2E8F0] text-[#7A8799]'].join(' ')}>Equitativa</button>
            <button type="button" onClick={() => setSplitType('personalizada')} className={["rounded-xl border py-2 font-body text-sm font-semibold", splitType === 'personalizada' ? 'border-[#1E6FD9] bg-[#1E6FD9]/10 text-[#1E6FD9]' : 'border-[#E2E8F0] text-[#7A8799]'].join(' ')}>Personalizada</button>
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-2 block font-body text-sm font-medium text-[#3D4A5C]">Participantes del gasto</label>
          <div className="flex flex-col gap-2">
            {members.map((member) => (
              <label key={member.id} className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] px-3 py-2 font-body text-sm text-[#3D4A5C]">
                <input type="checkbox" checked={selectedMemberSet.has(member.id)} onChange={() => toggleMember(member.id)} />
                <span className="flex-1">{member.nombre}</span>
                {splitType === 'personalizada' && selectedMemberSet.has(member.id) && (
                  <input type="number" min="0" value={splitAmounts[member.id] ?? ''} onChange={(e) => setSplitAmounts((prev) => ({ ...prev, [member.id]: e.target.value }))} className="w-24 rounded-lg border border-[#E2E8F0] bg-white px-2 py-1 text-right text-xs outline-none focus:border-[#1E6FD9]" placeholder="0" />
                )}
              </label>
            ))}
          </div>
          {splitType === 'personalizada' && <p className={["mt-2 font-body text-xs", splitValid ? 'text-[#35C56A]' : 'text-[#EF4444]'].join(' ')}>Suma: ${splitSum.toFixed(2)} / ${totalAmount.toFixed(2)}</p>}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} disabled={saving} className="flex-1 rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] py-3 font-body text-sm font-semibold text-[#7A8799] disabled:cursor-not-allowed disabled:opacity-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving || !description.trim() || totalAmount <= 0 || !paidBy || !splitValid} className="flex-1 rounded-xl bg-[#1E6FD9] py-3 font-body text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}
