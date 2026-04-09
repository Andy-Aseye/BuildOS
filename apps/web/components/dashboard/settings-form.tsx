'use client';

import { useEffect, useState } from 'react';
import { useCurrentTenant, useUpdateTenant } from '@/lib/hooks/use-project-queries';
import { SectionCard } from '@/components/ui/section-card';
import { SkeletonSectionCard } from '@/components/ui/skeleton';

export function SettingsForm() {
  const { data: tenant, isLoading, error } = useCurrentTenant();
  const update = useUpdateTenant();
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant) return;
    setName(tenant.name);
    setLogoUrl(tenant.logoUrl ?? '');
    setPrimaryColor(tenant.primaryColor ?? '');
  }, [tenant]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      await update.mutateAsync({
        name: name.trim(),
        ...(logoUrl.trim() ? { logoUrl: logoUrl.trim() } : { logoUrl: undefined }),
        ...(primaryColor.trim() ? { primaryColor: primaryColor.trim() } : { primaryColor: undefined }),
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  if (isLoading) return (
    <div className="max-w-2xl space-y-6">
      <SkeletonSectionCard lines={3} />
      <SkeletonSectionCard lines={4} />
      <SkeletonSectionCard lines={2} />
    </div>
  );
  if (error || !tenant) return <p className="text-sm text-[var(--status-red)]">{error instanceof Error ? error.message : 'Could not load workspace'}</p>;

  const inputCls = 'w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent';

  return (
    <div className="max-w-2xl space-y-6">
      <SectionCard title="Company Info" subtitle={`Slug: ${tenant.slug}`}>
        <form onSubmit={onSubmit} className="space-y-5">
          {formError && (
            <p className="text-sm text-[var(--status-red)] bg-red-50 border border-red-100 rounded-xl px-3 py-2">{formError}</p>
          )}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Company name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </div>
          <button
            type="submit"
            disabled={update.isPending}
            className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-medium rounded-xl disabled:opacity-60 transition-colors"
          >
            {update.isPending ? 'Saving…' : 'Save'}
          </button>
        </form>
      </SectionCard>

      <SectionCard title="Branding">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Logo URL</label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Primary color (hex)</label>
            <div className="flex items-center gap-3">
              <input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#2563EB"
                className={`${inputCls} font-mono max-w-xs`}
              />
              {primaryColor && (
                <div className="w-10 h-10 rounded-xl border border-[var(--border)]" style={{ backgroundColor: primaryColor }} />
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="WhatsApp Integration" subtitle="Connect your business WhatsApp for field data collection">
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-[var(--border)]">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="#25D366"/>
                <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" stroke="#25D366" strokeWidth="1.5" fill="none"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--text-primary)]">Meta WhatsApp Cloud API</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Field workers can send diary updates, attendance reports, and cost logs via WhatsApp.
                The system uses AI to classify and store messages automatically.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-[var(--text-secondary)]">How it works</h4>
            <div className="grid gap-3">
              {[
                { step: '1', title: 'Configure webhook', desc: 'Point your Meta App webhook to your API endpoint: POST /webhooks/whatsapp' },
                { step: '2', title: 'Set environment variables', desc: 'WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET' },
                { step: '3', title: 'Add team phone numbers', desc: 'Ensure team members have their WhatsApp phone numbers set in their profiles' },
                { step: '4', title: 'Start receiving data', desc: 'Messages are classified by AI into diary entries, attendance logs, or cost entries' },
              ].map((item) => (
                <div key={item.step} className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
            <p className="text-xs text-blue-700">
              <span className="font-semibold">Required env variables:</span>{' '}
              WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET, WHATSAPP_MEDIA_BUCKET.
              Set these in your API server environment to enable WhatsApp integration.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Danger Zone" className="border-red-200">
        <p className="text-sm text-[var(--text-muted)]">
          Workspace deletion is not yet available. Contact support if you need to remove your workspace.
        </p>
      </SectionCard>
    </div>
  );
}
