import { ProjectTimeline } from '@/components/project/project-timeline';

export default async function ProjectTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Timeline</h2>
      <ProjectTimeline projectId={id} />
    </div>
  );
}
