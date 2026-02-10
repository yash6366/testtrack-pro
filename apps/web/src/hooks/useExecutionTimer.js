import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for execution timer
 */
export function useExecutionTimer(startTime = null) {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(startTime || new Date());

  // Initialize with elapsed time if startTime provided
  useEffect(() => {
    if (startTime) {
      const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
      setSeconds(elapsed);
    }
  }, [startTime]);

  // Timer interval
  useEffect(() => {
    if (!isRunning || isPaused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, isPaused]);

  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const stop = useCallback(() => {
    setIsRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, []);

  const reset = useCallback(() => {
    setSeconds(0);
    setIsPaused(false);
    startTimeRef.current = new Date();
  }, []);

  const updateLastSaved = useCallback(() => {
    setLastSaved(new Date());
  }, []);

  const formatTime = useCallback((totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  const getElapsedTime = useCallback(() => {
    return {
      totalSeconds: seconds,
      hours: Math.floor(seconds / 3600),
      minutes: Math.floor((seconds % 3600) / 60),
      seconds: seconds % 60,
      formatted: formatTime(seconds),
    };
  }, [seconds, formatTime]);

  const getTimeSinceLastSave = useCallback(() => {
    if (!lastSaved) return null;

    const elapsed = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
    
    if (elapsed < 60) return `${elapsed}s ago`;
    if (elapsed < 3600) {
      const minutes = Math.floor(elapsed / 60);
      return `${minutes}m ago`;
    }
    
    const hours = Math.floor(elapsed / 3600);
    return `${hours}h ago`;
  }, [lastSaved]);

  return {
    seconds,
    isRunning,
    isPaused,
    lastSaved,
    pause,
    resume,
    stop,
    reset,
    updateLastSaved,
    formatTime,
    getElapsedTime,
    getTimeSinceLastSave,
  };
}

export default useExecutionTimer;
