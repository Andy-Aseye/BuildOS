import { ProjectReports } from '@/components/project/project-reports';

export default async function ProjectReportsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Reports</h2>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        Download a client-ready PDF with timeline, diary highlights, and optional budget snapshot.
      </p>
      <ProjectReports projectId={id} />
    </div>
  );
}
