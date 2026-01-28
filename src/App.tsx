import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { UserPreferencesProvider } from './contexts/UserPreferencesContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import { DataCacheProvider } from './contexts/DataCacheContext';
import { AppShell } from './components/layout/AppShell';
import { Loader2 } from 'lucide-react';
import { FeedbackWidget } from './components/common/FeedbackWidget';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ChatWidget } from './components/chat/ChatWidget';

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-900">
    <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
  </div>
);

// Eager load critical pages
import { WelcomeLanding } from './pages/WelcomeLanding';
import { Login } from './pages/Login';

// Lazy load Main Pages (Named Exports)
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Properties = lazy(() => import('./pages/Properties').then(module => ({ default: module.Properties })));


const Payments = lazy(() => import('./pages/Payments').then(module => ({ default: module.Payments })));
const AddContract = lazy(() => import('./pages/AddContract').then(module => ({ default: module.AddContract })));
const Calculator = lazy(() => import('./pages/Calculator').then(module => ({ default: module.Calculator })));
const SharedCalculation = lazy(() => import('./pages/SharedCalculation').then(module => ({ default: module.SharedCalculation })));
const Settings = lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));
const Analytics = lazy(() => import('./pages/Analytics').then(module => ({ default: module.Analytics })));
const Tools = lazy(() => import('./pages/Tools').then(module => ({ default: module.Tools })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(module => ({ default: module.ResetPassword })));
const AccessibilityStatement = lazy(() => import('./pages/AccessibilityStatement').then(module => ({ default: module.AccessibilityStatement })));
const KnowledgeBase = lazy(() => import('./pages/KnowledgeBase').then(module => ({ default: module.KnowledgeBase })));
const ArticleViewer = lazy(() => import('./pages/ArticleViewer').then(module => ({ default: module.ArticleViewer })));

// Lazy load Admin Pages & Less Critical (Default Exports)
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'));
const OwnerDashboard = lazy(() => import('./pages/admin/OwnerDashboard'));
const BroadcastManager = lazy(() => import('./pages/admin/BroadcastManager'));
import { ShortLinkRedirect } from './pages/ShortLinkRedirect';
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const AdminInvoices = lazy(() => import('./pages/admin/AdminInvoices'));
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs'));
const AdminFeedback = lazy(() => import('./pages/admin/AdminFeedback'));
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications'));
const SystemSettings = lazy(() => import('./pages/admin/SystemSettings'));
const StorageManagement = lazy(() => import('./pages/admin/StorageManagement'));
const AIUsageManagement = lazy(() => import('./pages/admin/AIUsageManagement'));
const ClientProfile = lazy(() => import('./pages/admin/ClientProfile'));
const AutomationTracking = lazy(() => import('./pages/admin/AutomationTracking'));
const SupportTickets = lazy(() => import('./pages/admin/SupportTickets'));

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
const SuperAdminGuard = lazy(() => import('./components/guards/SuperAdminGuard'));

import { StackProvider } from './contexts/StackContext';
import { StackContainer } from './components/layout/StackContainer';



function App() {
  return (
    <UserPreferencesProvider>
      <NotificationsProvider>
        <DataCacheProvider>
          <StackProvider>
            <ErrorBoundary>
              <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<WelcomeLanding />} />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/s/:slug" element={<ShortLinkRedirect />} />
                    <Route path="/maintenance" element={<MaintenancePage />} />

                    {/* MFA Routes - Accessible only if logged in */}
                    <Route element={<AuthGuard />}>
                      <Route path="/auth/mfa/enroll" element={<MFAEnrollment />} />
                      <Route path="/auth/mfa/challenge" element={<MFAChallenge />} />
                    </Route>

                    <Route path="/calc/:id" element={<SharedCalculation />} />

                    {/* Legal Routes */}
                    <Route path="/accessibility" element={<AccessibilityStatement />} />
                    <Route path="/legal/privacy" element={<PrivacyPolicy />} />
                    <Route path="/legal/terms" element={<TermsOfService />} />
                    <Route path="/knowledge-base" element={<KnowledgeBase />} />
                    <Route path="/knowledge-base/:slug" element={<ArticleViewer />} />

                    {/* Main App Routes - Protected by AuthGuard */}
                    <Route element={<AuthGuard />}>
                      <Route element={<AppShell />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/properties" element={<Properties />} />

                        <Route path="/contracts/new" element={<AddContract />} />
                        <Route path="/calculator" element={<Calculator />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/analytics" element={<Analytics />} />
                        <Route path="/tools" element={<Tools />} />

                        <Route path="/payments" element={<Payments />} />
                      </Route>
                    </Route>

                    {/* Admin Routes */}
                    <Route element={<AdminGuard />}>
                      <Route path="/admin" element={<AdminLayout />}>
                        <Route element={<SuperAdminGuard />}>
                          <Route path="owner" element={<OwnerDashboard />} />
                          <Route path="broadcasts" element={<BroadcastManager />} />
                        </Route>
                        <Route index element={<AdminDashboard />} />
                        <Route path="notifications" element={<AdminNotifications />} />
                        <Route path="settings" element={<SystemSettings />} />
                        <Route path="users" element={<UserManagement />} />

                        <Route path="plans" element={<PlanManagement />} />
                        <Route path="storage" element={<StorageManagement />} />
                        <Route path="invoices" element={<AdminInvoices />} />
                        <Route path="feedback" element={<AdminFeedback />} />
                        <Route path="audit-logs" element={<AuditLogs />} />
                        <Route path="ai-usage" element={<AIUsageManagement />} />
                        <Route path="automation" element={<AutomationTracking />} />
                        <Route path="client/:id" element={<ClientProfile />} />
                        <Route path="tickets" element={<SupportTickets />} />
                      </Route>
                    </Route>
                  </Routes>
                </Suspense>
                {/* Global Widgets */}
                <ChatWidget />
                <StackContainer />
              </BrowserRouter>
            </ErrorBoundary>
          </StackProvider>
        </DataCacheProvider>
      </NotificationsProvider>
    </UserPreferencesProvider>
  );
}

export default App;
