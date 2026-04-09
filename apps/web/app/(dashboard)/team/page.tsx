import { OrgTeam } from '@/components/dashboard/org-team';
import { PageHeader } from '@/components/ui/page-header';

export default function TeamPage() {
  return (
    <div>
      <PageHeader title="Team" description="Manage your workspace members" />
      <OrgTeam />
    </div>
  );
}
