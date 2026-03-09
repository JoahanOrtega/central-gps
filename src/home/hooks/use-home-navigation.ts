import { useContext } from "react";
import { HomeNavigationContext } from "../context/home-navigation-provider";

export const useHomeNavigation = () => {
  const context = useContext(HomeNavigationContext);

  if (!context) {
    throw new Error(
      "useHomeNavigation must be used within HomeNavigationProvider",
    );
  }

  return context;
};
