import { useState, useEffect, useRef } from 'react';
import { FaHeadset, FaPlus, FaQuestionCircle, FaSun, FaMoon, FaDesktop, FaBell, FaBellSlash, FaTh, FaThList, FaList } from 'react-icons/fa';
import { useTheme } from '@/hooks/useTheme';
import { useStreams } from '@/contexts/StreamContext';
import { PlaylistManager } from './PlaylistManager';

interface HeaderProps {
  isConnected: boolean;
  onAddStreamClick: () => void;
}

// Animated radar/airspace canvas background
function RadarCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Aircraft objects that fly across the header
    interface Aircraft {
      x: number;
      y: number;
      speed: number;
      heading: number; // radians
      size: number;
      alpha: number;
      trail: Array<{ x: number; y: number }>;
    }

    let aircraft: Aircraft[] = [];
    let sweepAngle = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      width = rect.width;
      height = rect.height;
    };

    const spawnAircraft = () => {
      const side = Math.random();
      let x: number, y: number, heading: number;

      if (side < 0.25) {
        // from left
        x = -10;
        y = Math.random() * height;
        heading = Math.random() * 0.8 - 0.4; // roughly rightward
      } else if (side < 0.5) {
        // from right
        x = width + 10;
        y = Math.random() * height;
        heading = Math.PI + Math.random() * 0.8 - 0.4;
      } else if (side < 0.75) {
        // from top
        x = Math.random() * width;
        y = -10;
        heading = Math.PI / 2 + Math.random() * 0.8 - 0.4;
      } else {
        // from bottom
        x = Math.random() * width;
        y = height + 10;
        heading = -Math.PI / 2 + Math.random() * 0.8 - 0.4;
      }

      aircraft.push({
        x, y,
        speed: 0.3 + Math.random() * 0.6,
        heading,
        size: 3 + Math.random() * 3,
        alpha: 0.3 + Math.random() * 0.4,
        trail: [],
      });
    };

    // Start with a few aircraft
    resize();
    for (let i = 0; i < 5; i++) {
      spawnAircraft();
      // Place initial ones already on screen
      const a = aircraft[i];
      a.x = Math.random() * width;
      a.y = Math.random() * height;
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Radar sweep from center
      const cx = width * 0.15;
      const cy = height * 0.5;
      const maxR = Math.max(width, height) * 1.2;
      sweepAngle += 0.008;

      // Sweep line
      const sx = cx + Math.cos(sweepAngle) * maxR;
      const sy = cy + Math.sin(sweepAngle) * maxR;
      const gradient = ctx.createLinearGradient(cx, cy, sx, sy);
      gradient.addColorStop(0, 'rgba(255,255,255,0.12)');
      gradient.addColorStop(0.3, 'rgba(255,255,255,0.04)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(sx, sy);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Sweep fade trail (arc)
      const sweepGrad = ctx.createConicGradient(sweepAngle - 0.5, cx, cy);
      sweepGrad.addColorStop(0, 'rgba(255,255,255,0)');
      sweepGrad.addColorStop(0.8, 'rgba(255,255,255,0)');
      sweepGrad.addColorStop(1, 'rgba(255,255,255,0.04)');
      ctx.beginPath();
      ctx.arc(cx, cy, maxR, sweepAngle - 0.5, sweepAngle);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fillStyle = sweepGrad;
      ctx.fill();

      // Radar rings
      for (let r = 50; r < maxR; r += 80) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Grid lines (airspace sectors)
      ctx.strokeStyle = 'rgba(255,255,255,0.015)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR);
        ctx.stroke();
      }

      // Update and draw aircraft
      aircraft = aircraft.filter(a => {
        a.x += Math.cos(a.heading) * a.speed;
        a.y += Math.sin(a.heading) * a.speed;

        // Store trail
        a.trail.push({ x: a.x, y: a.y });
        if (a.trail.length > 20) a.trail.shift();

        // Remove if way off screen
        if (a.x < -50 || a.x > width + 50 || a.y < -50 || a.y > height + 50) {
          return false;
        }

        // Draw trail
        if (a.trail.length > 1) {
          for (let i = 1; i < a.trail.length; i++) {
            const t = i / a.trail.length;
            ctx.beginPath();
            ctx.moveTo(a.trail[i - 1].x, a.trail[i - 1].y);
            ctx.lineTo(a.trail[i].x, a.trail[i].y);
            ctx.strokeStyle = `rgba(255,255,255,${t * a.alpha * 0.3})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        // Draw aircraft dot
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a.alpha})`;
        ctx.fill();

        // Draw aircraft icon (small triangle pointing in heading direction)
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(a.heading);
        ctx.beginPath();
        ctx.moveTo(a.size * 2, 0);
        ctx.lineTo(-a.size, -a.size * 0.8);
        ctx.lineTo(-a.size * 0.5, 0);
        ctx.lineTo(-a.size, a.size * 0.8);
        ctx.closePath();
        ctx.fillStyle = `rgba(255,255,255,${a.alpha * 0.7})`;
        ctx.fill();
        ctx.restore();

        // Blip effect near sweep line
        const dx = a.x - cx;
        const dy = a.y - cy;
        const acAngle = Math.atan2(dy, dx);
        let angleDiff = sweepAngle - acAngle;
        // Normalize to [-PI, PI]
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        if (Math.abs(angleDiff) < 0.15) {
          const blipAlpha = (1 - Math.abs(angleDiff) / 0.15) * 0.5;
          ctx.beginPath();
          ctx.arc(a.x, a.y, a.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${blipAlpha})`;
          ctx.fill();
        }

        return true;
      });

      // Spawn new aircraft periodically
      if (Math.random() < 0.005 && aircraft.length < 10) {
        spawnAircraft();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}

export function Header({ isConnected, onAddStreamClick }: HeaderProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const playlistRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPlaylists) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (playlistRef.current && !playlistRef.current.contains(e.target as Node)) {
        setShowPlaylists(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPlaylists]);
  const { theme, setTheme, isDark } = useTheme();
  const { isCompact, toggleCompact } = useStreams();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('unsupported');
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setNotificationPermission(result);
  };

  // Cycle: system -> light -> dark -> system
  const cycleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  const themeIcon = theme === 'system' ? <FaDesktop /> : isDark ? <FaMoon /> : <FaSun />;
  const themeLabel = theme === 'system' ? 'System theme' : theme === 'dark' ? 'Dark theme' : 'Light theme';

  return (
    <header className="bg-primary shadow-md relative z-50">
      <div className="absolute inset-0 overflow-hidden">
        <RadarCanvas />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="flex items-center">
              <FaHeadset className="text-white text-2xl mr-3" />
              <h1 className="text-white text-xl font-semibold">LiveATC Stream Hub</h1>
            </div>
            <div className="ml-6 hidden md:flex items-center text-sm text-white/80">
              <span className={`mr-2 ${isConnected ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'} px-2 py-1 rounded-full flex items-center`}>
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span>{isConnected ? 'Proxy Server Connected' : 'Proxy Server Disconnected'}</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Notification permission toggle */}
            {notificationPermission !== 'unsupported' && (
              <button
                onClick={requestNotificationPermission}
                className={`transition text-white w-9 h-9 rounded-md flex items-center justify-center ${
                  notificationPermission === 'granted'
                    ? 'bg-white/20'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
                aria-label={notificationPermission === 'granted' ? 'Notifications enabled' : 'Enable notifications'}
                title={
                  notificationPermission === 'granted'
                    ? 'Notifications enabled'
                    : notificationPermission === 'denied'
                      ? 'Notifications blocked - update in browser settings'
                      : 'Enable notifications for stream drops'
                }
              >
                {notificationPermission === 'granted' ? <FaBell /> : <FaBellSlash />}
              </button>
            )}

            {/* Compact mode toggle */}
            <button
              onClick={toggleCompact}
              className="bg-white/10 hover:bg-white/20 transition text-white w-9 h-9 rounded-md flex items-center justify-center"
              aria-label={isCompact ? 'Switch to full view' : 'Switch to compact view'}
              title={isCompact ? 'Full view' : 'Compact view'}
            >
              {isCompact ? <FaTh /> : <FaThList />}
            </button>

            {/* Playlists */}
            <div className="relative" ref={playlistRef}>
              <button
                onClick={() => setShowPlaylists(!showPlaylists)}
                className="bg-white/10 hover:bg-white/20 transition text-white w-9 h-9 rounded-md flex items-center justify-center"
                aria-label="Playlists"
                title="Playlists"
              >
                <FaList />
              </button>
              {showPlaylists && (
                <PlaylistManager onClose={() => setShowPlaylists(false)} />
              )}
            </div>

            {/* Theme toggle */}
            <button
              onClick={cycleTheme}
              className="bg-white/10 hover:bg-white/20 transition text-white w-9 h-9 rounded-md flex items-center justify-center"
              aria-label={themeLabel}
              title={themeLabel}
            >
              {themeIcon}
            </button>
            {/* Keyboard shortcuts help */}
            <div className="relative">
              <button
                onClick={() => setShowShortcuts(!showShortcuts)}
                onBlur={() => setTimeout(() => setShowShortcuts(false), 150)}
                className="bg-white/10 hover:bg-white/20 transition text-white w-9 h-9 rounded-md flex items-center justify-center"
                aria-label="Keyboard shortcuts"
                title="Keyboard shortcuts"
              >
                <FaQuestionCircle />
              </button>
              {showShortcuts && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 p-3 z-50 text-sm text-neutral-700 dark:text-neutral-200">
                  <h4 className="font-semibold mb-2 text-neutral-800 dark:text-neutral-100">Keyboard Shortcuts</h4>
                  <ul className="space-y-1.5">
                    <li className="flex justify-between">
                      <span>Play / Pause</span>
                      <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded text-xs font-mono">Space</kbd>
                    </li>
                    <li className="flex justify-between">
                      <span>Mute / Unmute</span>
                      <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded text-xs font-mono">1-9</kbd>
                    </li>
                    <li className="flex justify-between">
                      <span>Deselect stream</span>
                      <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded text-xs font-mono">Esc</kbd>
                    </li>
                  </ul>
                </div>
              )}
            </div>
            <button
              onClick={onAddStreamClick}
              className="bg-white/10 hover:bg-white/20 transition text-white px-4 py-2 rounded-md flex items-center"
            >
              <FaPlus className="mr-2" />
              <span>Add Stream</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
