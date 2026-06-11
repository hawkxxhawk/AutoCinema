export function isDirectVideoLink(url: string): boolean {
  if (!url) return false;
  const cleanUrl = url.trim().toLowerCase().split('?')[0];
  return (
    cleanUrl.endsWith('.mp4') ||
    cleanUrl.endsWith('.webm') ||
    cleanUrl.endsWith('.ogg') ||
    cleanUrl.endsWith('.m3u8') ||
    cleanUrl.includes('commondatastorage.googleapis.com') ||
    cleanUrl.includes('video/mp4') ||
    cleanUrl.includes('storage.googleapis.com') ||
    url.match(/\.(mp4|webm|ogg|m3u8)(\?|$)/i) !== null
  );
}

export function getEmbedUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();

  // YouTube detection & conversion
  // Matches: youtube.com/watch?v=XXXX, youtu.be/XXXX, youtube.com/embed/XXXX
  const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const ytMatch = trimmed.match(ytRegex);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=0&enablejsapi=1&rel=0`;
  }

  // Vimeo detection
  const vimeoRegex = /vimeo\.com\/(?:video\/)?([0-9]+)/;
  const vimeoMatch = trimmed.match(vimeoRegex);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=0`;
  }

  // EgyBest specialized frame proxy helper
  if (trimmed.includes('egybest') && !trimmed.includes('/embed')) {
    return trimmed;
  }

  // aflam18 detection (Example of a site that might need direct link or specific embed)
  if (trimmed.includes('aflam18.media') && !trimmed.includes('/embed')) {
    // If we can't find an embed pattern, we return it but we'll handle the UI fallback
    return trimmed;
  }

  return trimmed;
}

/**
 * Check if a URL is likely to be blocked by X-Frame-Options
 */
export function isLikelyBlocked(url: string): boolean {
  if (!url) return false;
  const blockedDomains = ['aflam18.media', 'netflix.com', 'facebook.com', 'twitter.com', 'instagram.com'];
  return blockedDomains.some(domain => url.includes(domain));
}

/**
 * Strip the recurring "Poster for HD" boilerplate that some scraped JSON feeds
 * inject into every item title, so the displayed name is just the movie name.
 */
export function cleanItemTitle(title: string | undefined | null): string {
  if (!title) return '';
  return String(title)
    .replace(/poster\s*for\s*hd\s*[-–—:|]*\s*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Extract domain/website from URL
 * @param url - The URL to extract domain from
 * @returns The domain name (e.g., "youtube.com", "egybest.co.in")
 */
export function extractDomain(url: string): string {
  if (!url) return 'Unknown';
  
  try {
    // Remove protocol
    let domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
    
    // Get only the domain part (before first slash or query)
    domain = domain.split('/')[0];
    
    // Map common domains to display names
    const domainMap: { [key: string]: string } = {
      'youtube.com': '🎥 YouTube',
      'youtu.be': '🎥 YouTube',
      'vimeo.com': '🎬 Vimeo',
      'egybest.co.in': '📺 EgyBest',
      'movizhome.click': '🎞️ MovizHome',
      'commondatastorage.googleapis.com': '☁️ Direct Storage',
      'storage.googleapis.com': '☁️ Direct Storage',
    };
    
    // Check for known domains
    for (const [key, displayName] of Object.entries(domainMap)) {
      if (domain.includes(key) || url.includes(key)) {
        return displayName;
      }
    }
    
    return domain;
  } catch (e) {
    return 'Unknown';
  }
}

/**
 * Get default vertical offset for specific domains to focus on video player
 */
export function getDefaultVOffset(url: string): number {
  if (!url) return 0;
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('egybest')) return 220; // Common offset for EgyBest
  if (lowerUrl.includes('movizhome')) return 180; // Common offset for MovizHome
  
  return 0;
}

/**
 * Group movies by domain
 * @param movies - Array of movie items
 * @returns Object with domains as keys and movies as values
 */
export function groupByDomain(movies: any[]): { [key: string]: any[] } {
  const groups: { [key: string]: any[] } = {};
  
  movies.forEach((movie) => {
    const domain = extractDomain(movie.url);
    if (!groups[domain]) {
      groups[domain] = [];
    }
    groups[domain].push(movie);
  });
  
  return groups;
}
