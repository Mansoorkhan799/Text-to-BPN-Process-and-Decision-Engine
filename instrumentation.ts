// Minimal instrumentation file to prevent OpenTelemetry initialization errors
// This file prevents Next.js from trying to initialize tracing in serverless environments

export async function register() {
  // Explicitly disable all OpenTelemetry tracing
  if (typeof process !== 'undefined') {
    process.env.OTEL_SDK_DISABLED = 'true';
    process.env.NEXT_TELEMETRY_DISABLED = '1';
  }
  
  // No-op registration to prevent default tracing initialization
  return;
}
