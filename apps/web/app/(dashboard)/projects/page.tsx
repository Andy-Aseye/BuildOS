import { ProjectList } from '@/components/dashboard/project-list';
import { PageHeader } from '@/components/ui/page-header';

export default function ProjectsPage() {
  return (
    <div>
      <PageHeader title="Projects" description="Manage and track all your construction projects" />
      <ProjectList />
    </div>
  );
}
