import { useState } from 'react';
import './App.css';
import HomePage from './components/home/HomePage';
import Header from './components/header/Header';
import ChatAssistant from './components/chatassistant/ChatAssistant';
import Library from './components/Library/Library';
import TrackPlayer from './components/trackplayer/TrackPlayer';
import './index.css';

function App() {
  const [searchResults, setSearchResults] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);

  const handlePlayTrack = (track) => {
    setCurrentTrack(track);
  };

  return (
    <div className="app-container">
      <Header setSearchResults={setSearchResults} />
      <div className="main-content">
        <Library setSearchResults={setSearchResults} />
        <HomePage searchResults={searchResults} onPlayTrack={handlePlayTrack} />
      </div>
      <TrackPlayer currentTrack={currentTrack} />
      <ChatAssistant setSearchResults={setSearchResults} />
    </div>
  );
}

export default App;