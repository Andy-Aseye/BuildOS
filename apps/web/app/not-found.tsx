import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[var(--content-bg)] px-4">
      <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Page not found</h1>
      <p className="text-sm text-[var(--text-muted)] text-center max-w-md">
        This URL does not exist or has moved.
      </p>
      <Link
        href="/login"
        className="text-sm font-medium text-[var(--primary)] hover:underline"
      >
        Back to sign in
      </Link>
    </div>
  );
}
