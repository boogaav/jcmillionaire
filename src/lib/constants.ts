// App Configuration
export const APP_ID = 'app_7709630683b291dac751ba3175d9fbcd';

// JC Token Contract on World Chain
export const JC_TOKEN_ADDRESS = '0x1e80Dd9030408Be6a313ca0482A2a21b753B6c64';

// Daily limits
export const DAILY_POOL_TOTAL = 1_000_000;
export const DEFAULT_PLAYS_PER_DAY = 1; // Users can earn more via referrals

// Question config
export const QUESTIONS_PER_RUN = 15;
export const QUESTION_TIME_LIMIT_SECONDS = 30;

// Prize ladder (default values)
export const DEFAULT_PRIZE_LADDER = [
  { questionNumber: 1, prizeAmount: 25, isSafeHaven: false },
  { questionNumber: 2, prizeAmount: 50, isSafeHaven: false },
  { questionNumber: 3, prizeAmount: 100, isSafeHaven: false },
  { questionNumber: 4, prizeAmount: 175, isSafeHaven: false },
  { questionNumber: 5, prizeAmount: 250, isSafeHaven: true },
  { questionNumber: 6, prizeAmount: 400, isSafeHaven: false },
  { questionNumber: 7, prizeAmount: 650, isSafeHaven: false },
  { questionNumber: 8, prizeAmount: 1000, isSafeHaven: false },
  { questionNumber: 9, prizeAmount: 1500, isSafeHaven: false },
  { questionNumber: 10, prizeAmount: 2250, isSafeHaven: true },
  { questionNumber: 11, prizeAmount: 3250, isSafeHaven: false },
  { questionNumber: 12, prizeAmount: 5000, isSafeHaven: false },
  { questionNumber: 13, prizeAmount: 7500, isSafeHaven: false },
  { questionNumber: 14, prizeAmount: 12000, isSafeHaven: false },
  { questionNumber: 15, prizeAmount: 20000, isSafeHaven: false },
];

// Prize ladder for LIVE shows — classic "Who Wants to Be a Millionaire" values, in $JC.
// Safe havens at Q5 and Q10 (standard show format).
export const LIVE_PRIZE_LADDER = [
  { questionNumber: 1, prizeAmount: 100, isSafeHaven: false },
  { questionNumber: 2, prizeAmount: 500, isSafeHaven: false },
  { questionNumber: 3, prizeAmount: 1000, isSafeHaven: false },
  { questionNumber: 4, prizeAmount: 2000, isSafeHaven: false },
  { questionNumber: 5, prizeAmount: 4000, isSafeHaven: true },
  { questionNumber: 6, prizeAmount: 5000, isSafeHaven: false },
  { questionNumber: 7, prizeAmount: 10000, isSafeHaven: false },
  { questionNumber: 8, prizeAmount: 35000, isSafeHaven: false },
  { questionNumber: 9, prizeAmount: 50000, isSafeHaven: false },
  { questionNumber: 10, prizeAmount: 65000, isSafeHaven: true },
  { questionNumber: 11, prizeAmount: 100000, isSafeHaven: false },
  { questionNumber: 12, prizeAmount: 125000, isSafeHaven: false },
  { questionNumber: 13, prizeAmount: 250000, isSafeHaven: false },
  { questionNumber: 14, prizeAmount: 500000, isSafeHaven: false },
  { questionNumber: 15, prizeAmount: 1000000, isSafeHaven: false },
];

// Safe havens
export const SAFE_HAVEN_QUESTIONS = [5, 10];

// Lifelines
export const LIFELINES = {
  FIFTY_FIFTY: 'fifty_fifty',
  HINT: 'hint', 
  CHAIN_SCAN: 'chain_scan',
} as const;

export type LifelineType = typeof LIFELINES[keyof typeof LIFELINES];

// World App Deep Link format
// Format: https://world.org/mini-app?app_id={APP_ID}&path={encodedPath}
// Note: World App expects certain chars to remain unescaped in the path.
export const encodeWorldAppPath = (path: string) =>
  encodeURIComponent(path)
    .replace(/%2F/g, '/')   // Keep slashes unescaped
    .replace(/%3F/g, '?')   // Keep ? unescaped for query params
    .replace(/%3D/g, '=');  // Keep = unescaped for query params

export const getWorldAppLink = (path: string) =>
  `https://world.org/mini-app?app_id=${APP_ID}&path=${encodeWorldAppPath(path)}`;

// Format JC amount
export const formatJC = (amount: number): string => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}K`;
  }
  return amount.toLocaleString();
};
