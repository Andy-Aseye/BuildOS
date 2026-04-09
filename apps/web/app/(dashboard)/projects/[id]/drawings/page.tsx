import { ProjectDrawings } from '@/components/project/project-drawings';

export default async function ProjectDrawingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Drawings</h2>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        Track drawing packages, revisions, and review status.
      </p>
      <ProjectDrawings projectId={id} />
    </div>
  );
}
