# Performance Optimization Guide

## Overview
This document outlines the performance optimizations implemented in RentMate to improve responsiveness and loading speed.

## Build Optimizations

### 1. Vite Configuration (`vite.config.ts`)

#### Code Splitting
- **Manual Chunk Splitting**: Vendors are split into logical chunks for better caching:
  - `react-vendor`: React core libraries
  - `supabase-vendor`: Supabase client
  - `ui-vendor`: UI libraries (Lucide, Heroicons, Framer Motion)
  - `charts-vendor`: Recharts
  - `pdf-vendor`: PDF processing libraries
  - `utils-vendor`: Utility libraries

#### Minification
- **Terser**: Enabled with production optimizations
- **Console Removal**: `console.log` and `console.info` removed in production
- **Dead Code Elimination**: Unused code automatically removed

#### Target
- **ES2020**: Modern JavaScript for smaller bundles
- **Tree Shaking**: Automatic removal of unused exports

### 2. Netlify Configuration (`netlify.toml`)

#### Caching Strategy
- **Static Assets**: 1 year cache (`max-age=31536000, immutable`)
  - JavaScript chunks
  - CSS files
  - Images (PNG, JPG, WebP)
  - Fonts (WOFF2)
- **HTML**: No cache (`max-age=0, must-revalidate`)

#### Compression
- Automatic Gzip/Brotli compression by Netlify
- Asset optimization enabled

## Runtime Optimizations

### 3. Performance Utilities (`src/utils/performance.ts`)

#### Available Functions:
- `debounce()`: Limit function execution frequency
- `throttle()`: Ensure function called at most once per interval
- `memoryCache`: In-memory cache with TTL
- `measurePerformance()`: Performance measurement wrapper
- `requestIdleCallback()`: Schedule non-critical work
- `batchAsync()`: Batch async operations

#### Usage Example:
```typescript
import { debounce, memoryCache } from '../utils/performance';

// Debounce search input
const handleSearch = debounce((query: string) => {
  // Search logic
}, 300);

// Cache API responses
const fetchData = async (key: string) => {
  const cached = memoryCache.get(key);
  if (cached) return cached;
  
  const data = await api.fetch();
  memoryCache.set(key, data, 5 * 60 * 1000); // 5 min TTL
  return data;
};
```

### 4. Optimized Image Component (`src/components/common/OptimizedImage.tsx`)

#### Features:
- **Lazy Loading**: Images load only when visible
- **Error Handling**: Automatic fallback on error
- **Smooth Transitions**: Fade-in effect on load
- **Native Lazy Loading**: Uses browser's native `loading="lazy"`

#### Usage:
```tsx
import { OptimizedImage } from '../components/common/OptimizedImage';

<OptimizedImage
  src="/path/to/image.png"
  alt="Description"
  lazy={true}
  className="w-full h-auto"
/>
```

### 5. React Optimizations

#### Lazy Loading Routes
All non-critical routes are lazy-loaded in `App.tsx`:
```typescript
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Properties = lazy(() => import('./pages/Properties'));
// etc.
```

#### Context Providers
- `DataCacheProvider`: Centralized data caching
- `UserPreferencesProvider`: User settings management
- `NotificationsProvider`: Notification state

## Best Practices

### Component Optimization

#### 1. Use React.memo for Pure Components
```typescript
export const MyComponent = React.memo(({ data }) => {
  return <div>{data}</div>;
});
```

#### 2. Use useMemo for Expensive Calculations
```typescript
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);
```

#### 3. Use useCallback for Event Handlers
```typescript
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

### Data Fetching

#### 1. Batch Requests
```typescript
// Instead of multiple individual requests
const [users, properties, contracts] = await Promise.all([
  fetchUsers(),
  fetchProperties(),
  fetchContracts()
]);
```

#### 2. Use RPC for Complex Queries
```typescript
// Single RPC call instead of multiple queries
const { data } = await supabase.rpc('get_dashboard_summary', {
  p_user_id: userId
});
```

#### 3. Implement Pagination
```typescript
const { data } = await supabase
  .from('table')
  .select('*')
  .range(start, end)
  .limit(pageSize);
```

### State Management

#### 1. Avoid Unnecessary Re-renders
```typescript
// Use local state for UI-only changes
const [isOpen, setIsOpen] = useState(false);

// Use context only for shared state
const { user } = useAuth();
```

#### 2. Debounce Input Handlers
```typescript
import { debounce } from '../utils/performance';

const handleSearch = debounce((query: string) => {
  performSearch(query);
}, 300);
```

## Performance Monitoring

### Lighthouse Audits
Automated Lighthouse audits run on every deployment via Netlify plugin.

**Target Scores:**
- Performance: 80+
- Accessibility: 90+
- Best Practices: 80+
- SEO: 90+

### Manual Testing
1. **Chrome DevTools**:
   - Performance tab for profiling
   - Network tab for bundle analysis
   - Lighthouse for audits

2. **React DevTools Profiler**:
   - Identify slow components
   - Measure render times
   - Find unnecessary re-renders

## Deployment Checklist

Before deploying:
- [ ] Run `npm run build` locally
- [ ] Check bundle sizes in `dist/` folder
- [ ] Verify no console errors
- [ ] Test lazy loading works
- [ ] Verify images load correctly
- [ ] Check cache headers in Network tab
- [ ] Run Lighthouse audit

## Metrics to Monitor

### Core Web Vitals
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

### Custom Metrics
- **Time to Interactive**: < 3.5s
- **Bundle Size**: < 500KB (gzipped)
- **API Response Time**: < 500ms

## Future Optimizations

### Planned Improvements
1. **Service Worker**: Offline support and caching
2. **Preload Critical Resources**: Fonts, critical CSS
3. **Image Optimization**: WebP format, responsive images
4. **Code Splitting**: Further granular splitting
5. **CDN**: Static asset delivery via CDN
6. **Database Indexing**: Optimize Supabase queries

### Experimental
- **React Server Components**: When stable
- **Streaming SSR**: For faster initial load
- **Partial Hydration**: Reduce JavaScript overhead

## Resources

- [Vite Performance Guide](https://vitejs.dev/guide/performance.html)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Web.dev Performance](https://web.dev/performance/)
- [Netlify Optimization](https://docs.netlify.com/configure-builds/get-started/)

---

**Last Updated**: 2026-01-22
**Maintained By**: Development Team
