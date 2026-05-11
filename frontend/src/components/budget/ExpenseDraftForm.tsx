import type { FC } from 'react'
import type { BudgetCategory, BudgetSplitType } from '../../services/budget'

export interface ExpenseDraftMemberOption {
  id: string
  label: string
}

interface Props {
  amount: string
  description: string
  date: string
  category: BudgetCategory
  paidBy: string
  splitType: BudgetSplitType
  splitAmounts: Record<string, string>
  selectedMemberIds: string[]
  members: ExpenseDraftMemberOption[]
  onAmountChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onDateChange: (value: string) => void
  onCategoryChange: (value: BudgetCategory) => void
  onPaidByChange: (value: string) => void
  onSplitTypeChange: (value: BudgetSplitType) => void
  onSplitAmountChange: (memberId: string, value: string) => void
  onToggleMember: (memberId: string) => void
}

const CATEGORY_OPTIONS: Array<{ value: BudgetCategory; label: string }> = [
  { value: 'transporte', label: 'Transporte' },
  { value: 'hospedaje', label: 'Hospedaje' },
  { value: 'actividad', label: 'Actividad' },
  { value: 'comida', label: 'Comida' },
  { value: 'otro', label: 'Otro' },
]

export const ExpenseDraftForm: FC<Props> = ({
  amount,
  description,
  date,
  category,
  paidBy,
  splitType,
  splitAmounts,
  selectedMemberIds,
  members,
  onAmountChange,
  onDescriptionChange,
  onDateChange,
  onCategoryChange,
  onPaidByChange,
  onSplitTypeChange,
  onSplitAmountChange,
  onToggleMember,
}) => {
  const totalAmount = parseFloat(amount) || 0
  const activeMembers = members.filter((member) => selectedMemberIds.includes(member.id))
  const splitSum =
    splitType === 'personalizada'
      ? activeMembers.reduce((sum, member) => sum + (parseFloat(splitAmounts[member.id] ?? '0') || 0), 0)
      : totalAmount
  const splitError =
    splitType === 'personalizada' && totalAmount > 0 && Math.abs(splitSum - totalAmount) > 0.01
      ? `La suma de los montos ($${Math.round(splitSum)}) no coincide con el total ($${Math.round(totalAmount)})`
      : null

  return (
    <div className="grid gap-4">
      <div>
        <label className="mb-1.5 block font-body text-sm font-medium text-[#3D4A5C]">Monto</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-body text-sm text-[#7A8799]">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            placeholder="0.00"
            className="w-full rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] py-3 pl-7 pr-4 font-body text-sm text-[#3D4A5C] outline-none transition-colors focus:border-[#1E6FD9]"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block font-body text-sm font-medium text-[#3D4A5C]">Descripcion</label>
        <input
          type="text"
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="ej. Vuelos, Hotel, Tour..."
          className="w-full rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] px-4 py-3 font-body text-sm text-[#3D4A5C] outline-none transition-colors focus:border-[#1E6FD9]"
        />
      </div>

      <div>
        <label className="mb-1.5 block font-body text-sm font-medium text-[#3D4A5C]">Fecha</label>
        <input
          type="date"
          value={date}
          onChange={(event) => onDateChange(event.target.value)}
          className="w-full rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] px-4 py-3 font-body text-sm text-[#3D4A5C] outline-none transition-colors focus:border-[#1E6FD9]"
        />
      </div>

      <div>
        <label className="mb-1.5 block font-body text-sm font-medium text-[#3D4A5C]">Categoria</label>
        <select
          value={category}
          onChange={(event) => onCategoryChange(event.target.value as BudgetCategory)}
          className="w-full rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] px-4 py-3 font-body text-sm text-[#3D4A5C] outline-none transition-colors focus:border-[#1E6FD9]"
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block font-body text-sm font-medium text-[#3D4A5C]">Pagador</label>
        <select
          value={paidBy}
          onChange={(event) => onPaidByChange(event.target.value)}
          className="w-full rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] px-4 py-3 font-body text-sm text-[#3D4A5C] outline-none transition-colors focus:border-[#1E6FD9]"
        >
          {activeMembers.map((member) => (
            <option key={member.id} value={member.id}>{member.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block font-body text-sm font-medium text-[#3D4A5C]">Personas del gasto</label>
        <div className="flex flex-wrap gap-2 rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] px-3 py-3">
          {members.map((member) => {
            const selected = selectedMemberIds.includes(member.id)
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => onToggleMember(member.id)}
                className={[
                  'rounded-full border px-3 py-1.5 font-body text-xs font-semibold transition-colors',
                  selected
                    ? 'border-[#1E6FD9] bg-[#1E6FD9] text-white'
                    : 'border-[#E2E8F0] bg-white text-[#7A8799]',
                ].join(' ')}
              >
                {member.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block font-body text-sm font-medium text-[#3D4A5C]">Tipo de Division</label>
        <div className="flex gap-2">
          {(['equitativa', 'personalizada'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onSplitTypeChange(value)}
              className={[
                'flex-1 rounded-xl border py-2.5 font-body text-sm font-medium transition-colors',
                splitType === value
                  ? 'border-[#1E6FD9] bg-[#1E6FD9] text-white'
                  : 'border-[#E2E8F0] bg-[#F4F6F8] text-[#7A8799]',
              ].join(' ')}
            >
              {value === 'equitativa' ? 'Equitativa' : 'Personalizada'}
            </button>
          ))}
        </div>
      </div>

      {splitType === 'personalizada' && (
        <div className="flex flex-col gap-2 rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] px-4 py-3">
          <p className="font-body text-xs font-medium text-[#7A8799]">Monto por persona</p>
          {activeMembers.map((member) => (
            <div key={member.id} className="flex items-center gap-3">
              <span className="w-28 shrink-0 font-body text-sm text-[#3D4A5C]">{member.label}</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-body text-sm text-[#7A8799]">$</span>
                <input
                  type="number"
                  min="0"
                  value={splitAmounts[member.id] ?? ''}
                  onChange={(event) => onSplitAmountChange(member.id, event.target.value)}
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
  )
}
