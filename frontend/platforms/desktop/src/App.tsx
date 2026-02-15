import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { APIProvider } from './services/APIProvider';
import { AuthProvider } from './services/AuthProvider';
import { HomeScreen } from './screens/HomeScreen';
import { SearchScreen } from './screens/SearchScreen';
import { LibraryScreen } from './screens/LibraryScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { PlayerScreen } from './screens/PlayerScreen';
import { Layout } from './components/Layout';

export function App() {
  return (
    <BrowserRouter>
      <APIProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomeScreen />} />
              <Route path="search" element={<SearchScreen />} />
              <Route path="library" element={<LibraryScreen />} />
              <Route path="settings" element={<SettingsScreen />} />
              <Route path="player/:mediaId" element={<PlayerScreen />} />
            </Route>
          </Routes>
        </AuthProvider>
      </APIProvider>
    </BrowserRouter>
  );
}
