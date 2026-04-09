import { ProjectMaterials } from '@/components/project/project-materials';

export default async function ProjectMaterialsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Materials</h2>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        Request materials with line items and estimated totals; update approval status as you go.
      </p>
      <ProjectMaterials projectId={id} />
    </div>
  );
}
