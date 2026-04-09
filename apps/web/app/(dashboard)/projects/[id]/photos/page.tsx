import { ProjectPhotos } from '@/components/project/project-photos';

export default async function ProjectPhotosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Photos</h2>
      <ProjectPhotos projectId={id} />
    </div>
  );
}
