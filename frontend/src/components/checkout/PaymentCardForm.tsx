import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { SimulatedCheckoutPayload } from '../../services/checkout'

type Mode = 'vuelo' | 'hospedaje'

type ValidationErrors = Partial<Record<'cardHolder' | 'cardNumber' | 'expirationMonth' | 'expirationYear' | 'cvv' | 'email' | 'mainPerson', string>>

const onlyDigits = (value: string) => value.replace(/\D/g, '')

const luhnCheck = (cardNumber: string) => {
  const digits = onlyDigits(cardNumber)
  let sum = 0
  let shouldDouble = false

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index])
    if (shouldDouble) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    shouldDouble = !shouldDouble
  }

  return digits.length >= 13 && digits.length <= 19 && sum % 10 === 0
}

const hasTooManyConsecutiveEqualDigits = (digits: string, limit = 3) => {
  if (!digits) return false
  let streak = 1
  for (let index = 1; index < digits.length; index += 1) {
    streak = digits[index] === digits[index - 1] ? streak + 1 : 1
    if (streak > limit) return true
  }
  return false
}

const isSameDigitRepeated = (digits: string) => /^([0-9])\1+$/.test(digits)

const validateExpiry = (monthValue: string, yearValue: string) => {
  const month = Number(onlyDigits(monthValue))
  const yearDigits = onlyDigits(yearValue)
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const fullYear = yearDigits.length === 2 ? Number(`20${yearDigits}`) : Number(yearDigits)

  if (!Number.isInteger(month) || month < 1 || month > 12) return 'El mes debe estar entre 01 y 12.'
  if (!Number.isInteger(fullYear) || fullYear < currentYear) return 'El año de vencimiento no puede estar vencido.'
  if (fullYear === currentYear && month < currentMonth) return 'La tarjeta no puede estar vencida.'
  if (fullYear > currentYear + 10) return 'Usa una vigencia razonable, máximo 10 años hacia adelante.'
  return null
}

const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())

const formatCardNumber = (value: string) => {
  const digits = onlyDigits(value).slice(0, 19)
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

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
  const [errors, setErrors] = useState<ValidationErrors>({})

  const helperText = useMemo(() => {
    if (mode === 'vuelo') return 'Datos del pasajero principal y método de pago.'
    return 'Datos del huésped principal y método de pago.'
  }, [mode])

  const validateForm = () => {
    const nextErrors: ValidationErrors = {}
    const cleanCard = onlyDigits(cardNumber)
    const cleanCvv = onlyDigits(cvv)
    const expiryError = validateExpiry(expirationMonth, expirationYear)

    if (!cardHolder.trim()) nextErrors.cardHolder = 'Escribe el nombre del titular.'
    if (!mainPerson.trim() && !cardHolder.trim()) nextErrors.mainPerson = 'Escribe el nombre principal.'
    if (!cleanCard) nextErrors.cardNumber = 'Escribe el número de tarjeta.'
    else if (cleanCard.length < 13 || cleanCard.length > 19) nextErrors.cardNumber = 'El número debe tener entre 13 y 19 dígitos.'
    else if (isSameDigitRepeated(cleanCard)) nextErrors.cardNumber = 'No se aceptan tarjetas formadas por un solo dígito repetido.'
    else if (hasTooManyConsecutiveEqualDigits(cleanCard)) nextErrors.cardNumber = 'No se aceptan más de 3 dígitos iguales consecutivos.'
    else if (!luhnCheck(cleanCard)) nextErrors.cardNumber = 'El número no pasa la validación Luhn.'

    if (expiryError) {
      nextErrors.expirationMonth = expiryError
      nextErrors.expirationYear = expiryError
    }

    if (cleanCvv.length < 3 || cleanCvv.length > 4) nextErrors.cvv = 'El CVV debe tener 3 o 4 dígitos.'
    else if (isSameDigitRepeated(cleanCvv)) nextErrors.cvv = 'Por seguridad, no uses un CVV con todos los dígitos iguales.'

    if (!validateEmail(email)) nextErrors.email = 'Escribe un correo válido para recibir los boletos.'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validateForm()) return

    const person = {
      fullName: mainPerson.trim() || cardHolder.trim(),
      documentNumber: null,
    }

    onSubmit({
      cardHolder: cardHolder.trim(),
      cardNumber: onlyDigits(cardNumber),
      expirationMonth: onlyDigits(expirationMonth).padStart(2, '0'),
      expirationYear: onlyDigits(expirationYear),
      cvv: onlyDigits(cvv),
      email: email.trim(),
      phone: phone.trim() || null,
      passengers: mode === 'vuelo' ? [person] : undefined,
      guests: mode === 'hospedaje' ? [person] : undefined,
      notes: notes.trim() || null,
    })
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-xl shadow-[#1E0A4E]/10 backdrop-blur">
      <div>
        <p className="font-body text-xs font-bold uppercase tracking-[0.2em] text-[#1E6FD9]">
          Pago seguro
        </p>
        <h2 className="mt-1 font-heading text-xl font-bold text-[#1E0A4E]">
          Confirmar {mode === 'vuelo' ? 'compra' : 'reserva'}
        </h2>
        <p className="mt-1 font-body text-sm text-[#64748B]">{helperText}</p>
      </div>

      <div className="mt-5 rounded-3xl bg-gradient-to-br from-[#1E0A4E] via-[#31206E] to-[#1E6FD9] p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <span className="font-body text-xs uppercase tracking-[0.25em] text-white/70">ITHERA Card</span>
          <span className="rounded-full bg-white/15 px-3 py-1 font-body text-[10px] font-bold uppercase tracking-wide">Pago</span>
        </div>
        <p className="mt-8 font-mono text-lg tracking-[0.2em]">{cardNumber || '•••• •••• •••• ••••'}</p>
        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <p className="font-body text-[10px] uppercase text-white/50">Titular</p>
            <p className="font-body text-sm font-semibold">{cardHolder || 'Nombre del titular'}</p>
          </div>
          <p className="font-mono text-sm">{expirationMonth || 'MM'}/{expirationYear || 'AA'}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Field label="Titular de la tarjeta" value={cardHolder} onChange={setCardHolder} placeholder="Eduardo Pérez" required error={errors.cardHolder} />
        <Field label={mode === 'vuelo' ? 'Pasajero principal' : 'Huésped principal'} value={mainPerson} onChange={setMainPerson} placeholder="Puede ser el mismo titular" error={errors.mainPerson} />
        <Field label="Número de tarjeta" value={cardNumber} onChange={(value) => setCardNumber(formatCardNumber(value))} placeholder="4242 4242 4242 4242" required error={errors.cardNumber} inputMode="numeric" />
        <div className="grid grid-cols-3 gap-2">
          <Field label="Mes" value={expirationMonth} onChange={(value) => setExpirationMonth(onlyDigits(value).slice(0, 2))} placeholder="12" required error={errors.expirationMonth} inputMode="numeric" />
          <Field label="Año" value={expirationYear} onChange={(value) => setExpirationYear(onlyDigits(value).slice(0, 4))} placeholder="30" required error={errors.expirationYear} inputMode="numeric" />
          <Field label="CVV" value={cvv} onChange={(value) => setCvv(onlyDigits(value).slice(0, 4))} placeholder="123" required error={errors.cvv} inputMode="numeric" />
        </div>
        <Field label="Correo para recibir boletos" type="email" value={email} onChange={setEmail} placeholder="correo@ejemplo.com" required error={errors.email} />
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
        Se valida longitud, dígito verificador Luhn, patrones repetidos, vigencia, CVV y correo antes de generar el PDF.
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#1E6FD9] to-[#7A4FD6] px-5 py-3 font-body text-sm font-bold text-white shadow-lg shadow-[#1E6FD9]/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? 'Procesando...' : mode === 'vuelo' ? 'Confirmar compra' : 'Confirmar reserva'}
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
  error,
  inputMode,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  type?: string
  error?: string
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'search' | 'email' | 'url'
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
        inputMode={inputMode}
        aria-invalid={Boolean(error)}
        className={`mt-1 w-full rounded-2xl border bg-white px-3 py-2 font-body text-sm text-[#1E0A4E] outline-none transition focus:ring-4 ${error ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/10' : 'border-[#E2E8F0] focus:border-[#1E6FD9] focus:ring-[#1E6FD9]/10'}`}
      />
      {error && <span className="mt-1 block font-body text-[11px] font-semibold text-[#EF4444]">{error}</span>}
    </label>
  )
}
