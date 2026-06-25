export type PlayMode = 'sequential' | 'shuffle' | 'loop';

export type AutoAdvanceTrigger = 'timer' | 'ended' | 'manual';

export interface MovieItem {
  id: string;
  title: string;
  url: string; // Original URL (e.g. EgyBest, Movizhome, YouTube)
  embedUrl: string; // The URL used in the iframe or direct player
  duration: number; // Duration in seconds (for the auto-transition timer fallback)
  useDirectPlayer: boolean; // True if it's a direct mp4/webm/etc. link or supported media file
  description?: string;
  category?: string;
  posterUrl?: string;
  addedAt: string;
  isHidden?: boolean; // Hide broken/non-working links
  isBroken?: boolean; // Mark as broken/non-working
  vOffset?: number; // Vertical offset for iframe to focus on video player
  zoom?: number; // Zoom level (1.0 = 100%) for iframe
}

export interface Folder {
  id: string;
  name: string;
  description?: string;
  items: MovieItem[];
  color?: string; // Hex or tailwind class for personalized folder coloring
  sortBy?: 'domain' | 'title' | 'date' | 'manual'; // Sort method for items
  defaultVOffset?: number; // Default vertical offset for iframe to focus on video player for this folder
  defaultZoom?: number; // Default zoom level (1.0 = 100%) for this folder
}

export interface PlaybackState {
  currentFolderId: string | null;
  currentItemIndex: number;
  isPlaying: boolean;
  playMode: PlayMode;
  autoAdvanceTrigger: AutoAdvanceTrigger;
  customTimerSeconds: number; // e.g. 180 seconds, or 7200 for full 2-hour cinema
  isFullscreenTheater: boolean; // whether active window is maximized to cover everything
  elapsedTime: number; // seconds
}
