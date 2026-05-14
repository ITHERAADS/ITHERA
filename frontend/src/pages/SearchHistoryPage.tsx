import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout/AppLayout'
import { SearchHistory } from '../components/search/SearchHistory/SearchHistory'
import { useAuth } from '../context/useAuth'

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function SearchHistoryPage() {
  const { localUser } = useAuth()
  const navigate = useNavigate()

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
        <SearchHistory />
      </div>
    </AppLayout>
  )
}

export default SearchHistoryPage
