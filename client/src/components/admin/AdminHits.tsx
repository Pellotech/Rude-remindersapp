import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Search, Target } from "lucide-react";
import { RichReminderNotification } from "@/components/RichReminderNotification";
import type { Reminder } from "@shared/schema";

interface HitsResponse {
  hits: Reminder[];
  count: number;
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function AdminHits() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Reminder | null>(null);
  const { data, isLoading } = useQuery<HitsResponse>({
    queryKey: ['/api/admin/reminder-hits'],
  });

  const filtered = useMemo(() => {
    const list = data?.hits ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(r =>
      r.title?.toLowerCase().includes(q) ||
      r.rudeMessage?.toLowerCase().includes(q) ||
      r.hitComment?.toLowerCase().includes(q)
    );
  }, [data, search]);

  return (
    <div
      className="rounded-xl border p-5"
      style={{ background: '#1C1C1E', borderColor: '#38383A' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5" style={{ color: '#C9A063' }} />
          <h2 className="text-lg font-semibold text-white">It Hit — Feedback</h2>
        </div>
        <span className="text-xs" style={{ color: '#8E8E93' }}>
          {isLoading ? 'Loading…' : `${filtered.length} of ${data?.count ?? 0}`}
        </span>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#8E8E93' }} />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by message or comment"
          className="pl-9 border-0"
          style={{ background: '#2C2C2E', color: '#FFFFFF' }}
          data-testid="input-admin-hits-search"
        />
      </div>

      <div className="overflow-x-auto rounded-lg" style={{ background: '#000000' }}>
        <table className="min-w-full text-sm" style={{ color: '#E5E5EA' }}>
          <thead>
            <tr style={{ background: '#1C1C1E', color: '#8E8E93' }} className="text-left text-xs uppercase tracking-wider">
              <th className="px-3 py-2 font-medium">Message</th>
              <th className="px-3 py-2 font-medium">Comment</th>
              <th className="px-3 py-2 font-medium">Rudeness</th>
              <th className="px-3 py-2 font-medium">Marked hit</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={4} className="px-3 py-6 text-center" style={{ color: '#8E8E93' }}>Loading…</td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-6 text-center" style={{ color: '#8E8E93' }}>No reminders marked "It Hit" yet.</td></tr>
            )}
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="border-t cursor-pointer hover:brightness-125 transition-[filter]"
                style={{ borderColor: '#1C1C1E' }}
                onClick={() => setSelected(r)}
                data-testid={`row-hit-${r.id}`}
              >
                <td className="px-3 py-2 max-w-xs truncate">{r.rudeMessage || r.title}</td>
                <td className="px-3 py-2 max-w-xs truncate" style={{ color: r.hitComment ? '#E5E5EA' : '#8E8E93' }}>
                  {r.hitComment || '—'}
                </td>
                <td className="px-3 py-2">{r.rudenessLevel}</td>
                <td className="px-3 py-2 text-xs" style={{ color: '#8E8E93' }}>{formatDate(r.hitAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <RichReminderNotification
          isOpen={!!selected}
          onClose={() => setSelected(null)}
          reminder={selected}
          showActionButtons={false}
        />
      )}
    </div>
  );
}
