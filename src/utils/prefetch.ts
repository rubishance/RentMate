/**
 * Route Prefetching Strategy
 * 
 * Invoking these functions on hover/interaction will trigger the network request
 * for the code chunk before the user actually clicks the link.
 */

export const prefetchRoutes = {
    dashboard: () => import('../pages/Dashboard'),
    properties: () => import('../pages/Properties'),
    payments: () => import('../pages/Payments'),
    maintenance: () => import('../pages/MaintenanceTracker'),
    analytics: () => import('../pages/Analytics'),
    settings: () => import('../pages/Settings'),
    addContract: () => import('../pages/AddContract'),
    adminDashboard: () => import('../pages/admin/AdminDashboard'),
};
