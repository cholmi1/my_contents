import { useHubStore, useLedgerStore } from './hooks/useStores';
import { useHashRoute } from './hooks/useHashRoute';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { RoutinesPage } from './pages/RoutinesPage';
import { NotesPage } from './pages/NotesPage';
import { AppsPage } from './pages/AppsPage';
import { LedgerPage } from './pages/LedgerPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  const route = useHashRoute();
  const hubStore = useHubStore();
  const ledgerStore = useLedgerStore();

  const warnings = [
    ...(hubStore.warning
      ? [
          {
            id: 'hub-warning',
            message: hubStore.warning,
            onDismiss: hubStore.clearWarning,
          },
        ]
      : []),
    ...(ledgerStore.warning
      ? [
          {
            id: 'ledger-warning',
            message: ledgerStore.warning,
            onDismiss: ledgerStore.clearWarning,
          },
        ]
      : []),
  ];

  return (
    <Layout
      active={route}
      status={route === 'ledger' ? ledgerStore.saveStatus : hubStore.saveStatus}
      warnings={warnings}
    >
      {route === 'home' ? <HomePage store={hubStore} /> : null}
      {route === 'routines' ? <RoutinesPage store={hubStore} /> : null}
      {route === 'notes' ? <NotesPage store={hubStore} /> : null}
      {route === 'apps' ? <AppsPage store={hubStore} /> : null}
      {route === 'ledger' ? <LedgerPage store={ledgerStore} /> : null}
      {route === 'settings' ? (
        <SettingsPage hubStore={hubStore} ledgerStore={ledgerStore} />
      ) : null}
    </Layout>
  );
}
