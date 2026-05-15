"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface Account {
  id: string;
  ig_user_id: string;
  ig_username: string;
  ig_name: string;
  ig_avatar: string;
  active: boolean;
}

interface ActiveAccountCtx {
  account: Account | null;
  setAccount: (a: Account | null) => void;
}

const ActiveAccountContext = createContext<ActiveAccountCtx>({
  account: null,
  setAccount: () => {},
});

export function ActiveAccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);

  return (
    <ActiveAccountContext.Provider value={{ account, setAccount }}>
      {children}
    </ActiveAccountContext.Provider>
  );
}

export function useActiveAccount() {
  return useContext(ActiveAccountContext);
}
