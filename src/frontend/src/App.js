import React from 'react';
import { Routes, Route } from "react-router-dom";

import { NavBar } from "./components"
import { FeedPage, ProfilePage } from './pages'

export default function App() {
  return (
    <>
      <NavBar></NavBar>
      <Routes>
        <Route exact path="/" element={<FeedPage/>} />
        <Route path="/profile/:username" component={<ProfilePage/>} />
      </Routes>
    </>
    
  );
}
