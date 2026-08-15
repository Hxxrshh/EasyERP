import { useAuth } from './context/AuthContext';
import { useBillingStore } from './store/useBillingStore';
import { AppShell } from './components/layout/AppShell';
import { LoginForm } from './components/auth/LoginForm';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { OverviewView } from './components/dashboard/OverviewView';
import { BillingWorkspace } from './components/billing/BillingWorkspace';
import { ClientsWorkspace } from './components/clients/ClientsWorkspace';
import { ProductsWorkspace } from './components/products/ProductsWorkspace';
import { PaymentsWorkspace } from './components/payments/PaymentsWorkspace';
import { LedgerWorkspace } from './components/ledger/LedgerWorkspace';
import { DocumentsWorkspace } from './components/documents/DocumentsWorkspace';
import { ReportsWorkspace } from './components/reports/ReportsWorkspace';
import { AuditTrailWorkspace } from './components/audit/AuditTrailWorkspace';
import { WhatsAppParserDrawer } from './components/WhatsAppParserDrawer';

function App() {
  const { user, isLoading } = useAuth();
  const { activeTab } = useBillingStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <LoadingSpinner label="Authenticating session..." />
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <AppShell>
      <WhatsAppParserDrawer />
      {activeTab === 'overview' && <OverviewView />}
      {activeTab === 'billing' && <BillingWorkspace />}
      {activeTab === 'customers' && <ClientsWorkspace />}
      {activeTab === 'products' && <ProductsWorkspace />}
      {activeTab === 'payments' && <PaymentsWorkspace />}
      {activeTab === 'ledger' && <LedgerWorkspace />}
      {activeTab === 'documents' && <DocumentsWorkspace />}
      {activeTab === 'reports' && <ReportsWorkspace />}
      {activeTab === 'audit' && <AuditTrailWorkspace />}
    </AppShell>
  );
}

export default App;
