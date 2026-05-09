import { useQuery } from "@tanstack/react-query";

interface EnvResponse {
  environment: 'production' | 'development';
  nodeEnv: string;
  replitDeployment: boolean;
}

export function AdminEnvBadge() {
  const { data, isLoading } = useQuery<EnvResponse>({
    queryKey: ['/api/admin/env'],
    staleTime: 60_000,
  });

  if (isLoading || !data) {
    return (
      <span
        className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
        style={{ background: '#2C2C2E', color: '#8E8E93' }}
      >
        <span className="h-2 w-2 rounded-full" style={{ background: '#8E8E93' }} />
        Checking…
      </span>
    );
  }

  const isProd = data.environment === 'production';
  return (
    <span
      data-testid="admin-env-badge"
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
      style={{
        background: isProd ? '#3a0f0f' : '#0f2a3a',
        color: isProd ? '#ff6b6b' : '#5ac8fa',
        border: `1px solid ${isProd ? '#ff6b6b' : '#5ac8fa'}`,
      }}
      title={isProd ? 'You are writing to the LIVE production database.' : 'You are writing to the development database.'}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: isProd ? '#ff6b6b' : '#5ac8fa', boxShadow: `0 0 6px ${isProd ? '#ff6b6b' : '#5ac8fa'}` }}
      />
      {isProd ? 'PROD' : 'DEV'}
    </span>
  );
}
