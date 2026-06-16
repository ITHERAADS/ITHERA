import { useEffect, useMemo, useState } from 'react'
import { groupsService } from '../../services/groups'

type Member = {
  id: number
  initials: string
  name: string
  role: 'Admin' | 'Miembro'
}

type InviteSettings = {
  expiresAt: string | null
  maxUses: number | null
  usedCount: number
}

type InviteModalProps = {
  isOpen: boolean
  onClose: () => void
  inviteLink: string
  qrBase64?: string
  inviteSettings?: InviteSettings
  groupId: string
  accessToken: string
  members: Member[]
  onInvitationsSent?: () => void
  onInviteSettingsUpdated?: (settings: InviteSettings) => void
}

type ToastState = {
  type: 'success' | 'error'
  message: string
}

function parseEmails(value: string) {
  return value
    .split(/[\n,;]/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z][A-Za-z0-9-]*(?:\.[A-Za-z][A-Za-z0-9-]*)*\.[A-Za-z]{2,24}$/

function isValidEmail(email: string) {
  return EMAIL_REGEX.test(email.trim().toLowerCase())
}

function getDaysUntil(expirationDate?: string | null) {
  if (!expirationDate) return 7

  const expiresAt = new Date(expirationDate).getTime()
  if (Number.isNaN(expiresAt)) return 7

  const diffDays = Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000))
  if (diffDays <= 1) return 1
  if (diffDays <= 3) return 3
  if (diffDays <= 7) return 7
  if (diffDays <= 14) return 14
  return 30
}

function formatExpiration(expiresAt?: string | null) {
  if (!expiresAt) return 'Sin expiración configurada'

  const date = new Date(expiresAt)
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'

  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function InviteModal({
  isOpen,
  onClose,
  inviteLink,
  qrBase64,
  inviteSettings,
  groupId,
  accessToken,
  members,
  onInvitationsSent,
  onInviteSettingsUpdated,
}: InviteModalProps) {
  const [copied, setCopied] = useState(false)
  const [emailsText, setEmailsText] = useState('')
  const [sending, setSending] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [downloadingQr, setDownloadingQr] = useState(false)
  const [expirationDays, setExpirationDays] = useState(7)
  const [usageLimit, setUsageLimit] = useState('unlimited')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState<ToastState | null>(null)

  const emails = useMemo(() => parseEmails(emailsText), [emailsText])
  const invalidEmails = emails.filter((email) => !isValidEmail(email))
  const hasEmailText = emailsText.trim().length > 0
  const emailValidationError = hasEmailText && invalidEmails.length > 0
    ? 'Ingresa un correo electrónico válido (ej. usuario@dominio.com).'
    : ''
  const canSendInvitations = !sending && emails.length > 0 && invalidEmails.length === 0
  const usedCount = inviteSettings?.usedCount ?? 0

  const showToast = (nextToast: ToastState) => {
    setToast(nextToast)
  }

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 3000)
    return () => clearTimeout(timer)
  }, [copied])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), toast.type === 'success' ? 3000 : 5000)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!isOpen) {
      setEmailsText('')
      setMessage('')
      setError('')
      setCopied(false)
      setToast(null)
      return
    }

    setExpirationDays(getDaysUntil(inviteSettings?.expiresAt))
    setUsageLimit(inviteSettings?.maxUses ? String(inviteSettings.maxUses) : 'unlimited')
  }, [inviteSettings?.expiresAt, inviteSettings?.maxUses, isOpen])

  if (!isOpen) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      showToast({ type: 'success', message: 'Enlace copiado' })
    } catch {
      showToast({ type: 'error', message: 'No se pudo copiar el enlace.' })
      setError('No se pudo copiar el enlace.')
    }
  }

  const handleDownloadQr = () => {
    if (!qrBase64) {
      showToast({ type: 'error', message: 'No se pudo descargar el QR. Inténtalo de nuevo.' })
      return
    }

    try {
      setDownloadingQr(true)
      const link = document.createElement('a')
      link.href = qrBase64
      link.download = `ithera-invitacion-${groupId}.png`
      document.body.appendChild(link)
      link.click()
      link.remove()
      showToast({ type: 'success', message: 'QR descargado' })
    } finally {
      setDownloadingQr(false)
    }
  }

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true)
      setError('')
      setMessage('')

      const maxUses = usageLimit === 'unlimited' ? null : Number(usageLimit)
      const response = await groupsService.updateInviteSettings(
        groupId,
        {
          expirationDays,
          maxUses,
        },
        accessToken,
      )

      onInviteSettingsUpdated?.(response.inviteSettings)
      setMessage('Configuración del enlace actualizada correctamente.')
      showToast({ type: 'success', message: 'Configuración de invitación guardada' })
    } catch (err) {
      const nextError = err instanceof Error ? err.message : 'No se pudo actualizar la configuración del enlace.'
      setError(nextError)
      showToast({ type: 'error', message: nextError })
    } finally {
      setSavingSettings(false)
    }
  }

  const handleSendInvitations = async () => {
    if (!emails.length) {
      setError('Agrega al menos un correo.')
      return
    }

    if (invalidEmails.length > 0) {
      setError(`Correo inválido: ${invalidEmails[0]}`)
      return
    }

    try {
      setSending(true)
      setError('')
      setMessage('')

      const response = await groupsService.sendInvitations(
        groupId,
        emails,
        accessToken,
      )

      setMessage(
        `Se generaron ${response.invitations.length} invitación(es) correctamente.`,
      )
      setEmailsText('')
      onInvitationsSent?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron enviar las invitaciones.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 px-4">
      {toast && (
        <div className={`fixed right-6 top-6 z-[80] flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-2xl ${toast.type === 'success' ? 'border border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]' : 'border border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'}`}>
          <span aria-hidden="true">{toast.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[24px] bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-[#0D1117]">Invitar al grupo</h3>
            <p className="mt-1 text-sm text-[#7A8799]">
              Comparte el QR, el enlace o envía invitaciones por correo.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[#7A8799] transition hover:text-[#3D4A5C]"
          >
            ✕
          </button>
        </div>

        <div className="mb-5 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <p className="mb-3 text-sm font-semibold text-[#1E0A4E]">
            Código QR
          </p>

          <div className="flex flex-col items-center gap-3">
            {qrBase64 ? (
              <img
                src={qrBase64}
                alt="Código QR de invitación al grupo"
                className="h-40 w-40 rounded-2xl border border-[#E2E8F0] bg-white p-3"
              />
            ) : (
              <div className="flex h-40 w-40 items-center justify-center rounded-2xl border border-dashed border-[#CBD5E1] bg-white text-center text-xs text-[#7A8799]">
                Generando QR…
              </div>
            )}

            <button
              type="button"
              onClick={handleDownloadQr}
              disabled={!qrBase64 || downloadingQr}
              className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white text-sm font-semibold text-[#1E0A4E] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloadingQr ? 'Descargando QR…' : 'Descargar QR'}
            </button>
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <p className="mb-2 text-sm font-semibold text-[#1E0A4E]">
            Enlace de invitación
          </p>

          <div className="flex gap-2">
            <input
              value={inviteLink}
              readOnly
              className="h-11 flex-1 rounded-xl border border-[#E2E8F0] bg-white px-4 text-sm text-[#3D4A5C] outline-none"
            />

            <button
              type="button"
              onClick={handleCopy}
              className="rounded-xl bg-[#1E6FD9] px-4 text-sm font-medium text-white transition hover:bg-[#2C8BE6]"
            >
              Copiar
            </button>
          </div>

          {copied && (
            <p className="mt-2 text-xs text-[#35C56A]">
              Enlace copiado correctamente.
            </p>
          )}
        </div>

        <div className="mb-5 rounded-2xl border border-[#E2E8F0] p-4">
          <div className="mb-3">
            <p className="text-sm font-semibold text-[#1E0A4E]">
              Seguridad del enlace
            </p>
            <p className="mt-1 text-xs text-[#7A8799]">
              Expira el {formatExpiration(inviteSettings?.expiresAt)} · Usos: {usedCount}/{inviteSettings?.maxUses ?? 'ilimitado'}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#7A8799]">
              Expiración
              <select
                value={expirationDays}
                onChange={(event) => setExpirationDays(Number(event.target.value))}
                disabled={savingSettings}
                className="mt-1 h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm font-medium normal-case text-[#1E0A4E] outline-none focus:border-[#1E6FD9] focus:ring-2 focus:ring-[#1E6FD9]/10 disabled:opacity-60"
              >
                <option value={1}>1 día</option>
                <option value={3}>3 días</option>
                <option value={7}>7 días</option>
                <option value={14}>14 días</option>
                <option value={30}>30 días</option>
              </select>
            </label>

            <label className="text-xs font-semibold uppercase tracking-wide text-[#7A8799]">
              Límite de usos
              <select
                value={usageLimit}
                onChange={(event) => setUsageLimit(event.target.value)}
                disabled={savingSettings}
                className="mt-1 h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm font-medium normal-case text-[#1E0A4E] outline-none focus:border-[#1E6FD9] focus:ring-2 focus:ring-[#1E6FD9]/10 disabled:opacity-60"
              >
                <option value="unlimited">Ilimitado</option>
                <option value="1">1 uso</option>
                <option value="5">5 usos</option>
                <option value="10">10 usos</option>
                <option value="25">25 usos</option>
                <option value="50">50 usos</option>
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="mt-3 h-11 w-full rounded-xl bg-[#1E0A4E] text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingSettings ? 'Guardando configuración…' : 'Guardar configuración del enlace'}
          </button>
        </div>

        <div className="mb-5 rounded-2xl border border-[#E2E8F0] p-4">
          <p className="mb-2 text-sm font-semibold text-[#1E0A4E]">
            Enviar invitaciones por correo
          </p>

          <textarea
            value={emailsText}
            onChange={(e) => {
              setEmailsText(e.target.value)
              setError('')
              setMessage('')
            }}
            onBlur={() => {
              if (emailValidationError) {
                setError(emailValidationError)
              }
            }}
            placeholder="correo1@gmail.com, correo2@gmail.com"
            aria-invalid={Boolean(emailValidationError || error)}
            className={`min-h-24 w-full resize-none rounded-xl border px-4 py-3 text-sm text-[#3D4A5C] outline-none transition
              ${emailValidationError || error
                ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                : 'border-[#E2E8F0] focus:border-[#1E6FD9] focus:ring-2 focus:ring-[#1E6FD9]/10'}
            `}
          />

          {emailValidationError ? (
            <p className="mt-2 text-xs text-red-500">{emailValidationError}</p>
          ) : (
            <p className="mt-2 text-xs text-[#7A8799]">
              Puedes separar correos con coma, punto y coma o salto de línea.
            </p>
          )}

          <button
            type="button"
            onClick={handleSendInvitations}
            disabled={!canSendInvitations}
            className="mt-3 h-11 w-full rounded-xl bg-[#1E0A4E] text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? 'Enviando invitaciones…' : 'Enviar invitaciones'}
          </button>

          {message && <p className="mt-3 text-sm text-[#35C56A]">{message}</p>}
          {error && !emailValidationError && (
            <p className="mt-3 text-sm text-red-500">{error}</p>
          )}
        </div>

        <div className="border-t border-[#E2E8F0] pt-4">
          <p className="mb-3 text-sm font-semibold text-[#3D4A5C]">
            Miembros actuales
          </p>

          <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-xl border border-[#F4F6F8] px-3 py-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#7A4FD6] to-[#1E6FD9] text-xs font-bold text-white">
                    {member.initials}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-[#0D1117]">
                      {member.name}
                    </p>
                    <p className="text-xs text-[#7A8799]">{member.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 h-11 w-full rounded-xl border border-[#E2E8F0] text-sm font-medium text-[#3D4A5C] transition hover:bg-[#F8FAFC]"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
