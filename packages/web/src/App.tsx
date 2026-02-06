import { I18nProvider } from "./contexts/I18nContext";
import { StorageProvider } from "./contexts/StorageContext";
import { useHashRoute } from "./hooks/useHashRoute";
import AppLayout from "./layouts/AppLayout";
import LandingPage from "./pages/LandingPage";
import PrivacyPage from "./pages/PrivacyPage";
import ResumePage from "./pages/ResumePage";
import SettingsPage from "./pages/SettingsPage";
import WorkspacePage from "./pages/WorkspacePage";

function AppRouter() {
  const { route } = useHashRoute();

  if (route === "/" || route === "") {
    return <LandingPage />;
  }

  if (route === "/privacy") {
    return <PrivacyPage />;
  }

  // All #/app/* routes share AppLayout
  let page: React.ReactNode;
  switch (route) {
    case "/app/resume":
      page = <ResumePage />;
      break;
    case "/app/settings":
      page = <SettingsPage />;
      break;
    case "/app":
    default:
      page = <WorkspacePage />;
      break;
  }

  return <AppLayout>{page}</AppLayout>;
}

export default function App() {
  return (
    <I18nProvider>
      <StorageProvider>
        <AppRouter />
      </StorageProvider>
    </I18nProvider>
  );
}
