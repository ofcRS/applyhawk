import { useState } from 'react';
import Landing from './pages/Landing';
import AppPage from './pages/AppPage';

function App() {
  const [showApp, setShowApp] = useState(false);

  if (showApp) {
    return <AppPage onBack={() => setShowApp(false)} />;
  }

  return <Landing onGetStarted={() => setShowApp(true)} />;
}

export default App;
