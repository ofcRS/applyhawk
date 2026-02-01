import { useState } from "react";
import AppPage from "./pages/AppPage";
import Landing from "./pages/Landing";

function App() {
  const [showApp, setShowApp] = useState(false);

  if (showApp) {
    return <AppPage onBack={() => setShowApp(false)} />;
  }

  return <Landing onGetStarted={() => setShowApp(true)} />;
}

export default App;
