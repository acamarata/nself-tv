'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useCallback, useRef, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { PlayerControls } from '@/components/player/PlayerControls';
import type { VideoPlayerHandle } from '@/components/player/VideoPlayer';

export default function PlayPage() {
  const params = useParams();
  const router = useRouter();
  const mediaId = params.mediaId as string;

  const playerRef = useRef<VideoPlayerHandle>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const headerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mockSrc = `/api/stream/mock/${mediaId}/master.m3u8`;

  const resetHeaderTimer = useCallback(() => {
    setShowHeader(true);
    if (headerTimerRef.current) {
      clearTimeout(headerTimerRef.current);
    }
    headerTimerRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowHeader(false);
      }
    }, 3000);
  }, [isPlaying]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (headerTimerRef.current) {
        clearTimeout(headerTimerRef.current);
      }
    };
  }, []);

  const handlePlay = useCallback(() => {
    playerRef.current?.play();
  }, []);

  const handlePause = useCallback(() => {
    playerRef.current?.pause();
  }, []);

  const handleSeek = useCallback((time: number) => {
    playerRef.current?.seek(time);
    setCurrentTime(time);
  }, []);

  const handleVolumeChange = useCallback((newVolume: number) => {
    playerRef.current?.setVolume(newVolume);
    setVolume(newVolume);
    if (newVolume > 0) {
      setIsMuted(false);
    }
  }, []);

  const handleMuteToggle = useCallback(() => {
    playerRef.current?.toggleMute();
    setIsMuted((prev) => !prev);
  }, []);

  const handleFullscreenToggle = useCallback(() => {
    playerRef.current?.toggleFullscreen();
  }, []);

  const handleProgress = useCallback((time: number, dur: number) => {
    setCurrentTime(time);
    if (Number.isFinite(dur) && dur > 0) {
      setDuration(dur);
    }
  }, []);

  // Poll the video element for play/buffering state
  useEffect(() => {
    const interval = setInterval(() => {
      const video = playerRef.current?.getVideoElement();
      if (video) {
        const playing = !video.paused && !video.ended;
        setIsPlaying(playing);
        setIsBuffering(video.readyState < 3 && !video.paused);
      }
    }, 250);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black z-50 flex flex-col"
      onMouseMove={resetHeaderTimer}
    >
      {/* Back Button - top layer */}
      <div
        className={`absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4 transition-opacity duration-300 ${
          showHeader ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-white hover:text-primary transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-white text-lg font-medium truncate">
            Now Playing: {mediaId}
          </h1>
        </div>
      </div>

      {/* Video Player with Controls as children */}
      <div className="flex-1 relative">
        <VideoPlayer
          ref={playerRef}
          src={mockSrc}
          autoplay={false}
          onProgress={handleProgress}
          className="w-full h-full"
        >
          <PlayerControls
            playing={isPlaying}
            buffering={isBuffering}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            muted={isMuted}
            fullscreen={isFullscreen}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeek={handleSeek}
            onVolumeChange={handleVolumeChange}
            onMuteToggle={handleMuteToggle}
            onFullscreenToggle={handleFullscreenToggle}
          />
        </VideoPlayer>
      </div>
    </div>
  );
}
