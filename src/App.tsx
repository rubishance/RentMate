import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { UserPreferencesProvider } from './contexts/UserPreferencesContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import { DataCacheProvider } from './contexts/DataCacheContext';
import { AppShell } from './components/layout/AppShell';
import { Loader2 } from 'lucide-react';
import { FeedbackWidget } from './components/common/FeedbackWidget';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-900">
    <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
  </div>
);

// Eager load critical pages
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';

// Lazy load Main Pages (Named Exports)
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Properties = lazy(() => import('./pages/Properties').then(module => ({ default: module.Properties })));
const Tenants = lazy(() => import('./pages/Tenants').then(module => ({ default: module.Tenants })));
const Contracts = lazy(() => import('./pages/Contracts').then(module => ({ default: module.Contracts })));
const Payments = lazy(() => import('./pages/Payments').then(module => ({ default: module.Payments })));
const AddContract = lazy(() => import('./pages/AddContract').then(module => ({ default: module.AddContract })));
const Calculator = lazy(() => import('./pages/Calculator').then(module => ({ default: module.Calculator })));
const SharedCalculation = lazy(() => import('./pages/SharedCalculation').then(module => ({ default: module.SharedCalculation })));
const Settings = lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));
const Analytics = lazy(() => import('./pages/Analytics').then(module => ({ default: module.Analytics })));
const Tools = lazy(() => import('./pages/Tools').then(module => ({ default: module.Tools })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(module => ({ default: module.ResetPassword })));
const AccessibilityStatement = lazy(() => import('./pages/AccessibilityStatement').then(module => ({ default: module.AccessibilityStatement })));

// Lazy load Admin Pages & Less Critical (Default Exports)
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const AdminInvoices = lazy(() => import('./pages/admin/AdminInvoices'));
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs'));
const AdminFeedback = lazy(() => import('./pages/admin/AdminFeedback'));
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications'));
const SystemSettings = lazy(() => import('./pages/admin/SystemSettings'));

const PlanManagement = lazy(() => import('./pages/admin/PlanManagement'));
const Pricing = lazy(() => import('./pages/Pricing'));
const PrivacyPolicy = lazy(() => import('./pages/legal/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/legal/TermsOfService'));

// Lazy load Guards & Layouts (Default Exports)
const AuthGuard = lazy(() => import('./components/guards/AuthGuard'));
const AdminGuard = lazy(() => import('./components/guards/AdminGuard'));
const AdminLayout = lazy(() => import('./components/layout/AdminLayout'));
const MFAEnrollment = lazy(() => import('./components/auth/MFAEnrollment'));
const MFAChallenge = lazy(() => import('./components/auth/MFAChallenge'));



function App() {
  return (
    <UserPreferencesProvider>
      <NotificationsProvider>
        <DataCacheProvider>
          <ErrorBoundary>
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/reset-password" element={<ResetPassword />} />

                  {/* MFA Routes - Accessible only if logged in */}
                  <Route element={<AuthGuard />}>
                    <Route path="/auth/mfa/enroll" element={<MFAEnrollment />} />
                    <Route path="/auth/mfa/challenge" element={<MFAChallenge />} />
                  </Route>

                  <Route path="/calc/share/:id" element={<SharedCalculation />} />

                  {/* Legal Routes */}
                  <Route path="/accessibility" element={<AccessibilityStatement />} />
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
                      <Route path="settings" element={<SystemSettings />} />
                      <Route path="users" element={<UserManagement />} />

                      <Route path="plans" element={<PlanManagement />} />
                      <Route path="invoices" element={<AdminInvoices />} />
                      <Route path="audit-logs" element={<AuditLogs />} />
                    </Route>
                  </Route>
                </Routes>
              </Suspense>
            </BrowserRouter>
            {/* Global Widgets */}
            <FeedbackWidget />
          </ErrorBoundary>
        </DataCacheProvider>
      </NotificationsProvider>
    </UserPreferencesProvider>
  );
}

export default App;
