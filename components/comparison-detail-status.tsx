import { Alert, Paragraph, Spinner } from "rk-designsystem";

export function ComparisonDetailLoading() {
  return (
    <div role="status" className="flex items-center gap-3 py-6">
      <Spinner data-size="sm" aria-hidden />
      <Paragraph data-size="sm">Henter data…</Paragraph>
    </div>
  );
}

export function ComparisonDetailError({ message }: { message: string }) {
  return (
    <Alert data-color="danger" data-size="sm" title="Kunne ikke hente data">
      {message}
    </Alert>
  );
}
