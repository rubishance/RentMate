import { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { UserPreferencesProvider } from './contexts/UserPreferencesContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import { DataCacheProvider } from './contexts/DataCacheContext';
import { AppShell } from './components/layout/AppShell';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ChatWidget } from './components/chat/ChatWidget';
import { RouteErrorBoundary } from './components/common/RouteErrorBoundary';

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-900">
    <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
  </div>
);

// Eager load critical pages
import { WelcomeLanding } from './pages/WelcomeLanding';
import WelcomeLandingStitch from './pages/WelcomeLandingStitch';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Properties } from './pages/Properties';
const Signup = lazy(() => import('./pages/Signup').then(module => ({ default: module.Signup })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(module => ({ default: module.ForgotPassword })));
const PropertyDetails = lazy(() => import('./pages/PropertyDetails'));


import { Payments } from './pages/Payments';
import { Calculator } from './pages/Calculator';
import { Analytics } from './pages/Analytics';
const MaintenanceTracker = lazy(() => import('./pages/MaintenanceTracker').then(module => ({ default: module.MaintenanceTracker })));
const ContractDetails = lazy(() => import('./pages/ContractDetails'));
const Contracts = lazy(() => import('./pages/Contracts'));
const SharedCalculation = lazy(() => import('./pages/SharedCalculation').then(module => ({ default: module.SharedCalculation })));
const Settings = lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));
const Tools = lazy(() => import('./pages/Tools').then(module => ({ default: module.Tools })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(module => ({ default: module.ResetPassword })));
const AccessibilityStatement = lazy(() => import('./pages/AccessibilityStatement').then(module => ({ default: module.AccessibilityStatement })));
const KnowledgeBase = lazy(() => import('./pages/KnowledgeBase').then(module => ({ default: module.KnowledgeBase })));
const ArticleViewer = lazy(() => import('./pages/ArticleViewer').then(module => ({ default: module.ArticleViewer })));
const Contact = lazy(() => import('./pages/Contact'));
import { CPICalculatorPage } from './pages/tools/CPICalculatorPage';
const AccountSuspended = lazy(() => import('./pages/AccountSuspended'));
const Unsubscribe = lazy(() => import('./pages/Unsubscribe').then(module => ({ default: module.Unsubscribe })));
const DesignSystem = lazy(() => import('./pages/DesignSystem').then(module => ({ default: module.DesignSystem })));


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
const UsageAnalytics = lazy(() => import('./pages/admin/UsageAnalytics'));
const AutomationTracking = lazy(() => import('./pages/admin/AutomationTracking'));
const AdminErrorLogs = lazy(() => import('./pages/admin/AdminErrorLogs'));
const SupportTickets = lazy(() => import('./pages/admin/SupportTickets'));
const SupportChat = lazy(() => import('./pages/admin/SupportChat'));

const PlanManagement = lazy(() => import('./pages/admin/PlanManagement'));
const Pricing = lazy(() => import('./pages/Pricing'));
const PrivacyPolicy = lazy(() => import('./pages/legal/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/legal/TermsOfService'));

// Lazy load Guards & Layouts (Default Exports)
import AuthGuard from './components/guards/AuthGuard';
const AdminGuard = lazy(() => import('./components/guards/AdminGuard'));
const AdminLayout = lazy(() => import('./components/layout/AdminLayout'));
const MFAEnrollment = lazy(() => import('./components/auth/MFAEnrollment'));
const MFAChallenge = lazy(() => import('./components/auth/MFAChallenge'));
const SuperAdminGuard = lazy(() => import('./components/guards/SuperAdminGuard'));

import { SEO } from './components/common/SEO';
import { StackProvider, useStack } from './contexts/StackContext';
import { StackContainer } from './components/layout/StackContainer';



// Root Layout to provide router context to global widgets
const RootLayout = () => {
  const location = useLocation();
  const { activeLayer } = useStack();

  const isWizard =
    location.pathname.includes('/new') ||
    location.pathname.includes('/add') ||
    location.pathname.includes('/create') ||
    location.pathname.includes('/wizard') ||
    location.pathname.includes('/setup') ||
    location.pathname.includes('/onboarding') ||
    activeLayer?.type === 'wizard';

  const hideChatPaths = ['/login', '/signup', '/forgot-password', '/reset-password'];
  const shouldHideChat = hideChatPaths.includes(location.pathname) || isWizard;

  return (
    <>
      <SEO />
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
      {!shouldHideChat && <ChatWidget />}
      <StackContainer />
    </>
  );
};

// Define the static router configuration for guaranteed sync (V1.4.5)
const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: "/",
        element: <WelcomeLanding />,
      },
      {
        path: "/welcome-new",
        element: <WelcomeLandingStitch />,
      },
      {
        path: "/design-system",
        element: <DesignSystem />,
      },
      {
        path: "/pricing",
        element: <Pricing />,
      },
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/signup",
        element: <Signup />,
      },
      {
        path: "/forgot-password",
        element: <ForgotPassword />,
      },
      {
        path: "/reset-password",
        element: <ResetPassword />,
      },
      {
        path: "/unsubscribe",
        element: <Unsubscribe />,
      },
      {
        path: "/s/:slug",
        element: <ShortLinkRedirect />,
      },
      {
        path: "/system-maintenance",
        element: <MaintenancePage />,
      },
      {
        path: "/account-suspended",
        element: <Suspense fallback={<PageLoader />}><AccountSuspended /></Suspense>,
      },
      {
        path: "/contact",
        element: <Contact />,
      },
      {
        path: "/tools/cpi-calculator",
        element: <CPICalculatorPage />,
      },
      {
        path: "/calc/:id",
        element: <SharedCalculation />,
      },
      {
        path: "/accessibility",
        element: <AccessibilityStatement />,
      },
      {
        path: "/legal/privacy",
        element: <PrivacyPolicy />,
      },
      {
        path: "/legal/terms",
        element: <TermsOfService />,
      },
      {
        path: "/knowledge-base",
        element: <KnowledgeBase />,
      },
      {
        path: "/knowledge-base/:slug",
        element: <ArticleViewer />,
      },
      // MFA Protected Routes
      {
        element: <AuthGuard />,
        children: [
          {
            path: "/auth/mfa/enroll",
            element: <MFAEnrollment />,
          },
          {
            path: "/auth/mfa/challenge",
            element: <MFAChallenge />,
          },
        ],
      },
      // Main App Shell Routes (Auth Protected)
      {
        element: <AuthGuard />,
        children: [
          {
            element: <AppShell />,
            children: [
              {
                path: "/dashboard",
                element: <Dashboard />,
              },
              {
                path: "/properties",
                element: <Properties />,
              },
              {
                path: "/properties/:id",
                element: <PropertyDetails />,
              },
              {
                path: "/maintenance",
                element: <MaintenanceTracker />,
              },
              {
                path: "/contracts",
                element: <Contracts />,
              },
              {
                path: "/assets",
                element: <Navigate to="/properties" replace />,
              },
              {
                path: "/properties-new",
                element: <Navigate to="/properties" replace />,
              },
              {
                path: "/contracts/:id",
                element: <ContractDetails />,
              },
              {
                path: "/calculator",
                element: <Calculator />,
              },
              {
                path: "/settings",
                element: <Settings />,
              },
              {
                path: "/analytics",
                element: <Analytics />,
              },
              {
                path: "/tools",
                element: <Tools />,
              },
              {
                path: "/payments",
                element: <Payments />,
              },
            ],
          },
        ],
      },
      // Admin Routes
      {
        element: <AdminGuard />,
        children: [
          {
            path: "/admin",
            element: <AdminLayout />,
            children: [
              {
                index: true,
                element: <AdminDashboard />,
              },
              {
                path: "notifications",
                element: <AdminNotifications />,
              },
              {
                path: "settings",
                element: <SystemSettings />,
              },
              {
                path: "users",
                element: <UserManagement />,
              },
              {
                path: "usage",
                element: <UsageAnalytics />,
              },
              {
                path: "plans",
                element: <PlanManagement />,
              },
              {
                path: "storage",
                element: <StorageManagement />,
              },
              {
                path: "invoices",
                element: <AdminInvoices />,
              },
              {
                path: "feedback",
                element: <AdminFeedback />,
              },
              {
                path: "audit-logs",
                element: <AuditLogs />,
              },
              {
                path: "ai-usage",
                element: <AIUsageManagement />,
              },
              {
                path: "automation",
                element: <AutomationTracking />,
              },
              {
                path: "client/:id",
                element: <ClientProfile />,
              },
              {
                path: "errors",
                element: <AdminErrorLogs />,
              },
              {
                path: "tickets",
                element: <SupportTickets />,
              },
              {
                path: "chat",
                element: <SupportChat />,
              },
              // Super Admin Specific Sub-Routes
              {
                element: <SuperAdminGuard />,
                children: [
                  {
                    path: "owner",
                    element: <OwnerDashboard />,
                  },
                  {
                    path: "broadcasts",
                    element: <BroadcastManager />,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);

function App() {
  return (
    <AuthProvider>
      <UserPreferencesProvider>
        <NotificationsProvider>
          <DataCacheProvider>
            <StackProvider>
              <ErrorBoundary>
                <RouterProvider router={router} />
              </ErrorBoundary>
            </StackProvider>
          </DataCacheProvider>
        </NotificationsProvider>
      </UserPreferencesProvider>
    </AuthProvider>
  );
}

export default App;
