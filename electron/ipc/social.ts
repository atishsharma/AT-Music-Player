import { ipcMain, shell } from 'electron';
import { getDB, getSetting } from '../db';
import { DiscordPresence, type Presence } from '../services/discord';
import { lastfmBeginAuth, lastfmFinishAuth, lastfmLogout, lastfmNowPlaying, lastfmScrobble, lastfmStatus, type ScrobbleTrack } from '../services/scrobbler';

const discord = new DiscordPresence();

const setSetting = (key: string, value: string) =>
    getDB().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);

const discordStatus = () => ({
    enabled: getSetting('discord_enabled') === 'true',
    clientId: getSetting('discord_client_id') || '',
    connected: discord.connected,
});

export function registerSocialHandlers() {
    if (getSetting('discord_enabled') === 'true') discord.start(getSetting('discord_client_id') || '');

    // Discord Rich Presence
    ipcMain.on('presence:update', (_event, p: Presence | null) => { if (discord.enabled) discord.update(p); });
    ipcMain.handle('discord:status', () => discordStatus());
    ipcMain.handle('discord:configure', (_event, { enabled, clientId }: { enabled: boolean; clientId: string }) => {
        const id = String(clientId || '').trim();
        setSetting('discord_enabled', String(!!enabled));
        setSetting('discord_client_id', id);
        if (enabled) discord.start(id); else discord.stop();
        return discordStatus();
    });

    // Last.fm scrobbling
    ipcMain.handle('lastfm:status', () => lastfmStatus());
    ipcMain.handle('lastfm:setSecret', (_event, secret: string) => { setSetting('lastfm_api_secret', String(secret || '').trim()); return lastfmStatus(); });
    ipcMain.handle('lastfm:setScrobbling', (_event, on: boolean) => { setSetting('lastfm_scrobble', String(!!on)); return lastfmStatus(); });
    ipcMain.handle('lastfm:beginAuth', async () => {
        const url = await lastfmBeginAuth();
        await shell.openExternal(url);
        return true;
    });
    ipcMain.handle('lastfm:finishAuth', () => lastfmFinishAuth());
    ipcMain.handle('lastfm:logout', () => lastfmLogout());
    ipcMain.on('scrobble:nowPlaying', (_event, t: ScrobbleTrack) => { lastfmNowPlaying(t); });
    ipcMain.on('scrobble:submit', (_event, t: ScrobbleTrack) => { lastfmScrobble(t); });
}

export function stopSocial() {
    discord.stop();
}
