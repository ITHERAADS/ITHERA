import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout/AppLayout'
import { useAuth } from '../../context/useAuth'
import { groupsService, saveCurrentGroup } from '../../services/groups'
import type { InvitePreview } from '../../types/groups'

export function JoinGroupPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const code = params.get('code')?.trim().toUpperCase() ?? ''

  const { accessToken, localUser, loading: authLoading } = useAuth()

  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [requestPending, setRequestPending] = useState(false)

  useEffect(() => {
    async function loadPreview() {
      if (!code) {
        setError('El enlace de invitación no contiene un código válido.')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')

        const response = await groupsService.getInvitePreview(code)
        setPreview(response.preview)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar la invitación.')
      } finally {
        setLoading(false)
      }
    }

    loadPreview()
  }, [code])

  const handleJoin = async () => {
    if (!accessToken) {
      const redirectTo = `/join-group?code=${encodeURIComponent(code)}`
      sessionStorage.setItem('ithera_post_login_redirect', redirectTo)
      navigate(`/login?redirect=${encodeURIComponent(redirectTo)}`)
      return
    }

    try {
      setJoining(true)
      setError('')

      const response = await groupsService.joinGroup(code, accessToken)

      if (response.group.requiresApproval) {
        setRequestPending(true)
        return
      }

      saveCurrentGroup(response.group)

      navigate(`/grouppanel?groupId=${encodeURIComponent(response.group.id)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo aceptar la invitación.')
    } finally {
      setJoining(false)
    }
  }

  const userName = localUser?.nombre || localUser?.email || 'Usuario'
  const initials = userName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const navUser = {
    name: authLoading ? 'Cargando...' : userName,
    role: localUser ? 'Usuario' : '',
    initials: authLoading ? '--' : initials,
  }

  return (
    <AppLayout showTripSelector={false} user={navUser}>
      <main className="min-h-[calc(100vh-80px)] bg-[#F4F1FA] px-6 py-10">
        <section className="mx-auto max-w-2xl rounded-3xl border border-[#E2E8F0] bg-white p-8 shadow-sm">
          {loading ? (
            <p className="text-center font-body text-sm text-[#7A8799]">
              Cargando invitación...
            </p>
          ) : error ? (
            <div className="text-center">
              <h1 className="font-heading text-2xl font-bold text-[#1E0A4E]">
                No se pudo abrir la invitación
              </h1>
              <p className="mt-3 font-body text-sm text-red-500">{error}</p>

              <button
                onClick={() => navigate('/my-trips')}
                className="mt-6 rounded-xl bg-[#1E6FD9] px-5 py-3 text-sm font-semibold text-white"
              >
                Volver a mis viajes
              </button>
            </div>
          ) : requestPending ? (
            <div className="text-center">
              <p className="mb-3 inline-flex rounded-full bg-[#FFF4D6] px-3 py-1 text-xs font-semibold text-[#A86B00]">
                Solicitud enviada
              </p>
              <h1 className="font-heading text-2xl font-bold text-[#1E0A4E]">
                Tu solicitud está pendiente de aprobación
              </h1>
              <p className="mt-3 font-body text-sm text-[#7A8799]">
                Tu solicitud fue enviada al organizador. Espera a que sea aprobada; te avisaremos por notificación cuando puedas entrar al itinerario del grupo.
              </p>
              <button
                onClick={() => navigate('/my-trips')}
                className="mt-6 rounded-xl bg-[#1E6FD9] px-5 py-3 text-sm font-semibold text-white"
              >
                Volver a mis viajes
              </button>
            </div>
          ) : preview ? (
            <div>
              <p className="mb-3 inline-flex rounded-full bg-[#E8F0FF] px-3 py-1 text-xs font-semibold text-[#1E6FD9]">
                Invitación a grupo
              </p>

              <h1 className="font-heading text-3xl font-bold text-[#1E0A4E]">
                {preview.nombre}
              </h1>

              {preview.descripcion && (
                <p className="mt-2 font-body text-sm text-[#7A8799]">
                  {preview.descripcion}
                </p>
              )}

              <div className="mt-6 grid gap-3 rounded-2xl bg-[#F8FAFC] p-4">
                {preview.destino && (
                  <p className="font-body text-sm text-[#3D4A5C]">
                    <span className="font-semibold text-[#1E0A4E]">Destino:</span>{' '}
                    {preview.destino}
                  </p>
                )}

                <p className="font-body text-sm text-[#3D4A5C]">
                  <span className="font-semibold text-[#1E0A4E]">Código:</span>{' '}
                  {preview.codigo}
                </p>

                <p className="font-body text-sm text-[#3D4A5C]">
                  <span className="font-semibold text-[#1E0A4E]">Miembros:</span>{' '}
                  {preview.memberCount}
                  {preview.maximo_miembros ? ` / ${preview.maximo_miembros}` : ''}
                </p>

                {(preview.fecha_inicio || preview.fecha_fin) && (
                  <p className="font-body text-sm text-[#3D4A5C]">
                    <span className="font-semibold text-[#1E0A4E]">Fechas:</span>{' '}
                    {preview.fecha_inicio ?? 'Por definir'} → {preview.fecha_fin ?? 'Por definir'}
                  </p>
                )}
              </div>

              {!preview.canJoin && (
                <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-500">
                  Este grupo ya no acepta nuevos miembros.
                </p>
              )}

              {preview.requiresApproval && preview.canJoin && (
                <p className="mt-4 rounded-xl bg-[#FFF8E6] px-4 py-3 text-sm text-[#8A5A00]">
                  Este grupo es privado. Al aceptar, se enviará una solicitud al administrador para aprobación.
                </p>
              )}

              {!localUser && (
                <p className="mt-4 rounded-xl bg-[#FFF8E6] px-4 py-3 text-sm text-[#8A5A00]">
                  Para aceptar la invitación necesitas iniciar sesión.
                </p>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleJoin}
                  disabled={joining || !preview.canJoin}
                  className="flex-1 rounded-xl bg-[#1E6FD9] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {joining
                    ? 'Procesando...'
                    : localUser
                      ? preview.requiresApproval
                        ? 'Solicitar acceso'
                        : 'Aceptar invitación'
                      : 'Iniciar sesión para aceptar'}
                </button>

                <button
                  onClick={() => navigate('/my-trips')}
                  className="flex-1 rounded-xl border border-[#E2E8F0] px-5 py-3 text-sm font-semibold text-[#1E0A4E]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </AppLayout>
  )
}