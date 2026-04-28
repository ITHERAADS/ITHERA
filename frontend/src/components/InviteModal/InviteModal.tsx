import { useEffect, useMemo, useState } from 'react'
import { groupsService } from '../../services/groups'

type Member = {
  id: number
  initials: string
  name: string
  role: 'Admin' | 'Miembro'
}

type InviteModalProps = {
  isOpen: boolean
  onClose: () => void
  inviteLink: string
  groupId: string
  accessToken: string
  members: Member[]
  onInvitationsSent?: () => void
}

function parseEmails(value: string) {
  return value
    .split(/[\n,;]/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function InviteModal({
  isOpen,
  onClose,
  inviteLink,
  groupId,
  accessToken,
  members,
  onInvitationsSent,
}: InviteModalProps) {
  const [copied, setCopied] = useState(false)
  const [emailsText, setEmailsText] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const emails = useMemo(() => parseEmails(emailsText), [emailsText])
  const invalidEmails = emails.filter((email) => !isValidEmail(email))

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1800)
    return () => clearTimeout(timer)
  }, [copied])

  useEffect(() => {
    if (!isOpen) {
      setEmailsText('')
      setMessage('')
      setError('')
      setCopied(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
    } catch {
      setError('No se pudo copiar el enlace.')
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
        accessToken
      )

      setMessage(
        `Se generaron ${response.invitations.length} invitación(es) correctamente.`
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
      <div className="w-full max-w-xl rounded-[24px] bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-[#0D1117]">Invitar al grupo</h3>
            <p className="mt-1 text-sm text-[#7A8799]">
              Comparte el enlace o envía invitaciones por correo.
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
            placeholder="correo1@gmail.com, correo2@gmail.com"
            className="min-h-24 w-full resize-none rounded-xl border border-[#E2E8F0] px-4 py-3 text-sm text-[#3D4A5C] outline-none focus:border-[#1E6FD9] focus:ring-2 focus:ring-[#1E6FD9]/10"
          />

          <p className="mt-2 text-xs text-[#7A8799]">
            Puedes separar correos con coma, punto y coma o salto de línea.
          </p>

          <button
            type="button"
            onClick={handleSendInvitations}
            disabled={sending}
            className="mt-3 h-11 w-full rounded-xl bg-[#1E0A4E] text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {sending ? 'Enviando invitaciones…' : 'Enviar invitaciones'}
          </button>

          {message && <p className="mt-3 text-sm text-[#35C56A]">{message}</p>}
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
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