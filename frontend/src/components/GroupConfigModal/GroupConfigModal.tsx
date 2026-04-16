import { useState } from 'react'

type GroupConfigModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function GroupConfigModal({
  isOpen,
  onClose,
}: GroupConfigModalProps) {
  const [tripName, setTripName] = useState('Cancún 2025 - Grupo')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [destination, setDestination] = useState('Cancún, México')

  if (!isOpen) return null

  const handleSave = () => {
    console.log('Guardar cambios', {
      tripName,
      startDate,
      endDate,
      destination,
    })
    onClose()
  }

  const handleDelete = () => {
    console.log('Eliminar viaje completo')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 px-4">
      <div className="w-full max-w-md rounded-[24px] bg-white p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-[28px] font-bold leading-none text-[#0D1117]">
            Configuración del grupo
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#98A2B3] transition hover:bg-[#F2F4F7] hover:text-[#3D4A5C]"
            aria-label="Cerrar modal"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#344054]">
              Nombre del viaje
            </label>
            <input
              type="text"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 text-sm text-[#3D4A5C] outline-none transition focus:border-[#1E6FD9]"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#344054]">
                Fecha de inicio
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 text-sm text-[#3D4A5C] outline-none transition focus:border-[#1E6FD9]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#344054]">
                Fecha de fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 text-sm text-[#3D4A5C] outline-none transition focus:border-[#1E6FD9]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#344054]">
              Destino
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 text-sm text-[#3D4A5C] outline-none transition focus:border-[#1E6FD9]"
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="mt-1 h-12 w-full rounded-xl bg-[#1E6FD9] text-sm font-semibold text-white transition hover:bg-[#2C8BE6]"
          >
            Guardar cambios
          </button>

          <div className="relative py-2">
            <div className="border-t border-[#E4E7EC]" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs text-[#98A2B3]">
              Zona peligrosa
            </span>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            className="h-12 w-full rounded-xl bg-[#EF4444] text-sm font-semibold text-white transition hover:opacity-90"
          >
            Eliminar viaje completo
          </button>

          <p className="text-center text-xs text-[#98A2B3]">
            Esta acción no se puede deshacer.
          </p>
        </div>
      </div>
    </div>
  )
}