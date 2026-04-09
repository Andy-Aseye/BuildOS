import { SettingsForm } from '@/components/dashboard/settings-form';
import { PageHeader } from '@/components/ui/page-header';

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Configure your workspace" />
      <SettingsForm />
    </div>
  );
}
