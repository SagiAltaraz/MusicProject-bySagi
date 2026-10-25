import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Header from './components/header/Header';
import Sidebar from './components/sidebar/Sidebar';
import TrackPlayer from './components/trackplayer/TrackPlayer';
import ChatAssistant from './components/chatassistant/ChatAssistant';
import QueuePanel from './components/panels/QueuePanel';
import DownloadCenter from './components/panels/DownloadCenter';
import ModalHost from './components/ModalHost';
import BackendBanner from './components/BackendBanner';
import Toaster from './components/ui/Toaster';
import ErrorBoundary from './components/ui/ErrorBoundary';
import HomePage from './pages/HomePage';
import useUiStore from './stores/uiStore';
import useSettingsStore from './stores/settingsStore';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';

const CratesPage = lazy(() => import('./pages/CratesPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
// Pulls in wavesurfer - only needed once a drawer opens
const TrackDrawer = lazy(() => import('./components/panels/TrackDrawer'));

function NotFound() {
  return (
    <div className="text-center py-24">
      <p className="text-5xl font-bold text-text-muted">404</p>
      <p className="text-text-secondary mt-3">This page fell off the decks.</p>
      <Link to="/" className="inline-block mt-6 text-accent">Back to Discover</Link>
    </div>
  );
}

function App() {
  const { queueOpen, downloadsOpen, detailTrack } = useUiStore();
  const stageMode = useSettingsStore((s) => s.stageMode);
  const location = useLocation();
  useKeyboardShortcuts();

  useEffect(() => {
    document.documentElement.dataset.stage = String(stageMode);
  }, [stageMode]);

  // Navigating closes the track drawer
  useEffect(() => {
    useUiStore.getState().closeDetail();
  }, [location.pathname]);

  return (
    <div className="flex flex-col h-screen bg-bg-primary overflow-hidden">
      <Header />
      <BackendBanner />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        <main id="main" className="flex-1 overflow-y-auto p-4 sm:p-6 pb-4 bg-bg-primary">
          <ErrorBoundary key={location.pathname}>
            <Suspense fallback={<div className="text-text-muted text-sm">Loading…</div>}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/crates" element={<CratesPage />} />
                <Route path="/crates/:crateId" element={<CratesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      {queueOpen && <QueuePanel />}
      {downloadsOpen && <DownloadCenter />}
      {detailTrack && <ErrorBoundary><Suspense fallback={null}><TrackDrawer /></Suspense></ErrorBoundary>}
      <TrackPlayer />
      <ChatAssistant />
      <ModalHost />
      <Toaster />
    </div>
  );
}

export default App;
