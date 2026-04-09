import { ProjectRfis } from '@/components/project/project-rfis';

export default async function ProjectRfisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">RFIs</h2>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        Requests for information — reference numbers are unique per project.
      </p>
      <ProjectRfis projectId={id} />
    </div>
  );
}
