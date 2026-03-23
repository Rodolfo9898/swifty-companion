import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { refreshLocalSqliteLeaderboardFromSnapshot } from './utils/localLeaderboardSqlite';

type LocalDbContextValue = {
  isRefreshingDb: boolean;
  refreshDb: () => Promise<void>;
};

const LocalDbContext = createContext<LocalDbContextValue>({
  isRefreshingDb: false,
  refreshDb: async () => {},
});

export function LocalDbProvider({ children }: { children: React.ReactNode }) {
  const [isRefreshingDb, setIsRefreshingDb] = useState(false);

  const refreshDb = useCallback(async () => {
    if (isRefreshingDb) return;
    setIsRefreshingDb(true);
    try {
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
