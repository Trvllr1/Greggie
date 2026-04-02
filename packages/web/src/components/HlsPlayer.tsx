import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import Hls from 'hls.js';

type HlsPlayerProps = {
  src: string;
  autoPlay?: boolean;
  muted?: boolean;
  className?: string;
  poster?: string;
  onStreamReady?: () => void;
  onStreamError?: () => void;
};

export type HlsPlayerHandle = {
  getVideoElement: () => HTMLVideoElement | null;
  setVolume: (v: number) => void;
  setMuted: (m: boolean) => void;
};

export const HlsPlayer = forwardRef<HlsPlayerHandle, HlsPlayerProps>(
  ({ src, autoPlay = true, muted = true, className = '', poster, onStreamReady, onStreamError }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);

    useImperativeHandle(ref, () => ({
      getVideoElement: () => videoRef.current,
      setVolume: (v: number) => {
        if (videoRef.current) videoRef.current.volume = Math.max(0, Math.min(1, v));
      },
      setMuted: (m: boolean) => {
        if (videoRef.current) videoRef.current.muted = m;
      },
    }));

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const isHls = src.includes('.m3u8');
      const isDirectVideo = /\.(mp4|webm|ogg)(\?|$)/i.test(src);

      if (isDirectVideo) {
        // Direct video URL — play with native <video> and loop
        video.src = src;
        video.loop = true;
        video.addEventListener('loadedmetadata', () => {
          if (autoPlay) video.play().catch(() => {});
          onStreamReady?.();
        }, { once: true });
        video.addEventListener('error', () => onStreamError?.(), { once: true });
        return;
      }

      if (!isHls) {
        video.src = '';
        onStreamError?.();
        return;
      }

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 6,
        });
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (autoPlay) video.play().catch(() => {});
          onStreamReady?.();
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              // Stream not available yet — retry after a delay
              setTimeout(() => hls.loadSource(src), 3000);
            } else {
              hls.destroy();
              onStreamError?.();
            }
          }
        });

        return () => {
          hls.destroy();
          hlsRef.current = null;
        };
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS
        video.src = src;
        video.addEventListener('loadedmetadata', () => {
          if (autoPlay) video.play().catch(() => {});
          onStreamReady?.();
        });
      } else {
        onStreamError?.();
      }
    }, [src, autoPlay]);

    return (
      <video
        ref={videoRef}
        className={className}
        muted={muted}
        playsInline
        poster={poster}
        style={{ objectFit: 'cover' }}
      />
    );
  }
);
