import { ProjectFiles } from '@/components/project/project-files';

export default async function ProjectFilesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Files</h2>
      <ProjectFiles projectId={id} />
    </div>
  );
}
