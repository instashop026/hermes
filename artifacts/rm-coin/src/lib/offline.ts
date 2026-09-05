// Offline preview mode.
//
// This prototype's real session/miner/balance come from the `api-server`
// (Postgres + auth). When you run the app directly in a browser without that
// backend, every API call 404s and the auth gate rejects the session.
//
// To keep the social features (Models / Explore / Reveal / Feed) testable with
// no backend, we fall back to a local mock session the moment the auth call
// fails. The social pages are fully client-side (state lives in localStorage),
// so this is enough to drive the whole experience.

// Toggle this to force offline mock mode on/off regardless of backend reachability.

export const ENABLE_OFFLINE_FALLBACK = true;

let offlineMode = false;

export const setOfflineMode = (value: boolean): void => {
  offlineMode = value;
};

export const isOfflineMode = (): boolean => offlineMode;

let _offlineBalance = 50;

export const getOfflineBalance = (): number => _offlineBalance;

export const setOfflineBalance = (value: number): void => {
  _offlineBalance = Math.max(0, value);
};

export const spendOfflineBalance = (amount: number): boolean => {
  if (_offlineBalance < amount) return false;
  _offlineBalance -= amount;
  return true;
};

export const OFFLINE_USER: any = {
  id: 'offline-preview',
  telegramUserId: '0',
  username: 'preview',
  firstName: 'Preview',
  lastName: 'Miner',
  handle: '@preview',
  bio: 'Testing the RM Coin social signal. Mining by day, revealing by night.',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=84',
  get balance() {
    return getOfflineBalance();
  },
  createdAt: new Date(),
};

export const OFFLINE_MINER: any = {
  level: 1,
  name: 'Signal Drill',
  miningRate: 0.12,
  maxEnergyMinutes: 240,
  currentEnergyMinutes: 180,
  minedAmount: 12.5,
  balance: 50,
  isMining: true,
  lastUpdatedAt: new Date(),
  nextUpgrade: null,
};

export const OFFLINE_ACTIVITY: any[] = [];
