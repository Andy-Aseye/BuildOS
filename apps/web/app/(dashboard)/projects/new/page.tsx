import Link from 'next/link';
import { CreateProjectForm } from '@/components/dashboard/create-project-form';
import { PageHeader } from '@/components/ui/page-header';

export default function NewProjectPage() {
  return (
    <div>
      <Link href="/projects" className="text-sm text-[var(--primary)] hover:underline">
        &larr; Back to projects
      </Link>
      <div className="mt-4">
        <PageHeader title="New Project" description="A unique project code is generated automatically (e.g. ABC-01)." />
      </div>
      <CreateProjectForm />
    </div>
  );
}
