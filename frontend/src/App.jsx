import { useState } from 'react';
import './App.css';
import HomePage from './components/home/HomePage';
import Header from './components/header/Header';
import './index.css';


function App() {
  const [searchResults, setSearchResults] = useState([]);
 

  return (
    <>
      <Header setSearchResults={setSearchResults}/>
      <HomePage searchResults={searchResults}/>
    </>
  )
}

export default App
