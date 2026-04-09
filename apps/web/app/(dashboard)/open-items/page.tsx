import { OpenItemsPanel } from '@/components/dashboard/open-items-panel';
import { PageHeader } from '@/components/ui/page-header';

export default function OpenItemsPage() {
  return (
    <div>
      <PageHeader title="Open Items" description="Track RFIs and action items across all projects" />
      <OpenItemsPanel />
    </div>
  );
}
