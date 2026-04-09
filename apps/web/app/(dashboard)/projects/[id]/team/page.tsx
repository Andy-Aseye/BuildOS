import { ProjectTeam } from '@/components/project/project-team';

export default async function ProjectTeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Team</h2>
      <ProjectTeam projectId={id} />
    </div>
  );
}
