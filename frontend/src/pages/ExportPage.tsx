import { useParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout/AppLayout'
import { ExportView } from '../components/export/ExportView/ExportView'
import { useAuth } from '../context/useAuth'

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function ExportPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const { localUser } = useAuth()

  const navUserName = localUser?.nombre || localUser?.email || 'Usuario'
  const navInitials = getInitials(navUserName) || 'U'

  return (
    <AppLayout
      showTripSelector={false}
      showRightPanel={false}
      user={{
        name: navUserName,
        role: '',
        initials: navInitials,
        color: '#7A4FD6',
      }}
    >
      <div className="flex-1 overflow-x-hidden overflow-y-auto bg-[#F4F6F8] px-4 py-8">
        <ExportView groupId={groupId} />
      </div>
    </AppLayout>
  )
}

export default ExportPage
