import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { isLeaderboardApiEnabled, triggerLeaderboardSync } from '../backend/api/leaderboardApi';
import { refreshLocalSqliteLeaderboardFromSnapshot } from './utils/localLeaderboardSqlite';

type RefreshDbOptions = {
  campusIds?: number[];
};

type LocalDbContextValue = {
  isRefreshingDb: boolean;
  refreshDb: (options?: RefreshDbOptions) => Promise<void>;
};

const LocalDbContext = createContext<LocalDbContextValue>({
  isRefreshingDb: false,
  refreshDb: async (_options?: RefreshDbOptions) => {},
});

export function LocalDbProvider({ children }: { children: React.ReactNode }) {
  const [isRefreshingDb, setIsRefreshingDb] = useState(false);

  const refreshDb = useCallback(async (options?: RefreshDbOptions) => {
    if (isRefreshingDb) return;
    setIsRefreshingDb(true);
    try {
      if (isLeaderboardApiEnabled()) {
        await triggerLeaderboardSync({ campusIds: options?.campusIds });
      }
      await refreshLocalSqliteLeaderboardFromSnapshot();
    } finally {
      setIsRefreshingDb(false);
    }
  }, [isRefreshingDb]);

  const value = useMemo(
    () => ({
      isRefreshingDb,
      refreshDb,
    }),
    [isRefreshingDb, refreshDb],
  );

  return <LocalDbContext.Provider value={value}>{children}</LocalDbContext.Provider>;
}

export function useLocalDb() {
  return useContext(LocalDbContext);
}
