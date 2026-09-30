import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';

let db: Database.Database;

export function initDB() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'library.db');

  console.log(`Initializing database at ${dbPath}`);

  try {
    db = new Database(dbPath);

    // Performance optimization
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    // Without this, ON DELETE CASCADE / SET NULL in the schema are silently ignored
    db.pragma('foreign_keys = ON');

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

  const trackColumns = db.prepare("PRAGMA table_info(tracks)").all() as any[];
  if (!trackColumns.some(c => c.name === 'mtime')) {
    db.exec("ALTER TABLE tracks ADD COLUMN mtime REAL");
  }

  // Clean up rows orphaned while foreign keys were not enforced
  db.exec(`
    DELETE FROM playlist_tracks WHERE playlist_id NOT IN (SELECT id FROM playlists)
      OR track_id NOT IN (SELECT id FROM tracks);
    UPDATE history SET track_id = NULL WHERE track_id IS NOT NULL AND track_id NOT IN (SELECT id FROM tracks);
  `);

  // Indexes for the hot queries (library views, history, video lookups)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album);
    CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
    CREATE INDEX IF NOT EXISTS idx_tracks_video_id ON tracks(video_id);
    CREATE INDEX IF NOT EXISTS idx_tracks_created_at ON tracks(created_at);
    CREATE INDEX IF NOT EXISTS idx_history_played_at ON history(played_at);
    CREATE INDEX IF NOT EXISTS idx_history_video_id ON history(video_id);
    CREATE INDEX IF NOT EXISTS idx_lyrics_title_artist ON lyrics_cache(title, artist);
  `);

  const playlistColumns = db.prepare("PRAGMA table_info(playlists)").all() as any[];
  const playlistColumnNames = playlistColumns.map(c => c.name);
  if (!playlistColumnNames.includes('image_path')) {
    db.exec("ALTER TABLE playlists ADD COLUMN image_path TEXT");
  }

    console.log('Database initialized successfully');
  } catch (err) {
    console.warn("Could not load better-sqlite3 native plugin. Database features are disabled for this session.", err);
    db = {
      pragma: () => {},
      exec: () => {},
      prepare: () => ({ all: () => [], run: () => ({ changes: 0 }), get: () => null })
    } as any;
  }

  return db;
}

export function getDB() {
  if (!db) {
    throw new Error('Database not initialized! Call initDB() first.');
  }
  return db;
}

export function getSetting(key: string): string | null {
  try {
    const row = getDB().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row ? row.value : null;
  } catch {
    return null;
  }
}
