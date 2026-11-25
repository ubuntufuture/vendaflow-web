"use client";
import { useReportWebVitals } from "next/web-vitals";
// Local instrumentation only. No transmission, cookies, identity, URL, or analytics vendor.
export function Vitals() {
  useReportWebVitals((metric) => {
    if (!["LCP", "INP", "CLS", "FCP", "TTFB"].includes(metric.name)) return;
    window.dispatchEvent(
      new CustomEvent("venda:web-vital", {
        detail: {
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
        },
      }),
    );
  });
  return null;
}
