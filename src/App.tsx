
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Home from './pages/Home';

import Library from './pages/Library';
import Favorites from './pages/Favorites';

import Search from './pages/Search';
import Downloads from './pages/Downloads';
import PlaybackHistory from './pages/PlaybackHistory';

// Placeholder pages
import ErrorBoundary from './components/common/ErrorBoundary';
import PlaylistsPage from './pages/Playlists';
import PlaylistDetail from './pages/PlaylistDetail';
import ArtistDetail from './pages/ArtistDetail';
import AlbumDetail from './pages/AlbumDetail';
import SettingsPage from './pages/Settings';
import LastFMPage from './pages/LastFM';



const App = () => {
  return (
    <HashRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="search" element={<Search />} />
            <Route path="library" element={<Library />} />
            <Route path="downloads" element={<Downloads />} />
            <Route path="playlists" element={<PlaylistsPage />} />
            <Route path="playlists/:id" element={<PlaylistDetail />} />
            <Route path="artist/:id" element={<ArtistDetail />} />
            <Route path="album/:id" element={<AlbumDetail />} />
            <Route path="favorites" element={<Favorites />} />
            <Route path="favorites/history" element={<PlaybackHistory />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="lastfm" element={<LastFMPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </HashRouter>
  );
};

export default App;
