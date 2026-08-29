"use client";

import { useMemo, useRef, useState } from "react";
import { AlertCircle, Mic, Pause, Play } from "lucide-react";
import type { Message } from "@/lib/types/domain";
import { Button } from "@/components/ui/button";

const SPEEDS = [1, 1.5, 2] as const;

function formatDuration(seconds: number | null) {
  if (!seconds || !Number.isFinite(seconds)) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

export function VoiceMessage({ message }: { message: Message }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(message.audio?.error ?? null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(message.audio?.durationSeconds ?? 0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;
  const bars = useMemo(() => Array.from({ length: 28 }, (_, index) => 8 + ((index * 7) % 22)), []);
  const canPlay = Boolean(message.audio?.url) && !error;
  const isOutbound = message.direction === "outbound";

  async function togglePlayback() {
    const audio = audioRef.current;

    if (!audio || !canPlay) {
      setError("Audio is not available.");
      return;
    }

    try {
      if (isPlaying) {
        audio.pause();
        return;
      }

      setIsLoading(true);
      audio.playbackRate = SPEEDS[speedIndex];
      await audio.play();
    } catch {
      setError("Audio could not be played.");
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  }

  function seek(nextTime: number) {
    const audio = audioRef.current;
    if (!audio || duration <= 0) {
      return;
    }

    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  function cycleSpeed() {
    const nextIndex = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(nextIndex);

    if (audioRef.current) {
      audioRef.current.playbackRate = SPEEDS[nextIndex];
    }
  }

  return (
    <div className="min-w-[260px] max-w-[360px]">
      <audio
        ref={audioRef}
        src={message.audio?.url ?? undefined}
        preload="metadata"
        onCanPlay={() => setIsLoading(false)}
        onDurationChange={(event) => setDuration(event.currentTarget.duration || duration)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onError={() => {
          setIsLoading(false);
          setError("Audio could not be loaded.");
        }}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || duration)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
      />

      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="icon"
          variant={isOutbound ? "secondary" : "outline"}
          onClick={togglePlayback}
          disabled={!message.audio?.url || Boolean(error)}
          aria-label={isPlaying ? "Pause voice message" : "Play voice message"}
          className={isOutbound ? "h-10 w-10 bg-black text-[#22ddeb] hover:bg-black/80" : "h-10 w-10"}
        >
          {error ? (
            <AlertCircle className="h-5 w-5" />
          ) : isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
        </Button>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
              <Mic className="h-3.5 w-3.5" />
              {message.audio?.isVoice ? "Voice note" : "Audio"}
            </span>
            <button
              type="button"
              onClick={cycleSpeed}
              className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                isOutbound ? "bg-black/15 text-black" : "bg-[#082529] text-[#22ddeb]"
              }`}
            >
              {SPEEDS[speedIndex]}x
            </button>
          </div>

          <div className="relative h-9">
            <div className="flex h-full items-center gap-1">
              {bars.map((height, index) => (
                <span
                  key={`${height}-${index}`}
                  className={`w-1 rounded-full transition-colors ${
                    index / bars.length <= progress
                      ? isOutbound ? "bg-black" : "bg-[#22ddeb]"
                      : isOutbound ? "bg-black/25" : "bg-[#1d3038]"
                  }`}
                  style={{ height }}
                />
              ))}
            </div>
            {duration > 0 ? (
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={currentTime}
                onChange={(event) => seek(Number(event.target.value))}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="Voice message progress"
              />
            ) : null}
          </div>

          <div className={`mt-1 flex justify-between text-xs ${isOutbound ? "text-black/60" : "text-[#6f858f]"}`}>
            <span>{error ? "Unavailable" : isLoading ? "Loading" : formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>
      </div>

      {error ? (
        <div className={`mt-3 text-xs ${isOutbound ? "text-black/70" : "text-[#ff7a94]"}`}>
          {error}
        </div>
      ) : null}
    </div>
  );
}
