import promClient from "prom-client";

promClient.collectDefaultMetrics({ prefix: "elegance_" });

export const register = promClient.register;

export const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: "elegance_http_request_duration_ms",
  help: "Duration of HTTP requests in ms",
  labelNames: ["method", "route", "status_code"],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
});

export const activeRequests = new promClient.Gauge({
  name: "elegance_active_requests",
  help: "Number of currently active HTTP requests",
});

export const dbQueryDurationHistogram = new promClient.Histogram({
  name: "elegance_db_query_duration_ms",
  help: "Duration of database queries in ms",
  labelNames: ["operation", "table"],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500],
});
