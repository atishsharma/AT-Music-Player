
import { lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Home from './pages/Home';

const Library = lazy(() => import('./pages/Library'));
const Favorites = lazy(() => import('./pages/Favorites'));

const Search = lazy(() => import('./pages/Search'));
const Downloads = lazy(() => import('./pages/Downloads'));
const PlaybackHistory = lazy(() => import('./pages/PlaybackHistory'));
const StatsPage = lazy(() => import('./pages/Stats'));

// Pages other than Home are split into their own chunks (faster startup)
import ErrorBoundary from './components/common/ErrorBoundary';
const PlaylistsPage = lazy(() => import('./pages/Playlists'));
const PlaylistDetail = lazy(() => import('./pages/PlaylistDetail'));
const ArtistDetail = lazy(() => import('./pages/ArtistDetail'));
const AlbumDetail = lazy(() => import('./pages/AlbumDetail'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const LastFMPage = lazy(() => import('./pages/LastFM'));
const FunPage = lazy(() => import('./pages/Fun'));
import TitleBar from './components/layout/TitleBar';

const App = () => {
  return (
    <HashRouter>
      <ErrorBoundary>
        <TitleBar />
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="search" element={<Search />} />
            <Route path="library" element={<Library />} />
            <Route path="fun" element={<FunPage />} />
            <Route path="downloads" element={<Downloads />} />
            <Route path="playlists" element={<PlaylistsPage />} />
            <Route path="playlists/:id" element={<PlaylistDetail />} />
            <Route path="artist/:id" element={<ArtistDetail />} />
            <Route path="album/:id" element={<AlbumDetail />} />
            <Route path="favorites" element={<Favorites />} />
            <Route path="favorites/history" element={<PlaybackHistory />} />
            <Route path="stats" element={<StatsPage />} />
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
