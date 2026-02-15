/**
 * Performance monitoring and optimization utilities
 * Web Vitals tracking, bundle analysis, and performance metrics
 */

// Web Vitals types
export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta?: number;
}

// Web Vitals thresholds (WCAG 2.1 AA)
export const VITALS_THRESHOLDS = {
  // Largest Contentful Paint (LCP) - should be < 2.5s
  LCP: {
    good: 2500,
    needsImprovement: 4000,
  },
  // First Input Delay (FID) - should be < 100ms
  FID: {
    good: 100,
    needsImprovement: 300,
  },
  // Cumulative Layout Shift (CLS) - should be < 0.1
  CLS: {
    good: 0.1,
    needsImprovement: 0.25,
  },
  // First Contentful Paint (FCP) - should be < 1.8s
  FCP: {
    good: 1800,
    needsImprovement: 3000,
  },
  // Time to Interactive (TTI) - should be < 3.8s
  TTI: {
    good: 3800,
    needsImprovement: 7300,
  },
};

// Performance observer
class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private observers: PerformanceObserver[] = [];
  private metrics: Map<string, PerformanceMetric> = new Map();
  private onMetricCallback?: (metric: PerformanceMetric) => void;

  private constructor() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.initObservers();
    }
  }

  static getInstance(): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
    }
    return this.instance;
  }

  private initObservers() {
    // Largest Contentful Paint (LCP)
    this.observe('largest-contentful-paint', (entries) => {
      const lastEntry = entries[entries.length - 1] as any;
      this.recordMetric('LCP', lastEntry.renderTime || lastEntry.loadTime);
    });

    // First Input Delay (FID)
    this.observe('first-input', (entries) => {
      const firstEntry = entries[0] as any;
      this.recordMetric('FID', firstEntry.processingStart - firstEntry.startTime);
    });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    this.observe('layout-shift', (entries) => {
      for (const entry of entries) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      this.recordMetric('CLS', clsValue);
    });

    // First Contentful Paint (FCP)
    this.observe('paint', (entries) => {
      const fcpEntry = entries.find(e => e.name === 'first-contentful-paint');
      if (fcpEntry) {
        this.recordMetric('FCP', fcpEntry.startTime);
      }
    });

    // Time to Interactive (TTI) - approximate using long tasks
    this.observe('longtask', (entries) => {
      const longTasks = entries.length;
      const avgDuration = entries.reduce((sum, e) => sum + e.duration, 0) / longTasks;
      this.metrics.set('LONG_TASKS', {
        name: 'Long Tasks',
        value: longTasks,
        rating: longTasks > 10 ? 'poor' : longTasks > 5 ? 'needs-improvement' : 'good',
      });
    });
  }

  private observe(type: string, callback: (entries: PerformanceEntryList) => void) {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });

      observer.observe({ type, buffered: true } as any);
      this.observers.push(observer);
    } catch (err) {
      console.warn(`Failed to observe ${type}:`, err);
    }
  }

  private recordMetric(name: string, value: number) {
    const rating = this.getRating(name, value);
    const metric: PerformanceMetric = { name, value, rating };

    this.metrics.set(name, metric);

    if (this.onMetricCallback) {
      this.onMetricCallback(metric);
    }

    // Log poor metrics in development
    if (process.env.NODE_ENV === 'development' && rating === 'poor') {
      console.warn(`Poor ${name}: ${value.toFixed(2)}`, metric);
    }
  }

  private getRating(name: string, value: number): PerformanceMetric['rating'] {
    const thresholds = VITALS_THRESHOLDS[name as keyof typeof VITALS_THRESHOLDS];
    if (!thresholds) return 'good';

    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.needsImprovement) return 'needs-improvement';
    return 'poor';
  }

  onMetric(callback: (metric: PerformanceMetric) => void) {
    this.onMetricCallback = callback;
  }

  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Export singleton
export const performanceMonitor = PerformanceMonitor.getInstance();

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = React.useState<PerformanceMetric[]>([]);

  React.useEffect(() => {
    // Set initial metrics
    setMetrics(performanceMonitor.getMetrics());

    // Listen for new metrics
    const unsubscribe = performanceMonitor.onMetric((metric) => {
      setMetrics((prev) => {
        const index = prev.findIndex(m => m.name === metric.name);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = metric;
          return updated;
        }
        return [...prev, metric];
      });
    });

    return () => {
      // Cleanup handled by singleton
    };
  }, []);

  return metrics;
}

// Bundle size analyzer (dev only)
export const BundleAnalyzer = {
  /**
   * Analyze loaded scripts
   */
  analyzeScripts(): { name: string; size: number }[] {
    const scripts = Array.from(document.querySelectorAll('script[src]'));

    return scripts.map(script => ({
      name: (script as HTMLScriptElement).src.split('/').pop() || 'unknown',
      size: 0, // Size would need to be fetched via fetch() with Content-Length
    }));
  },

  /**
   * Analyze lazy-loaded chunks
   */
  analyzeChunks(): string[] {
    const chunks: string[] = [];

    // Next.js specific
    if ((window as any).__NEXT_DATA__) {
      const buildManifest = (window as any).__BUILD_MANIFEST;
      if (buildManifest) {
        Object.keys(buildManifest).forEach(route => {
          chunks.push(...buildManifest[route]);
        });
      }
    }

    return Array.from(new Set(chunks));
  },
};

// Image optimization helpers
export const ImageOptimization = {
  /**
   * Check if image is using lazy loading
   */
  isLazyLoaded(img: HTMLImageElement): boolean {
    return img.loading === 'lazy';
  },

  /**
   * Check if image has proper dimensions
   */
  hasDimensions(img: HTMLImageElement): boolean {
    return !!(img.width && img.height);
  },

  /**
   * Get all images on page
   */
  getAllImages(): HTMLImageElement[] {
    return Array.from(document.querySelectorAll('img'));
  },

  /**
   * Audit images for optimization
   */
  auditImages(): {
    total: number;
    lazyLoaded: number;
    withDimensions: number;
    oversized: number;
  } {
    const images = this.getAllImages();

    return {
      total: images.length,
      lazyLoaded: images.filter(img => this.isLazyLoaded(img)).length,
      withDimensions: images.filter(img => this.hasDimensions(img)).length,
      oversized: images.filter(img => {
        const natural = img.naturalWidth * img.naturalHeight;
        const display = img.width * img.height;
        return natural > display * 2; // Image is more than 2x larger than needed
      }).length,
    };
  },
};

// Memory monitoring
export const MemoryMonitor = {
  /**
   * Get current memory usage (Chrome only)
   */
  getUsage(): { used: number; total: number; limit: number } | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      };
    }
    return null;
  },

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  },

  /**
   * Check if memory usage is high
   */
  isHighUsage(): boolean {
    const usage = this.getUsage();
    if (!usage) return false;

    const percentUsed = (usage.used / usage.limit) * 100;
    return percentUsed > 80;
  },
};

// Network monitoring
export const NetworkMonitor = {
  /**
   * Get network information
   */
  getConnection(): {
    effectiveType: string;
    downlink: number;
    rtt: number;
    saveData: boolean;
  } | null {
    if ('connection' in navigator || 'mozConnection' in navigator || 'webkitConnection' in navigator) {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

      return {
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
        saveData: connection.saveData || false,
      };
    }
    return null;
  },

  /**
   * Check if connection is slow
   */
  isSlowConnection(): boolean {
    const connection = this.getConnection();
    if (!connection) return false;

    return ['slow-2g', '2g'].includes(connection.effectiveType) || connection.saveData;
  },

  /**
   * Get recommended quality based on connection
   */
  getRecommendedQuality(): '4k' | '1080p' | '720p' | '480p' | '360p' {
    const connection = this.getConnection();
    if (!connection) return '1080p';

    switch (connection.effectiveType) {
      case '4g':
        return connection.downlink >= 10 ? '4k' : '1080p';
      case '3g':
        return '720p';
      case '2g':
      case 'slow-2g':
        return '360p';
      default:
        return '480p';
    }
  },
};

// Request timing helper
export function measureRequest(name: string, request: () => Promise<any>): Promise<any> {
  const startMark = `${name}-start`;
  const endMark = `${name}-end`;
  const measureName = `${name}-duration`;

  performance.mark(startMark);

  return request()
    .then(result => {
      performance.mark(endMark);
      performance.measure(measureName, startMark, endMark);

      const measure = performance.getEntriesByName(measureName)[0];
      console.log(`${name}: ${measure.duration.toFixed(2)}ms`);

      return result;
    })
    .catch(error => {
      performance.mark(endMark);
      performance.measure(measureName, startMark, endMark);

      throw error;
    });
}

// For React import
import * as React from 'react';
