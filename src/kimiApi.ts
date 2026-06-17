export interface UsageSnapshot {
  timestamp: number;
  window5hRemaining: number;
  window5hLimit: number;
  weeklyRemaining: number;
  weeklyLimit: number;
  monthlyRemaining: number;
  monthlyLimit: number;
  concurrency?: number;
  concurrencyLimit?: number;
  window5hResetTime?: string;
  weeklyResetTime?: string;
}

interface UsageDetail {
  limit: string;
  remaining: string;
  resetTime?: string;
  used?: string;
}

interface UsageLimit {
  window: {
    duration: number;
    timeUnit: string;
  };
  detail: UsageDetail;
}

interface ParallelInfo {
  details: string[];
  limit: string;
}

interface KimiUsageResponse {
  usage: UsageDetail;
  limits: UsageLimit[];
  totalQuota: UsageDetail;
  parallel?: ParallelInfo;
}

const FIVE_HOUR_MINUTES = 300;

function parseCount(value: string): number {
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < 0) {
    return 0;
  }
  return n;
}

export class KimiApiClient {
  constructor(
    private apiKey: string,
    private baseUrl: string
  ) {}

  async fetchUsage(): Promise<UsageSnapshot> {
    const url = `${this.baseUrl}/coding/v1/usages`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        accept: 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    const data = (await res.json()) as KimiUsageResponse;

    const fiveHourLimit = data.limits.find(
      (l) => l.window.duration === FIVE_HOUR_MINUTES && l.window.timeUnit === 'TIME_UNIT_MINUTE'
    );

    if (!fiveHourLimit) {
      throw new Error('API 返回中未找到 5 小时滚动窗口数据');
    }

    const snapshot: UsageSnapshot = {
      timestamp: Date.now(),
      window5hRemaining: parseCount(fiveHourLimit.detail.remaining),
      window5hLimit: parseCount(fiveHourLimit.detail.limit),
      weeklyRemaining: parseCount(data.usage.remaining),
      weeklyLimit: parseCount(data.usage.limit),
      monthlyRemaining: parseCount(data.totalQuota.remaining),
      monthlyLimit: parseCount(data.totalQuota.limit),
      concurrency: data.parallel ? data.parallel.details.length : undefined,
      concurrencyLimit: data.parallel ? parseCount(data.parallel.limit) : undefined,
      window5hResetTime: fiveHourLimit.detail.resetTime,
      weeklyResetTime: data.usage.resetTime,
    };

    if (snapshot.window5hLimit === 0 || snapshot.weeklyLimit === 0) {
      throw new Error('API 返回的额度上限为 0，数据异常');
    }

    return snapshot;
  }
}

export function generateMockSnapshot(): UsageSnapshot {
  const now = Date.now();
  return {
    timestamp: now,
    window5hLimit: 100,
    window5hRemaining: 80,
    weeklyLimit: 100,
    weeklyRemaining: 60,
    monthlyLimit: 100,
    monthlyRemaining: 70,
    concurrency: 3,
    concurrencyLimit: 20,
    window5hResetTime: new Date(now + 5 * 60 * 60 * 1000).toISOString(),
    weeklyResetTime: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
