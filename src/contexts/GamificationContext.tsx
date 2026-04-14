// GamificationContext stub — provides a no-op addXP() for MealsPage
import { createContext, useContext, useCallback, type FC, type ReactNode } from "react";

interface GamificationContextValue {
  addXP: (amount: number) => void;
}

const GamificationContext = createContext<GamificationContextValue>({
  addXP: () => {},
});

export const useGamification = () => useContext(GamificationContext);

export const GamificationProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const addXP = useCallback((amount: number) => {
    console.log(`[Gamification] +${amount} XP (stub — no gamification system in NeuroPhysio)`);
  }, []);

  return (
    <GamificationContext.Provider value={{ addXP }}>
      {children}
    </GamificationContext.Provider>
  );
};
