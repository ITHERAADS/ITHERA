import { useState } from 'react'
import { Navbar } from '../../components/layout/Navbar/Navbar'

// ── Types ─────────────────────────────────────────────────────────────────────
type Step = 'email' | 'code' | 'newPassword' | 'success'

// ── Sub-components ────────────────────────────────────────────────────────────

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 font-body text-sm text-[#7A8799] hover:text-[#1E0A4E] transition-colors mb-8"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <polyline points="15 18 9 12 15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      Volver
    </button>
  )
}

function InputField({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  autoComplete,
}: {
  label: string
  type?: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  error?: string
  autoComplete?: string
}) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-body text-xs text-[#7A8799] uppercase tracking-wider">{label}</label>
      <div className="relative">
        <input
          type={isPassword && show ? 'text' : type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className={`w-full font-body text-sm text-[#1E0A4E] placeholder-[#C4CDD6] border rounded-xl px-4 py-3 outline-none transition-all duration-200 bg-white
            ${error
              ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
              : 'border-[#E2E8F0] focus:border-[#1E6FD9] focus:ring-2 focus:ring-[#1E6FD9]/10'
            }
            ${isPassword ? 'pr-11' : ''}
          `}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A8799] hover:text-[#1E0A4E] transition-colors"
          >
            {show ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
              </svg>
            )}
          </button>
        )}
      </div>
      {error && <p className="font-body text-xs text-red-500">{error}</p>}
    </div>
  )
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  loading,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full font-body font-medium text-sm bg-[#1E6FD9] text-white rounded-xl px-6 py-3.5 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {loading && (
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
          <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {children}
    </button>
  )
}

// ── Step 1: Email ─────────────────────────────────────────────────────────────
function StepEmail({ onNext, onBack }: { onNext: (email: string) => void; onBack: () => void }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!email.trim()) return setError('Ingresa tu correo electrónico.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('El correo no es válido.')
    setError('')
    setLoading(true)
    // Simular llamada API
    await new Promise((r) => setTimeout(r, 1200))
    setLoading(false)
    onNext(email)
  }

  return (
    <div>
      <BackButton onClick={onBack} />

      <div className="mb-8">
        <div className="w-12 h-12 bg-[#1E6FD9]/10 rounded-2xl flex items-center justify-center mb-5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-[#1E6FD9]">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="font-heading font-bold text-[#1E0A4E] text-2xl mb-2">¿Olvidaste tu contraseña?</h1>
        <p className="font-body text-sm text-[#7A8799] leading-relaxed">
          Ingresa tu correo y te enviaremos un código para restablecer tu contraseña.
        </p>
      </div>

      <div className="space-y-5">
        <InputField
          label="Correo electrónico"
          type="email"
          placeholder="tucorreo@ejemplo.com"
          value={email}
          onChange={setEmail}
          error={error}
          autoComplete="email"
        />

        <PrimaryButton onClick={handleSubmit} loading={loading}>
          Enviar código de verificación
        </PrimaryButton>
      </div>

      <p className="font-body text-xs text-[#7A8799] text-center mt-6">
        ¿Recordaste tu contraseña?{' '}
        <a href="/login" className="text-[#1E6FD9] hover:underline">
          Inicia sesión
        </a>
      </p>
    </div>
  )
}

// ── Step 2: Verification Code ─────────────────────────────────────────────────
function StepCode({
  email,
  onNext,
  onBack,
}: {
  email: string
  onNext: () => void
  onBack: () => void
}) {
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const handleChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return
    const newCode = [...code]
    newCode[index] = val.slice(-1)
    setCode(newCode)
    if (val && index < 5) {
      const next = document.getElementById(`code-${index + 1}`)
      next?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prev = document.getElementById(`code-${index - 1}`)
      prev?.focus()
    }
  }

  const handleResend = () => {
    setResendCooldown(60)
    const interval = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) { clearInterval(interval); return 0 }
        return c - 1
      })
    }, 1000)
  }

  const handleVerify = async () => {
    if (code.some((d) => !d)) return setError('Ingresa el código completo de 6 dígitos.')
    setError('')
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1000))
    setLoading(false)
    onNext()
  }

  return (
    <div>
      <BackButton onClick={onBack} />

      <div className="mb-8">
        <div className="w-12 h-12 bg-[#7A4FD6]/10 rounded-2xl flex items-center justify-center mb-5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-[#7A4FD6]">
            <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="font-heading font-bold text-[#1E0A4E] text-2xl mb-2">Verifica tu correo</h1>
        <p className="font-body text-sm text-[#7A8799] leading-relaxed">
          Enviamos un código de 6 dígitos a{' '}
          <span className="font-medium text-[#1E0A4E]">{email}</span>.
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="font-body text-xs text-[#7A8799] uppercase tracking-wider block mb-3">
            Código de verificación
          </label>
          <div className="flex gap-2 justify-between">
            {code.map((digit, i) => (
              <input
                key={i}
                id={`code-${i}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`w-full aspect-square text-center font-heading font-bold text-lg text-[#1E0A4E] border rounded-xl outline-none transition-all duration-200 bg-white
                  ${digit ? 'border-[#1E6FD9] bg-[#1E6FD9]/5' : 'border-[#E2E8F0]'}
                  ${error ? 'border-red-400' : 'focus:border-[#1E6FD9] focus:ring-2 focus:ring-[#1E6FD9]/10'}
                `}
              />
            ))}
          </div>
          {error && <p className="font-body text-xs text-red-500 mt-2">{error}</p>}
        </div>

        <PrimaryButton onClick={handleVerify} loading={loading}>
          Verificar código
        </PrimaryButton>

        <div className="text-center">
          {resendCooldown > 0 ? (
            <p className="font-body text-xs text-[#7A8799]">
              Reenviar código en <span className="text-[#1E0A4E] font-medium">{resendCooldown}s</span>
            </p>
          ) : (
            <button
              onClick={handleResend}
              className="font-body text-xs text-[#1E6FD9] hover:underline"
            >
              No recibí el código — reenviar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Step 3: New Password ──────────────────────────────────────────────────────
function StepNewPassword({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({})
  const [loading, setLoading] = useState(false)

  const requirements = [
    { label: 'Al menos 8 caracteres', met: password.length >= 8 },
    { label: 'Una letra mayúscula', met: /[A-Z]/.test(password) },
    { label: 'Un número', met: /\d/.test(password) },
  ]

  const handleSubmit = async () => {
    const newErrors: typeof errors = {}
    if (password.length < 8) newErrors.password = 'La contraseña debe tener al menos 8 caracteres.'
    if (!/[A-Z]/.test(password)) newErrors.password = 'Incluye al menos una mayúscula.'
    if (!/\d/.test(password)) newErrors.password = 'Incluye al menos un número.'
    if (password !== confirm) newErrors.confirm = 'Las contraseñas no coinciden.'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1200))
    setLoading(false)
    onNext()
  }

  return (
    <div>
      <BackButton onClick={onBack} />

      <div className="mb-8">
        <div className="w-12 h-12 bg-[#35C56A]/10 rounded-2xl flex items-center justify-center mb-5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-[#35C56A]">
            <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="font-heading font-bold text-[#1E0A4E] text-2xl mb-2">Nueva contraseña</h1>
        <p className="font-body text-sm text-[#7A8799] leading-relaxed">
          Elige una contraseña segura para proteger tu cuenta.
        </p>
      </div>

      <div className="space-y-5">
        <InputField
          label="Nueva contraseña"
          type="password"
          placeholder="Mínimo 8 caracteres"
          value={password}
          onChange={setPassword}
          error={errors.password}
          autoComplete="new-password"
        />

        {/* Password strength indicators */}
        {password.length > 0 && (
          <div className="space-y-1.5">
            {requirements.map((req) => (
              <div key={req.label} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${req.met ? 'bg-[#35C56A]' : 'bg-[#E2E8F0]'}`}>
                  {req.met && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                      <polyline points="20 6 9 17 4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className={`font-body text-xs transition-colors ${req.met ? 'text-[#35C56A]' : 'text-[#7A8799]'}`}>
                  {req.label}
                </span>
              </div>
            ))}
          </div>
        )}

        <InputField
          label="Confirmar contraseña"
          type="password"
          placeholder="Repite tu contraseña"
          value={confirm}
          onChange={setConfirm}
          error={errors.confirm}
          autoComplete="new-password"
        />

        <PrimaryButton onClick={handleSubmit} loading={loading}>
          Actualizar contraseña
        </PrimaryButton>
      </div>
    </div>
  )
}

// ── Step 4: Success ───────────────────────────────────────────────────────────
function StepSuccess() {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-[#35C56A]/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-[#35C56A]">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <h1 className="font-heading font-bold text-[#1E0A4E] text-2xl mb-3">¡Contraseña actualizada!</h1>
      <p className="font-body text-sm text-[#7A8799] leading-relaxed mb-8">
        Tu contraseña ha sido cambiada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.
      </p>

      <a
        href="/login"
        className="inline-flex items-center justify-center w-full font-body font-medium text-sm bg-[#1E6FD9] text-white rounded-xl px-6 py-3.5 hover:opacity-90 transition-opacity"
      >
        Ir a iniciar sesión
      </a>
    </div>
  )
}

// ── Progress Indicator ────────────────────────────────────────────────────────
function ProgressDots({ current }: { current: number }) {
  const steps = ['email', 'code', 'newPassword']
  const index = steps.indexOf(current as unknown as string)

  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${i <= index ? 'bg-[#1E6FD9] flex-1' : 'bg-[#E2E8F0] w-8'}`}
        />
      ))}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')

  const stepIndex: Record<Step, number> = { email: 0, code: 1, newPassword: 2, success: 3 }

  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      <Navbar variant="landing" />

      {/* Background subtle pattern */}
      <div
        className="fixed inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(30,10,78,0.04) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="flex items-center justify-center min-h-screen px-4 py-12 pt-32">
      <div className="relative w-full max-w-md">

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-8">
          {/* Progress bar (only for steps 1–3) */}
          {step !== 'success' && (
            <div className="flex gap-1.5 mb-8">
              {(['email', 'code', 'newPassword'] as Step[]).map((s, i) => (
                <div
                  key={s}
                  className={`h-1 rounded-full flex-1 transition-all duration-300 ${
                    i <= stepIndex[step] ? 'bg-[#1E6FD9]' : 'bg-[#E2E8F0]'
                  }`}
                />
              ))}
            </div>
          )}

          {step === 'email' && (
            <StepEmail
              onNext={(e) => { setEmail(e); setStep('code') }}
              onBack={() => window.history.back()}
            />
          )}
          {step === 'code' && (
            <StepCode
              email={email}
              onNext={() => setStep('newPassword')}
              onBack={() => setStep('email')}
            />
          )}
          {step === 'newPassword' && (
            <StepNewPassword
              onNext={() => setStep('success')}
              onBack={() => setStep('code')}
            />
          )}
          {step === 'success' && <StepSuccess />}
        </div>
      </div>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
