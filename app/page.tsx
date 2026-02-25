"use client"
import BoulderComponent from "@/components/BoulderComponent";
import GameInfoOverlay from "@/components/GameInfoOverlay";
import HandRecognizer from "@/components/HandRecognizer";
import RewardComponent from "@/components/RewardComponent";
import RocketComponent from "@/components/RocketComponent";
import { playBackground, playFX, playCollectFX } from "@/utils/audiohandler";
import { useCallback, useEffect, useRef, useState } from "react";

let generationInterval: any;
let removalInterval: any;
let rewardInterval: any;
let distanceInterval: any;
let timerInterval: any;

const GAME_DURATION = 60;
const MAX_LIVES = 2;
const MAX_BOULDERS = 12;
const MAX_REWARDS = 10;
const ENTITY_TTL = 10000;
const COLLISION_INTERVAL = 50; // ms — check collisions at ~20fps, not 60

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
  const [isColliding, setIsColliding] = useState(false);
  const [distance, setDistance] = useState(0);
  const [points, setPoints] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [livesRemainingState, setLivesRemainingState] = useState(MAX_LIVES);
  const [boulderSpeed, setBoulderSpeed] = useState(10);
  const [highScore, setHighScore] = useState(0);
  const [collectedRewards, setCollectedRewards] = useState<Set<string>>(new Set());

  // ── Refs (avoid state for frequently-updated values) ──────────
  const rocketRef = useRef<HTMLDivElement>(null);
  const distanceRef = useRef(0);
  const pointsRef = useRef(0);
  const rocketLeftRef = useRef(0);       // current visual position
  const rocketTargetRef = useRef(0);     // target position from hand detection
  const isDetectedRef = useRef(false);
  const gamePhaseRef = useRef<GamePhase>('menu');

  const boulderRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const rewardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const collectedRef = useRef<Set<string>>(new Set());
  const degreesRef = useRef(0);   // direct DOM updates — no React state

  // Keep refs in sync with state (only for values that ALSO need state)
  useEffect(() => { distanceRef.current = distance; }, [distance]);
  useEffect(() => { pointsRef.current = points; }, [points]);
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
    setIsColliding(false);
    setBoulderSpeed(10);
    setCollectedRewards(new Set());
    collectedRef.current = new Set();
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
  };

  const triggerGameOver = () => {
    const finalPoints = pointsRef.current;
    const finalDistance = distanceRef.current;
    setPlayerResults(prev => [...prev, { points: finalPoints, distance: finalDistance }]);
    setHighScore(prev => {
      const newHigh = Math.max(prev, finalPoints);
      localStorage.setItem('meteorDashHighScore', String(newHigh));
      return newHigh;
    });
    setGamePhase('gameover');
  };

  const handlePlayAgain = () => { resetRound(); setGamePhase('playing'); };
  const handleBackToMenu = () => { resetRound(); setPlayerResults([]); setGamePhase('menu'); };
  const handleNextPlayer = (nextIdx: number) => {
    setCurrentPlayer(nextIdx);
    resetRound();
    setGamePhase('playing');
  };
  const handleShowResults = () => setGamePhase('results');

  // ── Collision handler (uses refs to avoid stale closures) ──────
  const collisionHandler = useCallback(() => {
    if (!isInvincible && gamePhaseRef.current === 'playing') {
      isInvincible = true;
      setIsColliding(true);
      playFX();
      livesRemaining--;
      setLivesRemainingState(livesRemaining);
      if (livesRemaining <= 0) triggerGameOver();
      setTimeout(() => { isInvincible = false; setIsColliding(false); }, 1500);
    }
  }, []);

  const handleRewardCollect = useCallback((key: string) => {
    if (collectedRef.current.has(key)) return; // already collected
    collectedRef.current.add(key);
    setCollectedRewards(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    setPoints(prev => prev + 10);
    playCollectFX();
  }, []);

  // ── Centralized collision detection (throttled to ~20fps) ─────
  useEffect(() => {
    if (gamePhase !== 'playing' || !isDetected) return;

    let rafId: number;
    let lastCheck = 0;

    const checkCollisions = (timestamp: number) => {
      // Throttle: only check every COLLISION_INTERVAL ms
      if (timestamp - lastCheck < COLLISION_INTERVAL) {
        rafId = requestAnimationFrame(checkCollisions);
        return;
      }
      lastCheck = timestamp;

      const rocketEl = rocketRef.current;
      if (!rocketEl) {
        rafId = requestAnimationFrame(checkCollisions);
        return;
      }

      const rocket = rocketEl.getBoundingClientRect();

      // Check boulders
      boulderRefs.current.forEach((el) => {
        if (!el) return;
        const b = el.getBoundingClientRect();
        if (
          b.left + 30 < rocket.right &&
          b.right - 30 > rocket.left &&
          b.bottom - 30 > rocket.top &&
          b.top + 30 < rocket.bottom
        ) {
          collisionHandler();
        }
      });

      // Check rewards
      rewardRefs.current.forEach((el, key) => {
        if (!el || collectedRef.current.has(key)) return;
        const r = el.getBoundingClientRect();
        if (
          r.left + 10 < rocket.right &&
          r.right - 10 > rocket.left &&
          r.bottom - 10 > rocket.top &&
          r.top + 10 < rocket.bottom
        ) {
          handleRewardCollect(key);
        }
      });

      rafId = requestAnimationFrame(checkCollisions);
    };

    rafId = requestAnimationFrame(checkCollisions);
    return () => cancelAnimationFrame(rafId);
  }, [gamePhase, isDetected, collisionHandler, handleRewardCollect]);

  // ── Difficulty ────────────────────────────────────────────────
  useEffect(() => {
    if (gamePhase !== 'playing' || !isDetected) return;
    setBoulderSpeed(Math.max(3, 10 - Math.floor(distance / 50)));
  }, [distance, gamePhase, isDetected]);

  // ── Distance counter ─────────────────────────────────────────
  useEffect(() => {
    if (isDetected && gamePhase === 'playing') {
      distanceInterval = setInterval(() => setDistance(prev => prev + 1), 250);
    }
    return () => clearInterval(distanceInterval);
  }, [isDetected, gamePhase]);

  // ── 60-second countdown ───────────────────────────────────────
  useEffect(() => {
    if (isDetected && gamePhase === 'playing') {
      timerInterval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { clearInterval(timerInterval); triggerGameOver(); return 0; }
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
          let arr = [...prev];
          for (let i = 0; i < count; i++) {
            const now = Date.now();
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
            return {
              key: `r-${now}-${i}-${Math.random()}`,
              timestamp: now,
              xOffset,
              yOffset
            };
          });
          setRewards(prev => {
            let arr = [...prev, ...newRewards];
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

  // ── 60fps smooth interpolation loop for rocket movement ───────
  useEffect(() => {
    let smoothRafId: number;
    const LERP_SPEED = 0.25; // 0 = no movement, 1 = instant snap

    const smoothLoop = () => {
      const diff = rocketTargetRef.current - rocketLeftRef.current;
      if (Math.abs(diff) > 0.5) {
        rocketLeftRef.current += diff * LERP_SPEED;
        if (rocketRef.current) {
          rocketRef.current.style.left = `${rocketLeftRef.current}px`;
        }
      }
      smoothRafId = requestAnimationFrame(smoothLoop);
    };
    smoothRafId = requestAnimationFrame(smoothLoop);
    return () => cancelAnimationFrame(smoothRafId);
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

    // Set TARGET position — the 60fps smooth loop will lerp toward it
    if (result.degrees && result.degrees !== 0) {
      const newTarget = rocketTargetRef.current - result.degrees / 6;
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
      <div ref={rocketRef} id='rocket-container' className={`${isInvincible && 'wiggle'}`} style={{
        position: "absolute",
        marginTop: `${isInvincible ? '507px' : '500px'}`
      }}>
        <RocketComponent degrees={0} />
      </div>

      {/* Boulders */}
      {gamePhase === 'playing' && (
        <div className="absolute z-10 h-screen w-screen overflow-hidden pointer-events-none" style={{ contain: 'layout style paint' }}>
          {boulders.map(b => (
            <BoulderComponent key={b.key} ref={getBoulderRef(b.key)}
              isMoving={isDetected} speed={boulderSpeed} />
          ))}
        </div>
      )}

      {/* Rewards */}
      {gamePhase === 'playing' && (
        <div className="absolute z-20 h-screen w-screen overflow-hidden pointer-events-none" style={{ contain: 'layout style paint' }}>
          {rewards.map(r => (
            <RewardComponent key={r.key} ref={getRewardRef(r.key)} id={r.key}
              isMoving={isDetected} collected={collectedRewards.has(r.key)}
              xOffset={r.xOffset} yOffset={r.yOffset} />
          ))}
        </div>
      )}

      <GameInfoOverlay info={{
        gamePhase, gameMode, playerCount, currentPlayer, playerResults,
        isLoading, isDetected, isColliding, distance, points, timeLeft,
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
