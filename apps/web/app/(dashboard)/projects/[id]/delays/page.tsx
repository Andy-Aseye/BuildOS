import { ProjectDelays } from '@/components/project/project-delays';

export default async function ProjectDelaysPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Delays</h2>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        Log schedule impacts and optional links to RFIs; mark PM review when verified.
      </p>
      <ProjectDelays projectId={id} />
    </div>
  );
}
