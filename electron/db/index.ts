import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';

let db: Database.Database;

export function initDB() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'library.db');

  console.log(`Initializing database at ${dbPath}`);

  // Create directory if it doesn't exist (though userData should exist)
  db = new Database(dbPath);

  // Performance optimization
  db.pragma('journal_mode = WAL');

  // Schema Definition
  const schema = `
    -- Tracks table (Local & Downloaded)
    CREATE TABLE IF NOT EXISTS tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      artist TEXT,
      album TEXT,
      duration REAL,
      path TEXT UNIQUE NOT NULL,
      format TEXT,
      image_path TEXT,
      lyrics TEXT,
      source TEXT DEFAULT 'local', -- 'local' or 'ytdlp'
      video_id TEXT, -- for YouTube tracks
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Artists table for rich metadata
    CREATE TABLE IF NOT EXISTS artists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      bio TEXT,
      image_path TEXT,
      mbid TEXT -- MusicBrainz ID
    );

    -- Albums table
    CREATE TABLE IF NOT EXISTS albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      artist_id INTEGER,
      image_path TEXT,
      year INTEGER,
      mbid TEXT,
      FOREIGN KEY(artist_id) REFERENCES artists(id)
    );

    -- Playlists system
    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      image_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS playlist_tracks (
      playlist_id INTEGER,
      track_id INTEGER,
      position INTEGER,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (playlist_id, track_id),
      FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
      FOREIGN KEY(track_id) REFERENCES tracks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Downloads tracking
    CREATE TABLE IF NOT EXISTS downloads (
      id TEXT PRIMARY KEY, -- yt-dlp ID
      title TEXT,
      state TEXT DEFAULT 'pending', -- 'pending', 'downloading', 'completed', 'failed'
      progress REAL DEFAULT 0,
      path TEXT,
      format TEXT,
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Key-Value Store for app settings
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    -- History Tracking
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      track_id INTEGER,
      video_id TEXT, -- For online tracks not in tracks table
      title TEXT,
      artist TEXT,
      album TEXT,
      duration REAL,
      path TEXT,
      image_path TEXT,
      source TEXT,
      played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(track_id) REFERENCES tracks(id) ON DELETE SET NULL
    );

    -- Daily Recommendations
    CREATE TABLE IF NOT EXISTS recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mood TEXT,
      video_id TEXT,
      title TEXT,
      artist TEXT,
      thumbnail TEXT,
      cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(mood, video_id)
    );
    CREATE TABLE IF NOT EXISTS lyrics_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      artist TEXT,
      title TEXT,
      plain_lyrics TEXT,
      synced_lyrics TEXT,
      source TEXT DEFAULT 'lrclib',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(artist, title)
    );
  `;

  db.exec(schema);

  // Manual Migrations for existing databases
  const columns = db.prepare("PRAGMA table_info(history)").all() as any[];
  const columnNames = columns.map(c => c.name);

  if (!columnNames.includes('album')) {
    db.exec("ALTER TABLE history ADD COLUMN album TEXT");
  }
  if (!columnNames.includes('duration')) {
    db.exec("ALTER TABLE history ADD COLUMN duration REAL");
  }
  if (!columnNames.includes('path')) {
    db.exec("ALTER TABLE history ADD COLUMN path TEXT");
  }

  const playlistColumns = db.prepare("PRAGMA table_info(playlists)").all() as any[];
  const playlistColumnNames = playlistColumns.map(c => c.name);
  if (!playlistColumnNames.includes('image_path')) {
    db.exec("ALTER TABLE playlists ADD COLUMN image_path TEXT");
  }

  console.log('Database initialized successfully');

  return db;
}

export function getDB() {
  if (!db) {
    throw new Error('Database not initialized! Call initDB() first.');
  }
  return db;
}
