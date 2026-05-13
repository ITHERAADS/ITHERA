import { useSearchParams, useLocation } from 'react-router-dom';
import { getCurrentGroup } from '../../services/groups';
import { useAuth } from '../../context/useAuth';
import { AppLayout } from '../../components/layout/AppLayout';
import { ExportView } from '../../components/ExportView/ExportView';

export function ExportPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { localUser } = useAuth();

  const routeState = location.state as { groupId?: string | number } | null;
  const groupIdFromState = routeState?.groupId ? String(routeState.groupId) : null;
  const groupId = searchParams.get('groupId');
  const currentGroup = getCurrentGroup();
  const resolvedGroupId =
    groupIdFromState || groupId || (currentGroup?.id ? String(currentGroup.id) : null);

  const navUser = localUser
    ? {
        name:     localUser.nombre ?? localUser.email?.split('@')[0] ?? 'Usuario',
        role:     '',
        initials: (localUser.nombre ?? localUser.email ?? 'U')
          .split(' ')
          .map((w: string) => w[0] ?? '')
          .join('')
          .slice(0, 2)
          .toUpperCase(),
      }
    : undefined;

  return (
    <AppLayout
      user={navUser}
      showRightPanel={false}
      showTripSelector={false}
      centerTitle="Exportar itinerario"
    >
      <ExportView grupoId={resolvedGroupId} />
    </AppLayout>
  );
}
