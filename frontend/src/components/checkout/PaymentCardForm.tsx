import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { SimulatedCheckoutPayload } from '../../services/checkout'

type Mode = 'vuelo' | 'hospedaje'

export function PaymentCardForm({
  mode,
  loading,
  defaultEmail,
  onSubmit,
}: {
  mode: Mode
  loading: boolean
  defaultEmail?: string
  onSubmit: (payload: SimulatedCheckoutPayload) => Promise<void> | void
}) {
  const [cardHolder, setCardHolder] = useState('')
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242')
  const [expirationMonth, setExpirationMonth] = useState('12')
  const [expirationYear, setExpirationYear] = useState('30')
  const [cvv, setCvv] = useState('123')
  const [email, setEmail] = useState(defaultEmail ?? '')
  const [phone, setPhone] = useState('')
  const [mainPerson, setMainPerson] = useState('')
  const [notes, setNotes] = useState('')

  const helperText = useMemo(() => {
    if (mode === 'vuelo') return 'Datos del pasajero principal y pago simulado.'
    return 'Datos del huésped principal y reserva simulada.'
  }, [mode])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const person = {
      fullName: mainPerson.trim() || cardHolder.trim(),
      documentNumber: null,
    }

    onSubmit({
      cardHolder,
      cardNumber,
      expirationMonth,
      expirationYear,
      cvv,
      email,
      phone: phone || null,
      passengers: mode === 'vuelo' ? [person] : undefined,
      guests: mode === 'hospedaje' ? [person] : undefined,
      notes: notes || null,
    })
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-xl shadow-[#1E0A4E]/10 backdrop-blur">
      <div>
        <p className="font-body text-xs font-bold uppercase tracking-[0.2em] text-[#1E6FD9]">
          Pago simulado
        </p>
        <h2 className="mt-1 font-heading text-xl font-bold text-[#1E0A4E]">
          Confirmar {mode === 'vuelo' ? 'compra' : 'reserva'}
        </h2>
        <p className="mt-1 font-body text-sm text-[#64748B]">{helperText}</p>
      </div>

      <div className="mt-5 rounded-3xl bg-gradient-to-br from-[#1E0A4E] via-[#31206E] to-[#1E6FD9] p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <span className="font-body text-xs uppercase tracking-[0.25em] text-white/70">ITHERA Card</span>
          <span className="rounded-full bg-white/15 px-3 py-1 font-body text-[10px] font-bold uppercase tracking-wide">Demo</span>
        </div>
        <p className="mt-8 font-mono text-lg tracking-[0.2em]">{cardNumber || '•••• •••• •••• ••••'}</p>
        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <p className="font-body text-[10px] uppercase text-white/50">Titular</p>
            <p className="font-body text-sm font-semibold">{cardHolder || 'Nombre del titular'}</p>
          </div>
          <p className="font-mono text-sm">{expirationMonth}/{expirationYear}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Field label="Titular de la tarjeta" value={cardHolder} onChange={setCardHolder} placeholder="Eduardo Pérez" required />
        <Field label={mode === 'vuelo' ? 'Pasajero principal' : 'Huésped principal'} value={mainPerson} onChange={setMainPerson} placeholder="Puede ser el mismo titular" />
        <Field label="Número de tarjeta demo" value={cardNumber} onChange={setCardNumber} placeholder="4242 4242 4242 4242" required />
        <div className="grid grid-cols-3 gap-2">
          <Field label="Mes" value={expirationMonth} onChange={setExpirationMonth} placeholder="12" required />
          <Field label="Año" value={expirationYear} onChange={setExpirationYear} placeholder="30" required />
          <Field label="CVV" value={cvv} onChange={setCvv} placeholder="123" required />
        </div>
        <Field label="Correo de confirmación" type="email" value={email} onChange={setEmail} placeholder="correo@ejemplo.com" required />
        <Field label="Teléfono" value={phone} onChange={setPhone} placeholder="Opcional" />
      </div>

      <label className="mt-3 block font-body text-xs font-bold text-[#1E0A4E]">
        Notas
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Preferencias o comentarios para el comprobante..."
          className="mt-1 min-h-20 w-full rounded-2xl border border-[#E2E8F0] bg-white px-3 py-2 font-body text-sm text-[#1E0A4E] outline-none transition focus:border-[#1E6FD9] focus:ring-4 focus:ring-[#1E6FD9]/10"
        />
      </label>

      <div className="mt-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 font-body text-xs text-[#64748B]">
        Tarjetas demo: <b>4242 4242 4242 4242</b> aprueba, <b>4000 0000 0000 0002</b> rechaza.
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#1E6FD9] to-[#7A4FD6] px-5 py-3 font-body text-sm font-bold text-white shadow-lg shadow-[#1E6FD9]/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? 'Procesando simulación...' : mode === 'vuelo' ? 'Confirmar compra simulada' : 'Confirmar reserva simulada'}
      </button>
    </form>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  type?: string
}) {
  return (
    <label className="font-body text-xs font-bold text-[#1E0A4E]">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1 w-full rounded-2xl border border-[#E2E8F0] bg-white px-3 py-2 font-body text-sm text-[#1E0A4E] outline-none transition focus:border-[#1E6FD9] focus:ring-4 focus:ring-[#1E6FD9]/10"
      />
    </label>
  )
}
