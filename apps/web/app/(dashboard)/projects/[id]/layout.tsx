import { ProjectHeader } from '@/components/project/project-header';
import { ProjectTabs } from '@/components/project/project-tabs';

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white border border-[var(--border)] overflow-hidden">
        <div className="p-6 pb-0">
          <ProjectHeader projectId={id} />
        </div>
        <div className="px-6">
          <ProjectTabs />
        </div>
      </div>
      <div className="rounded-2xl bg-white border border-[var(--border)] p-6">
        {children}
      </div>
    </div>
  );
}
