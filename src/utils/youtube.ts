/**
 * Utility to extract YouTube video ID from various URL formats
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();

  // Handle standard watch URLs: https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = cleanUrl.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/v\/|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  if (watchMatch && watchMatch[1]) {
    return watchMatch[1];
  }

  // Handle raw 11 char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
    return cleanUrl;
  }

  return null;
}

export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function getYouTubeEmbedUrl(videoId: string, startSeconds?: number): string {
  const startParam = startSeconds && startSeconds > 0 ? `&start=${Math.floor(startSeconds)}` : '';
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&autoplay=1${startParam}`;
}

export function formatVideoTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
  const totalSecs = Math.floor(seconds);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
