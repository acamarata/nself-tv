/**
 * Performance Metrics Tracking
 *
 * Tracks Core Web Vitals and custom performance metrics
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

export interface CoreWebVitals {
  LCP?: PerformanceMetric; // Largest Contentful Paint
  FID?: PerformanceMetric; // First Input Delay
  CLS?: PerformanceMetric; // Cumulative Layout Shift
  FCP?: PerformanceMetric; // First Contentful Paint
  TTFB?: PerformanceMetric; // Time to First Byte
  INP?: PerformanceMetric; // Interaction to Next Paint
}

export interface CustomMetrics {
  videoStartTime?: number; // Time to start playing video
  catalogLoadTime?: number; // Time to load catalog
  searchResponseTime?: number; // Search response time
  imageLoadTime?: number; // Average image load time
  apiResponseTime?: number; // Average API response time
}

type MetricCallback = (metric: PerformanceMetric) => void;

/**
 * Get rating for metric based on thresholds
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds: Record<string, { good: number; poor: number }> = {
    LCP: { good: 2500, poor: 4000 },
    FID: { good: 100, poor: 300 },
    CLS: { good: 0.1, poor: 0.25 },
    FCP: { good: 1800, poor: 3000 },
    TTFB: { good: 800, poor: 1800 },
    INP: { good: 200, poor: 500 },
  };

  const threshold = thresholds[name];
  if (!threshold) return 'good';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Track Largest Contentful Paint (LCP)
 */
export function trackLCP(callback: MetricCallback) {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;

      const value = lastEntry.renderTime || lastEntry.loadTime;
      callback({
        name: 'LCP',
        value,
        rating: getRating('LCP', value),
        timestamp: Date.now(),
      });
    });

    observer.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (error) {
    console.warn('LCP tracking failed:', error);
  }
}

/**
 * Track First Input Delay (FID)
 */
export function trackFID(callback: MetricCallback) {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const firstEntry = entries[0] as any;

      const value = firstEntry.processingStart - firstEntry.startTime;
      callback({
        name: 'FID',
        value,
        rating: getRating('FID', value),
        timestamp: Date.now(),
      });
    });

    observer.observe({ type: 'first-input', buffered: true });
  } catch (error) {
    console.warn('FID tracking failed:', error);
  }
}

/**
 * Track Cumulative Layout Shift (CLS)
 */
export function trackCLS(callback: MetricCallback) {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  try {
    let clsValue = 0;
    let sessionValue = 0;
    let sessionEntries: any[] = [];

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        // Only count layout shifts without recent user input
        if (!entry.hadRecentInput) {
          const firstSessionEntry = sessionEntries[0];
          const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

          // If the entry occurred less than 1 second after the previous entry
          // and less than 5 seconds after the first entry in the session,
          // include the entry in the current session. Otherwise, start a new session.
          if (
            sessionValue &&
            entry.startTime - lastSessionEntry.startTime < 1000 &&
            entry.startTime - firstSessionEntry.startTime < 5000
          ) {
            sessionValue += entry.value;
            sessionEntries.push(entry);
          } else {
            sessionValue = entry.value;
            sessionEntries = [entry];
          }

          // If the current session value is larger than the current CLS value,
          // update CLS and the entries contributing to it.
          if (sessionValue > clsValue) {
            clsValue = sessionValue;

            callback({
              name: 'CLS',
              value: clsValue,
              rating: getRating('CLS', clsValue),
              timestamp: Date.now(),
            });
          }
        }
      }
    });

    observer.observe({ type: 'layout-shift', buffered: true });
  } catch (error) {
    console.warn('CLS tracking failed:', error);
  }
}

/**
 * Track First Contentful Paint (FCP)
 */
export function trackFCP(callback: MetricCallback) {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const firstEntry = entries[0];

      if (firstEntry) {
        const value = firstEntry.startTime;
        callback({
          name: 'FCP',
          value,
          rating: getRating('FCP', value),
          timestamp: Date.now(),
        });

        observer.disconnect();
      }
    });

    observer.observe({ type: 'paint', buffered: true });
  } catch (error) {
    console.warn('FCP tracking failed:', error);
  }
}

/**
 * Track Time to First Byte (TTFB)
 */
export function trackTTFB(callback: MetricCallback) {
  if (typeof window === 'undefined') return;

  try {
    const navigationEntry = performance.getEntriesByType('navigation')[0] as any;

    if (navigationEntry) {
      const value = navigationEntry.responseStart - navigationEntry.requestStart;
      callback({
        name: 'TTFB',
        value,
        rating: getRating('TTFB', value),
        timestamp: Date.now(),
      });
    }
  } catch (error) {
    console.warn('TTFB tracking failed:', error);
  }
}

/**
 * Track Interaction to Next Paint (INP)
 */
export function trackINP(callback: MetricCallback) {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  try {
    let maxDuration = 0;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        // INP is the longest interaction duration
        if (entry.duration > maxDuration) {
          maxDuration = entry.duration;

          callback({
            name: 'INP',
            value: maxDuration,
            rating: getRating('INP', maxDuration),
            timestamp: Date.now(),
          });
        }
      }
    });

    observer.observe({ type: 'event', buffered: true, durationThreshold: 16 });
  } catch (error) {
    console.warn('INP tracking failed:', error);
  }
}

/**
 * Track all Core Web Vitals
 */
export function trackCoreWebVitals(callback: MetricCallback) {
  trackLCP(callback);
  trackFID(callback);
  trackCLS(callback);
  trackFCP(callback);
  trackTTFB(callback);
  trackINP(callback);
}

/**
 * Track custom metric
 */
export function trackCustomMetric(name: string, value: number) {
  if (typeof window === 'undefined') return;

  const metric: PerformanceMetric = {
    name,
    value,
    rating: 'good', // Custom metrics don't have standard thresholds
    timestamp: Date.now(),
  };

  // Send to analytics
  sendMetric(metric);

  // Store locally for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${name}: ${value}ms`);
  }
}

/**
 * Send metric to analytics endpoint
 */
function sendMetric(metric: PerformanceMetric) {
  if (typeof window === 'undefined') return;

  // Send to backend
  const endpoint = '/api/v1/analytics/performance';

  if (navigator.sendBeacon) {
    // Use sendBeacon for reliability (works even if page is unloading)
    navigator.sendBeacon(
      endpoint,
      JSON.stringify({
        ...metric,
        url: window.location.href,
        userAgent: navigator.userAgent,
      })
    );
  } else {
    // Fallback to fetch
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...metric,
        url: window.location.href,
        userAgent: navigator.userAgent,
      }),
      keepalive: true,
    }).catch((error) => {
      console.warn('Failed to send metric:', error);
    });
  }
}

/**
 * Track video playback start time
 */
export function trackVideoStartTime(contentId: string, startTime: number) {
  const loadTime = performance.now() - startTime;
  trackCustomMetric('video-start-time', loadTime);

  // Also track per content
  trackCustomMetric(`video-start-time-${contentId}`, loadTime);
}

/**
 * Track API response time
 */
export function trackAPIResponse(endpoint: string, duration: number) {
  trackCustomMetric(`api-${endpoint}`, duration);
}

/**
 * Track search response time
 */
export function trackSearchResponse(query: string, duration: number) {
  trackCustomMetric('search-response-time', duration);
}

/**
 * Track image load time
 */
export function trackImageLoad(src: string, duration: number) {
  trackCustomMetric('image-load-time', duration);
}

/**
 * Get performance summary
 */
export function getPerformanceSummary(): {
  navigation: any;
  resources: any[];
  memory?: any;
} {
  if (typeof window === 'undefined') return { navigation: null, resources: [] };

  return {
    navigation: performance.getEntriesByType('navigation')[0],
    resources: performance.getEntriesByType('resource'),
    memory: (performance as any).memory,
  };
}

/**
 * Mark performance milestone
 */
export function markMilestone(name: string) {
  if (typeof window === 'undefined') return;

  performance.mark(name);
}

/**
 * Measure time between two milestones
 */
export function measureBetween(name: string, startMark: string, endMark: string) {
  if (typeof window === 'undefined') return;

  try {
    performance.measure(name, startMark, endMark);

    const measure = performance.getEntriesByName(name)[0];
    trackCustomMetric(name, measure.duration);
  } catch (error) {
    console.warn('Measure failed:', error);
  }
}
