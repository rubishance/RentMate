import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { UserPreferencesProvider } from './contexts/UserPreferencesContext';
import { DataCacheProvider } from './contexts/DataCacheContext';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Properties } from './pages/Properties';
import { Tenants } from './pages/Tenants';
import { Contracts } from './pages/Contracts';
import { Payments } from './pages/Payments';
import { AddContract } from './pages/AddContract';
import { Calculator } from './pages/Calculator';
import { SharedCalculation } from './pages/SharedCalculation';
import { Settings } from './pages/Settings';
import { Analytics } from './pages/Analytics';
import { Tools } from './pages/Tools';
import { ResetPassword } from './pages/ResetPassword';
import AuthGuard from './components/guards/AuthGuard';
import AdminGuard from './components/guards/AdminGuard';
import AdminLayout from './components/layout/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import AdminInvoices from './pages/admin/AdminInvoices';
import AuditLogs from './pages/admin/AuditLogs';
import AdminNotifications from './pages/admin/AdminNotifications';
import PlanManagement from './pages/admin/PlanManagement';
import Pricing from './pages/Pricing';
import AccessibilityStatement from './pages/legal/AccessibilityStatement';
import PrivacyPolicy from './pages/legal/PrivacyPolicy';
import TermsOfService from './pages/legal/TermsOfService';



// import { useLocales } from './hooks/useLocales';

function App() {
  return (
    <UserPreferencesProvider>
      <DataCacheProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route path="/calc/share/:id" element={<SharedCalculation />} />

            {/* Legal Routes */}
            <Route path="/legal/accessibility" element={<AccessibilityStatement />} />
            <Route path="/legal/privacy" element={<PrivacyPolicy />} />
            <Route path="/legal/terms" element={<TermsOfService />} />

            {/* Main App Routes - Public Access except Payments */}
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/properties" element={<Properties />} />
              <Route path="/tenants" element={<Tenants />} />
              <Route path="/contracts" element={<Contracts />} />
              <Route path="/contracts/new" element={<AddContract />} />
              <Route path="/calculator" element={<Calculator />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/tools" element={<Tools />} />

              {/* Protected Payment Route */}
              <Route element={<AuthGuard />}>
                <Route path="/payments" element={<Payments />} />
              </Route>
            </Route>

            {/* Admin Routes */}
            <Route element={<AdminGuard />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="notifications" element={<AdminNotifications />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="plans" element={<PlanManagement />} />
                <Route path="invoices" element={<AdminInvoices />} />
                <Route path="audit-logs" element={<AuditLogs />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </DataCacheProvider>
    </UserPreferencesProvider>
  );
}

export default App;
