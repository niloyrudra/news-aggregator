import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { FeedPage } from './features/feed/FeedPage';
import { PreferencesPage } from './features/preferences/PreferencesPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main>
          <Routes>
            <Route path="/" element={<FeedPage />} />
            <Route path="/preferences" element={<PreferencesPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;