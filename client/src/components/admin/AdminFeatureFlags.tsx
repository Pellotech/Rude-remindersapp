import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { ToggleLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

const FLAG_LABELS: Record<string, string> = {
  facebook_login: 'Facebook Login',
  guest_mode: 'Guest Mode',
  maintenance_mode: 'Maintenance Mode',
};

export function AdminFeatureFlags() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<{ flags: FeatureFlag[] }>({
    queryKey: ['/api/admin/feature-flags'],
  });

  const toggle = useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      return apiRequest(`/api/admin/feature-flags/${encodeURIComponent(key)}`, {
        method: 'PATCH',
        body: { enabled } as any,
      });
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/feature-flags'] });
      toast({
        title: 'Flag updated',
        description: `${FLAG_LABELS[vars.key] ?? vars.key} is now ${vars.enabled ? 'ON' : 'OFF'}.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Update failed',
        description: err?.message || 'Could not update the flag.',
        variant: 'destructive',
      });
    },
  });

  const flags = data?.flags ?? [];

  return (
    <div
      className="rounded-xl border p-5"
      style={{ background: '#1C1C1E', borderColor: '#38383A' }}
    >
      <div className="flex items-center gap-2 mb-1">
        <ToggleLeft className="h-5 w-5" style={{ color: '#C9A063' }} />
        <h2 className="text-lg font-semibold text-white">Feature Toggles</h2>
      </div>
      <p className="text-xs mb-4" style={{ color: '#8E8E93' }}>
        Switch features on or off without a redeploy. Changes take effect on the next request.
      </p>

      {isLoading ? (
        <div className="text-sm" style={{ color: '#8E8E93' }}>Loading flags…</div>
      ) : (
        <div className="space-y-2">
          {flags.map((f) => (
            <div
              key={f.key}
              data-testid={`flag-row-${f.key}`}
              className="flex items-center justify-between rounded-lg px-4 py-3"
              style={{ background: '#000000', border: '1px solid #2C2C2E' }}
            >
              <div className="min-w-0 pr-4">
                <div className="text-sm font-semibold text-white">
                  {FLAG_LABELS[f.key] ?? f.key}
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#8E8E93' }}>
                  {f.description || f.key}
                </div>
              </div>
              <Switch
                checked={f.enabled}
                disabled={toggle.isPending}
                onCheckedChange={(enabled) => toggle.mutate({ key: f.key, enabled })}
                data-testid={`flag-switch-${f.key}`}
              />
            </div>
          ))}
          {flags.length === 0 && (
            <div className="text-sm" style={{ color: '#8E8E93' }}>No flags configured yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
