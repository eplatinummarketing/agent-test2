import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Pipeline from './pages/Pipeline';
import DealList from './pages/DealList';
import DealDetail from './pages/DealDetail';
import NewDeal from './pages/NewDeal';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/deals" element={<DealList />} />
          <Route path="/deals/new" element={<NewDeal />} />
          <Route path="/deals/:id" element={<DealDetail />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
