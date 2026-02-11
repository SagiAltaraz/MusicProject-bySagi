import { Routes, Route } from 'react-router-dom';
import Header from './components/header/Header';
import Sidebar from './components/sidebar/Sidebar';
import TrackPlayer from './components/trackplayer/TrackPlayer';
import ChatAssistant from './components/chatassistant/ChatAssistant';
import HomePage from './pages/HomePage';
import CratesPage from './pages/CratesPage';

function App() {
  return (
    <div className="flex flex-col h-screen bg-bg-primary overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 pb-4 bg-bg-primary">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/crates" element={<CratesPage />} />
            <Route path="/crates/:crateId" element={<CratesPage />} />
          </Routes>
        </main>
      </div>
      <TrackPlayer />
      <ChatAssistant />
    </div>
  );
}

export default App;
