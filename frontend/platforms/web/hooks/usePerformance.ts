import { useEffect, useState } from 'react';
import {
  trackCoreWebVitals,
  type PerformanceMetric,
  type CoreWebVitals,
} from '@/lib/performance/metrics';

/**
 * Track Core Web Vitals and make them available in React
 */
export function useCoreWebVitals() {
  const [vitals, setVitals] = useState<CoreWebVitals>({});

  useEffect(() => {
    trackCoreWebVitals((metric) => {
      setVitals((prev) => ({
        ...prev,
        [metric.name]: metric,
      }));
    });
  }, []);

  return vitals;
}

/**
 * Track page load performance
 */
export function usePageLoad() {
  const [metrics, setMetrics] = useState<{
    domContentLoaded?: number;
    loadComplete?: number;
    firstPaint?: number;
    firstContentfulPaint?: number;
  }>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-paint') {
          setMetrics((prev) => ({ ...prev, firstPaint: entry.startTime }));
        } else if (entry.name === 'first-contentful-paint') {
          setMetrics((prev) => ({ ...prev, firstContentfulPaint: entry.startTime }));
        }
      }
    });

    observer.observe({ type: 'paint', buffered: true });

    // Navigation timing
    const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    if (perfData) {
      setMetrics((prev) => ({
        ...prev,
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
        loadComplete: perfData.loadEventEnd - perfData.fetchStart,
      }));
    }

    return () => observer.disconnect();
  }, []);

  return metrics;
}

/**
 * Track resource loading performance
 */
export function useResourceTiming() {
  const [resources, setResources] = useState<
    Array<{
      name: string;
      type: string;
      duration: number;
      size: number;
    }>
  >([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

    const resourceData = resourceEntries.map((entry) => ({
      name: entry.name,
      type: entry.initiatorType,
      duration: entry.duration,
      size: entry.transferSize || 0,
    }));

    setResources(resourceData);
  }, []);

  return resources;
}

/**
 * Monitor memory usage (Chrome only)
 */
export function useMemoryMonitor() {
  const [memory, setMemory] = useState<{
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  }>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateMemory = () => {
      const perf = performance as any;
      if (perf.memory) {
        setMemory({
          usedJSHeapSize: perf.memory.usedJSHeapSize,
          totalJSHeapSize: perf.memory.totalJSHeapSize,
          jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
        });
      }
    };

    updateMemory();

    const interval = setInterval(updateMemory, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return memory;
}

/**
 * Track FPS (frames per second)
 */
export function useFPS() {
  const [fps, setFps] = useState(60);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const measureFPS = () => {
      const currentTime = performance.now();
      frameCount++;

      if (currentTime >= lastTime + 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;
      }

      animationFrameId = requestAnimationFrame(measureFPS);
    };

    animationFrameId = requestAnimationFrame(measureFPS);

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return fps;
}

/**
 * Detect performance issues
 */
export function usePerformanceIssues() {
  const vitals = useCoreWebVitals();
  const memory = useMemoryMonitor();
  const fps = useFPS();

  const issues: Array<{
    severity: 'warning' | 'critical';
    type: string;
    message: string;
  }> = [];

  // Check Core Web Vitals
  if (vitals.LCP && vitals.LCP.rating === 'poor') {
    issues.push({
      severity: 'critical',
      type: 'LCP',
      message: `Largest Contentful Paint is ${Math.round(vitals.LCP.value)}ms (should be < 2500ms)`,
    });
  }

  if (vitals.FID && vitals.FID.rating === 'poor') {
    issues.push({
      severity: 'critical',
      type: 'FID',
      message: `First Input Delay is ${Math.round(vitals.FID.value)}ms (should be < 100ms)`,
    });
  }

  if (vitals.CLS && vitals.CLS.rating === 'poor') {
    issues.push({
      severity: 'critical',
      type: 'CLS',
      message: `Cumulative Layout Shift is ${vitals.CLS.value.toFixed(3)} (should be < 0.1)`,
    });
  }

  // Check memory
  if (memory.usedJSHeapSize && memory.jsHeapSizeLimit) {
    const memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    if (memoryUsage > 0.9) {
      issues.push({
        severity: 'critical',
        type: 'memory',
        message: `Memory usage is ${Math.round(memoryUsage * 100)}% (critical threshold)`,
      });
    } else if (memoryUsage > 0.7) {
      issues.push({
        severity: 'warning',
        type: 'memory',
        message: `Memory usage is ${Math.round(memoryUsage * 100)}% (approaching limit)`,
      });
    }
  }

  // Check FPS
  if (fps < 30) {
    issues.push({
      severity: 'critical',
      type: 'fps',
      message: `Frame rate is ${fps} FPS (should be close to 60 FPS)`,
    });
  } else if (fps < 50) {
    issues.push({
      severity: 'warning',
      type: 'fps',
      message: `Frame rate is ${fps} FPS (below optimal 60 FPS)`,
    });
  }

  return issues;
}
