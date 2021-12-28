import React from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { NavBar, useToken } from "./components"
import { Feed, Login, Profile } from './pages'

export default function App() {
  const { token, setToken, clearToken } = useToken();

  if(!token) {
    return <Login setToken={setToken} />
  }

  return (
    <Router>
      <NavBar logout={clearToken}></NavBar>
      <Routes>
        <Route path="/" element={<Feed/>}/>
        <Route path="/profile" element={<Profile profile={true}/>}/>
        <Route path="/profile/:username" element={<Profile/>}/>
      </Routes>
    </Router>
    
  );
}
