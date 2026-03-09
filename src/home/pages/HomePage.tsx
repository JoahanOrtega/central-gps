import { HomeNavigationProvider } from "../context/home-navigation-provider";
import { HomeLayout } from "../components/layout/HomeLayout";

export const HomePage = () => {
  return (
    <HomeNavigationProvider>
      <HomeLayout />
    </HomeNavigationProvider>
  );
};
