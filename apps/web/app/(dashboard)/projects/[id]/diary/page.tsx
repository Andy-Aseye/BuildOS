import { ProjectDiary } from '@/components/project/project-diary';

export default async function ProjectDiaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Site diary</h2>
      <ProjectDiary projectId={id} />
    </div>
  );
}
