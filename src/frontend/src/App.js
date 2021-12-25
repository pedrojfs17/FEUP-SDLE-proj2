import React from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { NavBar } from "./components"
import { Feed, Profile } from './pages'

export default function App() {
  return (
    <Router>
      <NavBar></NavBar>
      <Routes>
        <Route path="/" element={<Feed/>}/>
        <Route path="/profile/:username" element={<Profile/>}/>
      </Routes>
    </Router>
    
  );
}
