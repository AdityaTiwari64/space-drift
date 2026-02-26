"use client"
import BoulderComponent from "@/components/BoulderComponent";
import GameInfoOverlay from "@/components/GameInfoOverlay";
import HandRecognizer from "@/components/HandRecognizer";
import RewardComponent from "@/components/RewardComponent";
import RocketComponent from "@/components/RocketComponent";
import { playBackground, playFX, playCollectFX, playGameStartFX, playGameOverFX, playCountdownFX, playWhooshFX, playRareCollectFX } from "@/utils/audiohandler";
import { useCallback, useEffect, useRef, useState } from "react";

let generationInterval: any;
let removalInterval: any;
let rewardInterval: any;
let timerInterval: any;

const GAME_DURATION = 60;
const MAX_LIVES = 2;
const MAX_BOULDERS = 12;
const MAX_REWARDS = 10;
const ENTITY_TTL = 10000;
const COLLISION_INTERVAL = 50; // ms — check collisions at ~20fps
const DISTANCE_SYNC_INTERVAL = 2000; // ms — sync distance/points/lives to React state for overlay
const LERP_SPEED = 0.4; // higher = snappier response (0 = no movement, 1 = instant snap)

let isInvincible = false;
let livesRemaining: number;

export type GamePhase = 'menu' | 'playing' | 'gameover' | 'results';
export type GameMode = 'solo' | 'multi';

export default function Home() {
  const [gamePhase, setGamePhase] = useState<GamePhase>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('solo');
  const [playerCount, setPlayerCount] = useState(1);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [playerResults, setPlayerResults] = useState<{ points: number; distance: number }[]>([]);

  const [isDetected, setIsDetected] = useState(false);
  const [boulders, setBoulders] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [distance, setDistance] = useState(0);
  const [points, setPoints] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [livesRemainingState, setLivesRemainingState] = useState(MAX_LIVES);
  const [boulderSpeed, setBoulderSpeed] = useState(10);
  const [highScore, setHighScore] = useState(0);

  // ── Refs (avoid state for frequently-updated values) ──────────
  const rocketRef = useRef<HTMLDivElement>(null);
  const rocketWiggleRef = useRef<HTMLDivElement>(null);
  const distanceRef = useRef(0);
  const pointsRef = useRef(0);
  const rocketLeftRef = useRef(0);       // current visual position
  const rocketTargetRef = useRef(0);     // target position from hand detection
  const isDetectedRef = useRef(false);
  const gamePhaseRef = useRef<GamePhase>('menu');

  const boulderRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const rewardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const collectedRef = useRef<Set<string>>(new Set());
  const rewardRareRef = useRef<Map<string, boolean>>(new Map()); // tracks which rewards are rare
  const degreesRef = useRef(0);   // direct DOM updates — no React state

  // DOM refs for direct text updates (bypass React render for HUD)
  const distanceDomRef = useRef<HTMLElement | null>(null);
  const pointsDomRef = useRef<HTMLElement | null>(null);

  // Keep refs in sync with state (only for values that ALSO need state)
  useEffect(() => { isDetectedRef.current = isDetected; }, [isDetected]);
  useEffect(() => { gamePhaseRef.current = gamePhase; }, [gamePhase]);

  useEffect(() => {
    const center = window.innerWidth / 2;
    rocketLeftRef.current = center;
    rocketTargetRef.current = center;
    if (rocketRef.current) {
      rocketRef.current.style.left = `${center}px`;
    }
    const saved = localStorage.getItem('meteorDashHighScore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // ── Helpers ──────────────────────────────────────────────────
  const resetRound = () => {
    livesRemaining = MAX_LIVES;
    isInvincible = false;
    setLivesRemainingState(MAX_LIVES);
    setDistance(0); distanceRef.current = 0;
    setPoints(0); pointsRef.current = 0;
    setTimeLeft(GAME_DURATION);
    setBoulders([]);
    setRewards([]);
    // Reset wiggle via DOM
    if (rocketWiggleRef.current) {
      rocketWiggleRef.current.classList.remove('wiggle');
      rocketWiggleRef.current.style.marginTop = '0px';
    }
    setBoulderSpeed(10);
    collectedRef.current = new Set();
    rewardRareRef.current.clear();
    boulderRefs.current.clear();
    rewardRefs.current.clear();
    rocketLeftRef.current = window.innerWidth / 2;
    rocketTargetRef.current = window.innerWidth / 2;
    if (rocketRef.current) {
      rocketRef.current.style.left = `${rocketLeftRef.current}px`;
    }
  };

  const startGame = (mode: GameMode, count: number) => {
    setGameMode(mode);
    setPlayerCount(count);
    setCurrentPlayer(0);
    setPlayerResults([]);
    resetRound();
    setGamePhase('playing');
    playGameStartFX();
  };

  const triggerGameOver = () => {
    const finalPoints = pointsRef.current;
    const finalDistance = distanceRef.current;
    const finalScore = Math.round(finalDistance * 0.3 + finalPoints * 0.7);
    // Sync final values to state for the overlay
    setPoints(finalPoints);
    setDistance(finalDistance);
    setLivesRemainingState(livesRemaining);
    setPlayerResults(prev => [...prev, { points: finalPoints, distance: finalDistance }]);
    setHighScore(prev => {
      const newHigh = Math.max(prev, finalScore);
      localStorage.setItem('meteorDashHighScore', String(newHigh));
      return newHigh;
    });
    // Save to leaderboard
    try {
      const lb = JSON.parse(localStorage.getItem('meteorDashLeaderboard') || '[]');
      lb.push({ name: 'Anonymous', score: finalScore, points: finalPoints, distance: finalDistance, date: new Date().toLocaleDateString() });
      lb.sort((a: any, b: any) => b.score - a.score);
      localStorage.setItem('meteorDashLeaderboard', JSON.stringify(lb.slice(0, 10)));
    } catch { }
    setGamePhase('gameover');
    playGameOverFX();
  };

  const handlePlayAgain = () => { resetRound(); setGamePhase('playing'); };
  const handleBackToMenu = () => { resetRound(); setPlayerResults([]); setGamePhase('menu'); };
  const handleNextPlayer = (nextIdx: number) => {
    setCurrentPlayer(nextIdx);
    resetRound();
    setGamePhase('playing');
  };
  const handleShowResults = () => setGamePhase('results');

  const collisionHandler = useCallback(() => {
    if (!isInvincible && gamePhaseRef.current === 'playing') {
      isInvincible = true;
      // ALL visual updates via direct DOM — ZERO React re-renders during collision
      if (rocketWiggleRef.current) {
        rocketWiggleRef.current.classList.add('wiggle');
        rocketWiggleRef.current.style.marginTop = '7px';
      }
      playFX();
      livesRemaining--;
      // Don't call setLivesRemainingState here — the game loop syncs it periodically
      if (livesRemaining <= 0) triggerGameOver();
      setTimeout(() => {
        isInvincible = false;
        if (rocketWiggleRef.current) {
          rocketWiggleRef.current.classList.remove('wiggle');
          rocketWiggleRef.current.style.marginTop = '0px';
        }
      }, 1500);
    }
  }, []);

  const handleRewardCollect = useCallback((key: string, isRare?: boolean) => {
    if (collectedRef.current.has(key)) return; // already collected
    collectedRef.current.add(key);
    pointsRef.current += isRare ? 50 : 10;
    // Hide the element immediately via DOM — no React re-render needed
    const el = rewardRefs.current.get(key);
    if (el) el.style.display = 'none';
    if (isRare) {
      playRareCollectFX();
    } else {
      playCollectFX();
    }
  }, []);

  // ── UNIFIED GAME LOOP — single RAF for movement + collisions ──
  useEffect(() => {
    let rafId: number;
    let lastCollisionCheck = 0;
    let lastDistanceSync = 0;
    let lastDistanceTick = 0;

    const gameLoop = (timestamp: number) => {
      // ── 1. Smooth rocket interpolation (runs every frame) ──
      const diff = rocketTargetRef.current - rocketLeftRef.current;
      if (Math.abs(diff) > 0.5) {
        rocketLeftRef.current += diff * LERP_SPEED;
      }
      // Always assert position via style.left (immune to CSS animation conflicts)
      if (rocketRef.current) {
        rocketRef.current.style.left = `${rocketLeftRef.current}px`;
      }

      // ── 2. Distance counter (every 250ms via ref — no React state) ──
      if (isDetectedRef.current && gamePhaseRef.current === 'playing') {
        if (timestamp - lastDistanceTick >= 250) {
          lastDistanceTick = timestamp;
          distanceRef.current += 1;
        }
      }

      // ── 3. Sync distance/points to React state every ~2s (for overlay display) ──
      if (timestamp - lastDistanceSync >= DISTANCE_SYNC_INTERVAL) {
        lastDistanceSync = timestamp;
        if (gamePhaseRef.current === 'playing') {
          setDistance(distanceRef.current);
          setPoints(pointsRef.current);
          setLivesRemainingState(livesRemaining);
        }
      }

      // ── 4. Collision detection (throttled to ~20fps) ──
      if (timestamp - lastCollisionCheck >= COLLISION_INTERVAL) {
        lastCollisionCheck = timestamp;

        if (isDetectedRef.current && gamePhaseRef.current === 'playing') {
          const rocketEl = rocketRef.current;
          if (rocketEl) {
            const rocket = rocketEl.getBoundingClientRect();
            const rocketTop = rocket.top;
            const rocketBottom = rocket.bottom;
            const rocketLeft = rocket.left;
            const rocketRight = rocket.right;

            // Check boulders
            boulderRefs.current.forEach((el) => {
              if (!el) return;
              const b = el.getBoundingClientRect();
              // Early exit: skip if clearly out of range
              if (b.bottom < rocketTop - 50 || b.top > rocketBottom + 50) return;
              if (b.right < rocketLeft - 50 || b.left > rocketRight + 50) return;
              if (
                b.left + 30 < rocketRight &&
                b.right - 30 > rocketLeft &&
                b.bottom - 30 > rocketTop &&
                b.top + 30 < rocketBottom
              ) {
                collisionHandler();
              } else if (
                // Near-miss detection: boulder is close but didn't hit
                b.bottom > rocketTop - 20 && b.top < rocketBottom + 20 &&
                Math.abs((b.left + b.right) / 2 - (rocketLeft + rocketRight) / 2) < 80
              ) {
                playWhooshFX();
              }
            });

            // Check rewards
            rewardRefs.current.forEach((el, key) => {
              if (!el || collectedRef.current.has(key)) return;
              const r = el.getBoundingClientRect();
              // Early exit: skip if clearly out of range
              if (r.bottom < rocketTop - 30 || r.top > rocketBottom + 30) return;
              if (r.right < rocketLeft - 30 || r.left > rocketRight + 30) return;
              if (
                r.left + 10 < rocketRight &&
                r.right - 10 > rocketLeft &&
                r.bottom - 10 > rocketTop &&
                r.top + 10 < rocketBottom
              ) {
                handleRewardCollect(key, rewardRareRef.current.get(key));
              }
            });
          }
        }
      }

      rafId = requestAnimationFrame(gameLoop);
    };

    rafId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(rafId);
  }, [collisionHandler, handleRewardCollect]);

  // ── Difficulty ────────────────────────────────────────────────
  useEffect(() => {
    if (gamePhase !== 'playing' || !isDetected) return;
    setBoulderSpeed(Math.max(3, 10 - Math.floor(distance / 50)));
  }, [distance, gamePhase, isDetected]);

  // ── 60-second countdown ───────────────────────────────────────
  useEffect(() => {
    if (isDetected && gamePhase === 'playing') {
      timerInterval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { clearInterval(timerInterval); triggerGameOver(); return 0; }
          // Countdown tick in the last 10 seconds for urgency
          if (prev <= 11) playCountdownFX(prev - 1);
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerInterval);
  }, [isDetected, gamePhase]);

  // ── Boulder spawning ─────────────────────────────────────────
  useEffect(() => {
    if (isDetected && gamePhase === 'playing') {
      generationInterval = setInterval(() => {
        const count = Math.min(8, 2 + Math.floor(distanceRef.current / 150));
        setBoulders(prev => {
          const arr = [...prev];
          const now = Date.now();
          for (let i = 0; i < count; i++) {
            arr.push({ timestamp: now, key: `b-${now}-${Math.random()}` });
          }
          if (arr.length > MAX_BOULDERS) {
            const removed = arr.splice(0, arr.length - MAX_BOULDERS);
            removed.forEach(b => boulderRefs.current.delete(b.key));
          }
          return arr;
        });
      }, 1000);
      removalInterval = setInterval(() => {
        const now = Date.now();
        setBoulders(prev => {
          const kept = prev.filter(b => now - b.timestamp < ENTITY_TTL);
          prev.forEach(b => {
            if (now - b.timestamp >= ENTITY_TTL) boulderRefs.current.delete(b.key);
          });
          return kept;
        });
        setRewards(prev => {
          const kept = prev.filter(r => r.timestamp && now - r.timestamp < ENTITY_TTL);
          prev.forEach(r => {
            if (!r.timestamp || now - r.timestamp >= ENTITY_TTL) rewardRefs.current.delete(r.key);
          });
          return kept;
        });
      }, 3000);
    }
    return () => { clearInterval(generationInterval); clearInterval(removalInterval); };
  }, [isDetected, gamePhase]);

  // ── Star / reward spawning ────────────────────────────────────
  useEffect(() => {
    if (isDetected && gamePhase === 'playing') {
      const spawnWave = () => {
        const delay = 1000 + Math.random() * 1000;
        rewardInterval = setTimeout(() => {
          const count = 2 + Math.floor(Math.random() * 3);
          const now = Date.now();
          const newRewards = Array.from({ length: count }, (_, i) => {
            const sectionWidth = window.innerWidth / count;
            const xOffset = sectionWidth * i + Math.random() * (sectionWidth - 60);
            const yOffset = -Math.random() * 100 - (i * 80);
            const isRare = Math.random() < 0.1; // ~10% chance of rare red star
            return {
              key: `r-${now}-${i}-${Math.random()}`,
              timestamp: now,
              xOffset,
              yOffset,
              isRare,
            };
          });
          setRewards(prev => {
            const arr = [...prev, ...newRewards];
            // Track rare flags in ref
            newRewards.forEach(r => { if (r.isRare) rewardRareRef.current.set(r.key, true); });
            if (arr.length > MAX_REWARDS) {
              const removed = arr.splice(0, arr.length - MAX_REWARDS);
              removed.forEach(r => rewardRefs.current.delete(r.key));
            }
            return arr;
          });
          spawnWave();
        }, delay);
      };
      spawnWave();
    }
    return () => clearTimeout(rewardInterval);
  }, [isDetected, gamePhase]);

  // ── Ref callbacks (stable — no new closures per render) ───────
  const boulderRefCallbacks = useRef<Map<string, (el: HTMLDivElement | null) => void>>(new Map());
  const rewardRefCallbacks = useRef<Map<string, (el: HTMLDivElement | null) => void>>(new Map());

  const getBoulderRef = useCallback((key: string) => {
    let cb = boulderRefCallbacks.current.get(key);
    if (!cb) {
      cb = (el: HTMLDivElement | null) => {
        if (el) boulderRefs.current.set(key, el);
        else boulderRefs.current.delete(key);
      };
      boulderRefCallbacks.current.set(key, cb);
    }
    return cb;
  }, []);

  const getRewardRef = useCallback((key: string) => {
    let cb = rewardRefCallbacks.current.get(key);
    if (!cb) {
      cb = (el: HTMLDivElement | null) => {
        if (el) rewardRefs.current.set(key, el);
        else rewardRefs.current.delete(key);
      };
      rewardRefCallbacks.current.set(key, cb);
    }
    return cb;
  }, []);

  const setHandResults = useCallback((result: any) => {
    if (result.isLoading !== undefined) setIsLoading(result.isLoading);
    if (result.isDetected !== undefined && result.isDetected !== isDetectedRef.current) {
      setIsDetected(result.isDetected);
    }

    // Direct DOM update for rocket rotation
    if (result.degrees !== undefined) {
      degreesRef.current = result.degrees;
      if (rocketRef.current) {
        const svg = rocketRef.current.querySelector('svg');
        if (svg) {
          (svg as SVGElement).style.transform = `rotate(${-45 - result.degrees / 3}deg)`;
        }
      }
    }

    // Set TARGET position — the unified game loop will spring toward it
    if (result.degrees && result.degrees !== 0) {
      const newTarget = rocketTargetRef.current - result.degrees / 4;
      if (newTarget >= 20 && newTarget <= window.innerWidth - 52) {
        rocketTargetRef.current = newTarget;
      }
    }
  }, []);

  useEffect(() => {
    playBackground(!(isDetected && gamePhase === 'playing'));
  }, [isDetected, gamePhase]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className={`absolute left-3 top-3 z-30 transition-all duration-500 ${isDetected ? 'w-24' : 'w-48'}`}>
        <HandRecognizer setHandResults={setHandResults} />
      </div>
      <div ref={rocketRef} id='rocket-container' style={{
        position: "absolute",
        left: '50%',
        marginTop: '500px',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden' as any,
      }}>
        <div ref={rocketWiggleRef}>
          <RocketComponent degrees={0} />
        </div>
      </div>

      {/* Boulders */}
      {gamePhase === 'playing' && (
        <div className="absolute z-10 h-screen w-screen overflow-hidden pointer-events-none" style={{ contain: 'strict' }}>
          {boulders.map(b => (
            <BoulderComponent key={b.key} ref={getBoulderRef(b.key)}
              isMoving={isDetected} speed={boulderSpeed} />
          ))}
        </div>
      )}

      {/* Rewards */}
      {gamePhase === 'playing' && (
        <div className="absolute z-20 h-screen w-screen overflow-hidden pointer-events-none" style={{ contain: 'strict' }}>
          {rewards.map(r => (
            <RewardComponent key={r.key} ref={getRewardRef(r.key)} id={r.key}
              isMoving={isDetected} collected={collectedRef.current.has(r.key)}
              xOffset={r.xOffset} yOffset={r.yOffset} isRare={r.isRare} />
          ))}
        </div>
      )}

      <GameInfoOverlay info={{
        gamePhase, gameMode, playerCount, currentPlayer, playerResults,
        isLoading, isDetected, distance, points, timeLeft,
        livesRemainingState, highScore,
        onStartSolo: () => startGame('solo', 1),
        onStartMulti: (count: number) => startGame('multi', count),
        onPlayAgain: handlePlayAgain,
        onBackToMenu: handleBackToMenu,
        onNextPlayer: handleNextPlayer,
        onShowResults: handleShowResults,
      }} />
    </main>
  );
}
