import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import VoterPage from './pages/VoterPage';
import BlockchainPage from './pages/BlockchainPage';
import ResultsPage from './pages/ResultsPage';
import HomePage from './pages/HomePage';
import VisualisePage from './pages/VisualisePage';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="navbar">
          <div className="nav-brand">
            <span className="nav-logo">Block<span>Vote</span></span>
          </div>
          <div className="nav-links">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/vote">Vote</NavLink>
            <NavLink to="/visualise">Visualise</NavLink>
            <NavLink to="/blockchain">Chain</NavLink>
            <NavLink to="/results">Results</NavLink>
            <NavLink to="/admin">Admin</NavLink>
          </div>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/vote" element={<VoterPage />} />
            <Route path="/blockchain" element={<BlockchainPage />} />
            <Route path="/visualise" element={<VisualisePage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
