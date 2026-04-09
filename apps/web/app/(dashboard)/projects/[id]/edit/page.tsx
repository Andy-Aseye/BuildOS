import Link from 'next/link';
import { EditProjectForm } from '@/components/project/edit-project-form';

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <div className="mb-6">
        <Link href={`/projects/${id}`} className="text-sm text-[var(--primary)] hover:underline">
          ← Back to project
        </Link>
        <h1 className="text-2xl font-semibold mt-2">Edit project</h1>
      </div>
      <EditProjectForm projectId={id} />
    </div>
  );
}
