// Auth is currently disabled — every route is open, no account required.
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
