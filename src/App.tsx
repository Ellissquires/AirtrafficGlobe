import React from 'react';
import logo from './logo.svg';
import './App.css';
import Globe from './components/Globe';

function App() {
  return (
    <div className="App">
      <Globe color="red" detail={10}/> 
    </div>
  );
}

export default App;
