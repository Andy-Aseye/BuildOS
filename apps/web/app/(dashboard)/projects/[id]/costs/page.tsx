import { ProjectCosts } from '@/components/project/project-costs';

export default async function ProjectCostsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Costs</h2>
      <ProjectCosts projectId={id} />
    </div>
  );
}
