import { useState, useRef, useEffect } from 'react'
import { AppLayout } from '../../components/layout/AppLayout'
import { useAuth } from '../../context/useAuth'

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconEdit() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconCamera() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
    </svg>
  )
}

function IconKey() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconBell() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconEye({ show }: { show: boolean }) {
  if (show) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

// ── Sub-components ────────────────────────────────────────────────────────────

const inputBase =
  'w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 font-body text-sm text-[#1E0A4E] placeholder-gray-400 outline-none transition focus:border-[#1E6FD9] focus:ring-2 focus:ring-[#1E6FD9]/20 disabled:bg-[#F8FAFC] disabled:text-gray-400 disabled:cursor-default'

function Field({
  label,
  value,
  onChange,
  disabled,
  type = 'text',
  rightElement,
}: {
  label: string
  value: string
  onChange?: (v: string) => void
  disabled?: boolean
  type?: string
  rightElement?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-body text-xs font-semibold text-[#1E0A4E]/60 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          disabled={disabled}
          className={inputBase + (rightElement ? ' pr-10' : '')}
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-3 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  )
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-[#E2E8F0] last:border-none">
      <div>
        <p className="font-body text-sm font-semibold text-[#1E0A4E]">{label}</p>
        <p className="font-body text-xs text-[#1E0A4E]/50 mt-0.5">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30',
          checked ? 'bg-[#1E6FD9]' : 'bg-gray-200',
        ].join(' ')}
      >
        <span
          className={[
            'pointer-events-none inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0',
          ].join(' ')}
        >
          {checked && <IconCheck />}
        </span>
      </button>
    </div>
  )
}

// ── ProfilePage ───────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { localUser } = useAuth()

  const fullName  = localUser?.nombre ?? 'Usuario'
  const email     = localUser?.email  ?? ''
  const nameParts = fullName.trim().split(/\s+/)

  // ── Personal data state ───────────────────────────────────────────────────
  const [editing, setEditing] = useState(false)
  const [nombre,  setNombre]  = useState(nameParts[0] ?? '')
  const [apPat,   setApPat]   = useState(nameParts[1] ?? '')
  const [apMat,   setApMat]   = useState(nameParts[2] ?? '')
  const [correo,  setCorreo]  = useState(email)

  const [savedName,  setSavedName]  = useState(nombre)
  const [savedApPat, setSavedApPat] = useState(apPat)
  const [savedApMat, setSavedApMat] = useState(apMat)
  const [savedEmail, setSavedEmail] = useState(correo)

  function handleEdit() { setEditing(true) }

  function handleCancel() {
    setNombre(savedName)
    setApPat(savedApPat)
    setApMat(savedApMat)
    setCorreo(savedEmail)
    setEditing(false)
  }

  function handleSave() {
    setSavedName(nombre)
    setSavedApPat(apPat)
    setSavedApMat(apMat)
    setSavedEmail(correo)
    setEditing(false)
  }

  // ── Password state ────────────────────────────────────────────────────────
  const [pwOpen,    setPwOpen]    = useState(false)
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew,     setPwNew]     = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [showPw,    setShowPw]    = useState({ current: false, new: false, confirm: false })
  const [pwError,   setPwError]   = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  function handlePasswordUpdate() {
    setPwError('')
    if (!pwCurrent) { setPwError('Ingresa tu contraseña actual.'); return }
    if (pwNew.length < 8) { setPwError('La nueva contraseña debe tener al menos 8 caracteres.'); return }
    if (pwNew !== pwConfirm) { setPwError('Las contraseñas no coinciden.'); return }
    setPwSuccess(true)
    setPwCurrent('')
    setPwNew('')
    setPwConfirm('')
    setTimeout(() => setPwSuccess(false), 3000)
  }

  // ── Photo state ───────────────────────────────────────────────────────────
  const fileRef = useRef<HTMLInputElement>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPhotoPreview(url)
  }

  useEffect(() => {
    return () => { if (photoPreview) URL.revokeObjectURL(photoPreview) }
  }, [photoPreview])

  // ── Preferences state ─────────────────────────────────────────────────────
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifGroup, setNotifGroup] = useState(true)

  // ── NavUserInfo for AppLayout ─────────────────────────────────────────────
  const displayName = [savedName, savedApPat].filter(Boolean).join(' ') || fullName
  const navUser = {
    name:     displayName,
    role:     'Organizador',
    initials: getInitials(displayName),
    color:    '#1E6FD9',
  }

  const avatarInitials = getInitials(displayName)

  return (
    <AppLayout user={navUser} showRightPanel={false}>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">

          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Avatar / photo */}
            <div className="relative shrink-0">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-white font-heading font-bold text-2xl overflow-hidden"
                style={{ backgroundColor: '#1E6FD9' }}
              >
                {photoPreview
                  ? <img src={photoPreview} alt="Foto de perfil" className="w-full h-full object-cover" />
                  : avatarInitials
                }
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#1E6FD9] text-white rounded-full flex items-center justify-center hover:bg-[#1a5fc2] transition-colors shadow"
                aria-label="Cambiar foto de perfil"
              >
                <IconCamera />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="font-heading font-bold text-[#1E0A4E] text-xl leading-tight">
                {displayName || 'Usuario'}
              </h1>
              <p className="font-body text-sm text-[#1E0A4E]/50 mt-0.5">Organizador</p>
              <p className="font-body text-xs text-[#1E0A4E]/40 mt-1">{savedEmail}</p>
            </div>

            {/* Edit button */}
            {!editing && (
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 bg-[#1E6FD9] text-white font-body text-sm font-semibold rounded-xl px-4 py-2 hover:bg-[#1a5fc2] transition-colors shrink-0"
              >
                <IconEdit />
                Editar perfil
              </button>
            )}
          </div>

          {/* ── Personal data ────────────────────────────────────────────────── */}
          <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h2 className="font-heading font-bold text-[#1E0A4E] text-base">Datos personales</h2>
              {editing && (
                <span className="font-body text-xs text-[#1E6FD9] bg-[#1E6FD9]/10 px-2.5 py-1 rounded-full">
                  Modo edición
                </span>
              )}
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              <Field
                label="Nombre"
                value={nombre}
                onChange={editing ? setNombre : undefined}
                disabled={!editing}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Apellido paterno"
                  value={apPat}
                  onChange={editing ? setApPat : undefined}
                  disabled={!editing}
                />
                <Field
                  label="Apellido materno"
                  value={apMat}
                  onChange={editing ? setApMat : undefined}
                  disabled={!editing}
                />
              </div>
              <Field
                label="Correo electrónico"
                value={correo}
                onChange={editing ? setCorreo : undefined}
                disabled={!editing}
                type="email"
              />

              {editing && (
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handleSave}
                    className="flex-1 sm:flex-none bg-[#1E6FD9] text-white font-body text-sm font-semibold rounded-xl px-6 py-2.5 hover:bg-[#1a5fc2] transition-colors"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 sm:flex-none border border-[#E2E8F0] text-[#1E0A4E]/60 font-body text-sm font-semibold rounded-xl px-6 py-2.5 hover:bg-[#F8FAFC] transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* ── Change password ───────────────────────────────────────────────── */}
          <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <button
              onClick={() => setPwOpen((o) => !o)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors"
              aria-expanded={pwOpen}
            >
              <div className="flex items-center gap-3">
                <span className="text-[#7A4FD6]"><IconKey /></span>
                <h2 className="font-heading font-bold text-[#1E0A4E] text-base">Cambiar contraseña</h2>
              </div>
              <span className="text-[#1E0A4E]/40"><IconChevron open={pwOpen} /></span>
            </button>

            {pwOpen && (
              <div className="px-6 pb-6 flex flex-col gap-4 border-t border-[#E2E8F0] pt-5">
                <Field
                  label="Contraseña actual"
                  value={pwCurrent}
                  onChange={setPwCurrent}
                  type={showPw.current ? 'text' : 'password'}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => ({ ...s, current: !s.current }))}
                      className="text-[#1E0A4E]/40 hover:text-[#1E0A4E] transition-colors"
                    >
                      <IconEye show={showPw.current} />
                    </button>
                  }
                />
                <Field
                  label="Nueva contraseña"
                  value={pwNew}
                  onChange={setPwNew}
                  type={showPw.new ? 'text' : 'password'}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => ({ ...s, new: !s.new }))}
                      className="text-[#1E0A4E]/40 hover:text-[#1E0A4E] transition-colors"
                    >
                      <IconEye show={showPw.new} />
                    </button>
                  }
                />
                <Field
                  label="Confirmar nueva contraseña"
                  value={pwConfirm}
                  onChange={setPwConfirm}
                  type={showPw.confirm ? 'text' : 'password'}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => ({ ...s, confirm: !s.confirm }))}
                      className="text-[#1E0A4E]/40 hover:text-[#1E0A4E] transition-colors"
                    >
                      <IconEye show={showPw.confirm} />
                    </button>
                  }
                />

                {pwError && (
                  <p className="font-body text-xs text-[#EF4444] bg-[#FEF2F2] border border-[#EF4444]/20 rounded-xl px-4 py-2.5">
                    {pwError}
                  </p>
                )}
                {pwSuccess && (
                  <p className="font-body text-xs text-[#35C56A] bg-[#35C56A]/10 border border-[#35C56A]/20 rounded-xl px-4 py-2.5">
                    Contraseña actualizada correctamente.
                  </p>
                )}

                <button
                  onClick={handlePasswordUpdate}
                  className="w-full sm:w-auto bg-[#1E6FD9] text-white font-body text-sm font-semibold rounded-xl px-6 py-2.5 hover:bg-[#1a5fc2] transition-colors"
                >
                  Actualizar contraseña
                </button>
              </div>
            )}
          </section>

          {/* ── Photo upload ───────────────────────────────────────────────────── */}
          <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0]">
              <h2 className="font-heading font-bold text-[#1E0A4E] text-base">Foto de perfil</h2>
            </div>
            <div className="px-6 py-5 flex flex-col sm:flex-row items-center gap-5">
              {/* Preview */}
              <div
                className="w-20 h-20 rounded-2xl border-2 border-dashed border-[#E2E8F0] flex items-center justify-center overflow-hidden shrink-0 bg-[#F8FAFC]"
              >
                {photoPreview
                  ? <img src={photoPreview} alt="Vista previa" className="w-full h-full object-cover" />
                  : <span className="font-heading font-bold text-2xl text-[#1E0A4E]/20">{avatarInitials}</span>
                }
              </div>

              <div className="flex flex-col gap-2 text-center sm:text-left">
                <p className="font-body text-sm text-[#1E0A4E]/60">
                  JPG, PNG o GIF. Máximo 2 MB.
                </p>
                <div className="flex gap-2 justify-center sm:justify-start">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-2 bg-[#1E6FD9] text-white font-body text-sm font-semibold rounded-xl px-4 py-2 hover:bg-[#1a5fc2] transition-colors"
                  >
                    <IconCamera />
                    Subir imagen
                  </button>
                  {photoPreview && (
                    <button
                      onClick={() => setPhotoPreview(null)}
                      className="border border-[#E2E8F0] text-[#1E0A4E]/60 font-body text-sm font-semibold rounded-xl px-4 py-2 hover:bg-[#F8FAFC] transition-colors"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ── Preferences ───────────────────────────────────────────────────── */}
          <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center gap-3">
              <span className="text-[#1E6FD9]"><IconBell /></span>
              <h2 className="font-heading font-bold text-[#1E0A4E] text-base">Preferencias</h2>
            </div>
            <div className="px-6 pt-2 pb-2">
              <Toggle
                label="Notificaciones por correo"
                description="Recibe actualizaciones del itinerario en tu correo."
                checked={notifEmail}
                onChange={setNotifEmail}
              />
              <Toggle
                label="Notificaciones del grupo"
                description="Alertas cuando un miembro realiza cambios en el grupo."
                checked={notifGroup}
                onChange={setNotifGroup}
              />
            </div>
          </section>

        </div>
      </div>
    </AppLayout>
  )
}
