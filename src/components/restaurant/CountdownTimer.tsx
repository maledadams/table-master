import { useEffect, useState } from 'react';

interface CountdownTimerProps {
  startTime: string; // HH:mm
  duration: number; // minutes
  date: string; // YYYY-MM-DD
}

export function CountdownTimer({ startTime, duration, date }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState('');
  const [exceeded, setExceeded] = useState(false);

  useEffect(() => {
    const update = () => {
      const [h, m] = startTime.split(':').map(Number);
      const start = new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
      const end = new Date(start.getTime() + duration * 60 * 1000);
      const now = new Date();
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        const over = Math.abs(diff);
        const overMin = Math.floor(over / 60000);
        const overSec = Math.floor((over % 60000) / 1000);
        setRemaining(`-${overMin}:${String(overSec).padStart(2, '0')}`);
        setExceeded(true);
      } else {
        const min = Math.floor(diff / 60000);
        const sec = Math.floor((diff % 60000) / 1000);
        setRemaining(`${min}:${String(sec).padStart(2, '0')}`);
        setExceeded(false);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime, duration, date]);

  return (
    <span
      className={`font-mono text-[10px] font-bold leading-none ${
        exceeded ? 'text-red-400 table-time-exceeded' : ''
      }`}
    >
      {remaining}
    </span>
  );
}
