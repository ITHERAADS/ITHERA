import { useEffect, useState } from 'react'

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
  members: Member[]
}

export function InviteModal({
  isOpen,
  onClose,
  inviteLink,
  members,
}: InviteModalProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1800)
    return () => clearTimeout(timer)
  }, [copied])

  if (!isOpen) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
    } catch (error) {
      console.error('No se pudo copiar el enlace', error)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 px-4">
      <div className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-2xl font-bold text-[#0D1117]">Invitar al grupo</h3>

          <button
            type="button"
            onClick={onClose}
            className="text-[#7A8799] transition hover:text-[#3D4A5C]"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          <input
            value={inviteLink}
            readOnly
            className="h-11 flex-1 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 text-sm text-[#3D4A5C] outline-none"
          />

          <button
            type="button"
            onClick={handleCopy}
            className="rounded-xl bg-[#1E6FD9] px-4 text-sm font-medium text-white transition hover:bg-[#2C8BE6]"
          >
            Copiar enlace
          </button>
        </div>

        <div className="mb-3 text-center text-xs text-[#35C56A]">
          {copied ? '¡Enlace copiado!' : ' '}
        </div>

        <div className="mb-4 border-t border-[#E2E8F0] pt-4">
          <p className="mb-3 text-sm font-semibold text-[#3D4A5C]">
            Miembros del grupo
          </p>

          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between">
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

                <button
                  type="button"
                  className="text-[#7A8799] transition hover:text-[#EF4444]"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 h-11 w-full rounded-xl border border-[#E2E8F0] text-sm font-medium text-[#3D4A5C] transition hover:bg-[#F8FAFC]"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}