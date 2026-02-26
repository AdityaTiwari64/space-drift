import { Loader2, RocketIcon, TrophyIcon, TimerIcon, StarIcon, PlayIcon, UsersIcon, UserIcon, HelpCircleIcon, XIcon } from 'lucide-react';
import React, { useState, useEffect } from 'react'
import SocialMediaLinks from './SocialLinks';

type Props = { info: any }

const PLAYER_COLORS = ['#60a5fa', '#f472b6', '#34d399']; // blue, pink, green
const PLAYER_LABELS = ['Player 1', 'Player 2', 'Player 3'];

type LeaderboardEntry = { name: string; score: number; points: number; distance: number; date: string };

// Weighted score: 30% distance + 70% points
function computeScore(distance: number, points: number): number {
    return Math.round(distance * 0.3 + points * 0.7);
}

function getLeaderboard(): LeaderboardEntry[] {
    try {
        return JSON.parse(localStorage.getItem('meteorDashLeaderboard') || '[]').slice(0, 5);
    } catch { return []; }
}

// ── Leaderboard Panel (top-right corner) ─────────────────────
const LeaderboardPanel = () => {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    useEffect(() => { setEntries(getLeaderboard()); }, []);

    if (entries.length === 0) return null;
    const medals = ['🥇', '🥈', '🥉', '4', '5'];

    return (
        <div className='fixed top-4 right-6 z-40 flex flex-col gap-1.5 min-w-[200px]'>
            <div className='text-[10px] font-black tracking-[0.2em] text-yellow-400/70 uppercase text-center'>🏆 Leaderboard</div>
            {entries.map((e, i) => (
                <div key={i} className='flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 backdrop-blur-sm text-xs'>
                    <span className='w-5 text-center'>{medals[i]}</span>
                    <span className='flex-1 text-white/80 font-semibold truncate'>{e.name || 'Anonymous'}</span>
                    <span className='text-yellow-300 font-bold'>{e.score}</span>
                </div>
            ))}
        </div>
    );
};

const GameInfoOverlay = ({ info }: Props) => {
    const {
        gamePhase, gameMode, playerCount, currentPlayer, playerResults,
        isLoading, isDetected, distance, points, timeLeft,
        livesRemainingState, highScore,
        onStartSolo, onStartMulti, onPlayAgain, onBackToMenu, onNextPlayer, onShowResults,
    } = info;

    const [showInstructions, setShowInstructions] = useState(false);
    const [pendingStartAction, setPendingStartAction] = useState<(() => void) | null>(null);
    // Username prompt state
    const [showNamePrompt, setShowNamePrompt] = useState(false);
    const [username, setUsername] = useState('');
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

    const lives = Array.from({ length: livesRemainingState }, (_, i) =>
        <RocketIcon key={i} size={20} className='fill-red-600' />
    );
    const timerColor = timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-green-300';
    const isLastPlayer = currentPlayer >= playerCount - 1;
    const currentScore = computeScore(distance, points);

    const handleStartWithInstructions = (startFn: () => void) => {
        setPendingStartAction(() => startFn);
        setShowInstructions(true);
    };

    const handleDismissInstructions = () => {
        setShowInstructions(false);
        if (pendingStartAction) {
            pendingStartAction();
            setPendingStartAction(null);
        }
    };

    // Handle game over actions — show name prompt first
    const handleGameOverAction = (action: () => void) => {
        setShowNamePrompt(true);
        setPendingAction(() => action);
    };

    const submitName = (name: string) => {
        // Update the most recent leaderboard entry with the chosen name
        try {
            const lb: LeaderboardEntry[] = JSON.parse(localStorage.getItem('meteorDashLeaderboard') || '[]');
            // Find the latest entry (first one that has no name or default name)
            if (lb.length > 0) {
                // The most recently added entry is the one with matching score
                const finalScore = computeScore(distance, points);
                const idx = lb.findIndex(e => e.score === finalScore && (!e.name || e.name === 'Anonymous'));
                if (idx >= 0) {
                    lb[idx].name = name || 'Anonymous';
                    localStorage.setItem('meteorDashLeaderboard', JSON.stringify(lb));
                }
            }
        } catch { }
        setShowNamePrompt(false);
        setUsername('');
        if (pendingAction) {
            pendingAction();
            setPendingAction(null);
        }
    };

    // ── USERNAME PROMPT MODAL ─────────────────────────────────────
    const namePromptModal = showNamePrompt && (
        <div className='fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm'>
            <div className='flex flex-col items-center gap-4 bg-black/90 px-10 py-8 rounded-2xl border border-white/20 shadow-2xl backdrop-blur-md max-w-sm w-full mx-6'>
                <div className='text-3xl'>🏆</div>
                <h3 className='text-xl font-black tracking-widest text-white'>SAVE YOUR SCORE</h3>
                <p className='text-white/50 text-sm text-center'>Enter your name for the leaderboard, or stay anonymous</p>
                <input
                    type='text'
                    maxLength={15}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') submitName(username); }}
                    placeholder='Your name...'
                    autoFocus
                    className='w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-center font-bold text-lg placeholder:text-white/30 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/30 transition-all'
                />
                <div className='flex gap-3 w-full'>
                    <button onClick={() => submitName(username)}
                        className='flex-1 bg-yellow-500 hover:bg-yellow-400 active:scale-95 transition-all px-4 py-2.5 rounded-xl font-bold text-black shadow-lg'>
                        Save ✨
                    </button>
                    <button onClick={() => submitName('Anonymous')}
                        className='flex-1 bg-white/10 hover:bg-white/20 active:scale-95 transition-all px-4 py-2.5 rounded-xl font-semibold text-white/70 border border-white/20'>
                        Anonymous
                    </button>
                </div>
            </div>
        </div>
    );

    // ── INSTRUCTIONS MODAL ────────────────────────────────────────
    const instructionsModal = showInstructions && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm' onClick={handleDismissInstructions}>
            <div className='relative flex flex-col gap-5 bg-black/90 px-12 py-8 rounded-3xl border border-white/20 shadow-2xl backdrop-blur-md max-w-3xl w-full mx-6' onClick={e => e.stopPropagation()}>
                <button onClick={handleDismissInstructions}
                    className='absolute top-4 right-4 text-white/40 hover:text-white transition-colors'>
                    <XIcon size={20} />
                </button>
                <h2 className='text-2xl font-black tracking-widest text-white text-center'>📖 HOW TO PLAY</h2>
                <div className='grid grid-cols-2 gap-3 text-white/80 text-sm'>
                    <div className='flex items-start gap-3 bg-white/5 px-4 py-3 rounded-xl border border-white/10'>
                        <span className='text-xl mt-0.5'>✋</span>
                        <div><span className='font-bold text-white'>Hand Controls</span><br />Show both hands to the camera. Tilt left or right to steer.</div>
                    </div>
                    <div className='flex items-start gap-3 bg-white/5 px-4 py-3 rounded-xl border border-white/10'>
                        <span className='text-xl mt-0.5'>☄️</span>
                        <div><span className='font-bold text-white'>Dodge Meteors</span><br />Avoid boulders — each hit costs a life! You get <span className='text-red-400 font-bold'>2 lives</span>.</div>
                    </div>
                    <div className='flex items-start gap-3 bg-white/5 px-4 py-3 rounded-xl border border-white/10'>
                        <span className='text-xl mt-0.5'>⭐</span>
                        <div><span className='font-bold text-white'>Collect Stars</span><br />⭐ = <span className='text-yellow-300 font-bold'>+10 pts</span> | 🌟 Rare = <span className='text-red-400 font-bold'>+50 pts</span></div>
                    </div>
                    <div className='flex items-start gap-3 bg-white/5 px-4 py-3 rounded-xl border border-white/10'>
                        <span className='text-xl mt-0.5'>🏆</span>
                        <div><span className='font-bold text-white'>Score</span><br />Final score = <span className='text-cyan-300 font-bold'>30% distance</span> + <span className='text-yellow-300 font-bold'>70% stars</span></div>
                    </div>
                    <div className='col-span-2 flex items-start gap-3 bg-white/5 px-4 py-3 rounded-xl border border-white/10'>
                        <span className='text-xl mt-0.5'>⏸️</span>
                        <div><span className='font-bold text-white'>Pause</span> — Remove your hands from the camera to pause the game.</div>
                    </div>
                </div>
                <button onClick={handleDismissInstructions}
                    className='mt-1 self-center bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all px-10 py-2.5 rounded-xl font-bold text-white shadow-lg text-lg'>
                    {pendingStartAction ? '🚀 Start Game!' : 'Got It! 👍'}
                </button>
            </div>
        </div>
    );

    // ── MENU ─────────────────────────────────────────────────────
    if (gamePhase === 'menu') {
        return (
            <>
                {instructionsModal}
                <LeaderboardPanel />
                <div className='absolute z-30 h-screen w-screen flex items-center justify-center'>
                    <div className='flex flex-col items-center gap-6 bg-black/75 px-14 py-12 rounded-3xl border border-white/20 shadow-2xl backdrop-blur-md'>
                        <div className='text-5xl'>☄️</div>
                        <h1 className='text-4xl font-black tracking-widest text-white -mt-2'>SPACE DRIFT</h1>
                        <p className='text-white/50 text-sm tracking-wider text-center'>Dodge meteors • Collect ⭐ stars • Survive 60s</p>

                        {/* Solo */}
                        <button onClick={() => handleStartWithInstructions(onStartSolo)}
                            className='flex items-center gap-3 bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all px-8 py-3 rounded-xl font-bold text-white text-lg w-full justify-center shadow-lg'>
                            <UserIcon size={20} /> Solo Play
                        </button>

                        {/* How to Play */}
                        <button onClick={() => { setPendingStartAction(null); setShowInstructions(true); }}
                            className='flex items-center gap-3 bg-white/10 hover:bg-white/20 active:scale-95 transition-all px-8 py-3 rounded-xl font-semibold text-white text-base w-full justify-center shadow-lg border border-white/20'>
                            <HelpCircleIcon size={20} /> How to Play
                        </button>

                        {/* Multiplayer */}
                        <div className='w-full'>
                            <p className='text-white/40 text-xs text-center mb-3 tracking-widest uppercase'>⚔️ Multiplayer (Turn-Based)</p>
                            <div className='flex gap-3'>
                                <button onClick={() => handleStartWithInstructions(() => onStartMulti(2))}
                                    className='flex-1 flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-500 active:scale-95 transition-all px-4 py-3 rounded-xl font-bold text-white shadow-lg'>
                                    <UsersIcon size={18} /> 2 Players
                                </button>
                                <button onClick={() => handleStartWithInstructions(() => onStartMulti(3))}
                                    className='flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all px-4 py-3 rounded-xl font-bold text-white shadow-lg'>
                                    <UsersIcon size={18} /> 3 Players
                                </button>
                            </div>
                        </div>

                        <p className='text-white/60 text-lg font-bold tracking-widest'>Developed By Aditya Tiwari</p>
                    </div>
                </div>
            </>
        );
    }

    // ── RESULTS ──────────────────────────────────────────────────
    if (gamePhase === 'results') {
        const sorted = [...playerResults]
            .map((r: any, i: number) => ({ ...r, playerIdx: i, score: computeScore(r.distance, r.points) }))
            .sort((a: any, b: any) => b.score - a.score);
        const topScore = sorted[0]?.score ?? 0;
        const isTie = sorted.length > 1 && sorted[0].score === sorted[1].score && topScore > 0;

        const medals = ['🥇', '🥈', '🥉'];

        return (
            <div className='absolute z-30 h-screen w-screen flex items-center justify-center'>
                <div className='flex flex-col items-center gap-5 bg-black/80 px-12 py-10 rounded-3xl border border-white/20 shadow-2xl backdrop-blur-md w-full max-w-md'>
                    <h2 className='text-3xl font-black tracking-widest text-white'>🏁 FINAL RESULTS</h2>

                    <div className='w-full flex flex-col gap-3 mt-1'>
                        {sorted.map((r: any, rank: number) => {
                            const isWinner = rank === 0 && !isTie;
                            const color = PLAYER_COLORS[r.playerIdx] ?? '#fff';
                            return (
                                <div key={r.playerIdx}
                                    className={`flex items-center justify-between px-5 py-3 rounded-xl border transition-all
                                    ${isWinner ? 'border-yellow-400 bg-yellow-400/10' : 'border-white/10 bg-white/5'}`}>
                                    <div className='flex items-center gap-3'>
                                        <span className='text-xl'>{medals[rank] ?? '🎮'}</span>
                                        <span className='font-bold text-base' style={{ color }}>{PLAYER_LABELS[r.playerIdx]}</span>
                                        {isWinner && <span className='text-xs bg-yellow-400 text-black px-2 py-0.5 rounded-full font-black'>WINNER!</span>}
                                    </div>
                                    <div className='text-right'>
                                        <div className='text-white font-black text-lg'>🏆 {r.score}</div>
                                        <div className='text-white/50 text-xs'>⭐ {r.points} pts • 🚀 {r.distance} m</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {isTie && <p className='text-yellow-300 font-bold text-sm animate-pulse'>🤝 It&apos;s a Tie!</p>}

                    <div className='flex gap-3 w-full mt-1'>
                        <button onClick={onBackToMenu}
                            className='flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all px-4 py-3 rounded-xl font-bold text-white shadow-lg'>
                            <PlayIcon size={16} /> Play Again
                        </button>
                    </div>
                    <p className='text-white/20 text-xs tracking-widest'>Developed By Aditya Tiwari</p>
                </div>
            </div>
        );
    }

    // ── GAME OVER CARD ───────────────────────────────────────────
    const finalScore = computeScore(distance, points);
    const gameOverCard = gamePhase === 'gameover' && (
        <div className='flex flex-col items-center gap-4 bg-black/75 px-10 py-8 rounded-2xl border border-white/20 shadow-2xl backdrop-blur-sm'>
            <div className='text-3xl font-extrabold text-red-500 animate-pulse'>GAME OVER</div>
            {gameMode === 'multi' && (
                <div className='text-sm font-bold tracking-widest px-3 py-1 rounded-full'
                    style={{ color: PLAYER_COLORS[currentPlayer], background: PLAYER_COLORS[currentPlayer] + '22', border: `1px solid ${PLAYER_COLORS[currentPlayer]}55` }}>
                    {PLAYER_LABELS[currentPlayer]}&apos;s Turn Ended
                </div>
            )}
            <div className='flex flex-col items-center gap-2 mt-1 w-full'>
                <div className='flex items-center gap-2 text-2xl font-black text-white'>
                    🏆 Score: <span className='text-yellow-300'>{finalScore}</span>
                </div>
                <div className='flex items-center gap-2 text-sm font-bold text-white border-t border-white/20 pt-2 mt-1 w-full justify-center'>
                    <TrophyIcon size={16} className='text-yellow-400' />
                    High Score: <span className='text-yellow-400 ml-1'>{highScore}</span>
                </div>
            </div>

            <div className='flex gap-3 mt-1 w-full'>
                {gameMode === 'solo' ? (
                    <>
                        <button onClick={() => handleGameOverAction(onPlayAgain)}
                            className='flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all px-4 py-2 rounded-xl font-bold text-white shadow-lg'>
                            <PlayIcon size={15} /> Play Again
                        </button>
                        <button onClick={() => handleGameOverAction(onBackToMenu)}
                            className='px-4 py-2 rounded-xl font-semibold text-white/60 border border-white/20 hover:bg-white/10 transition-all text-sm'>
                            Menu
                        </button>
                    </>
                ) : isLastPlayer ? (
                    <button onClick={() => handleGameOverAction(onShowResults)}
                        className='flex-1 flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 active:scale-95 transition-all px-4 py-2 rounded-xl font-bold text-black shadow-lg'>
                        <TrophyIcon size={15} /> See Results →
                    </button>
                ) : (
                    <button onClick={() => handleGameOverAction(() => onNextPlayer(currentPlayer + 1))}
                        className='flex-1 flex items-center justify-center gap-2 active:scale-95 transition-all px-4 py-2 rounded-xl font-bold text-white shadow-lg'
                        style={{ background: PLAYER_COLORS[currentPlayer + 1] ?? '#ec4899' }}>
                        <PlayIcon size={15} /> {PLAYER_LABELS[currentPlayer + 1]}&apos;s Turn →
                    </button>
                )}
            </div>
            <p className='text-white/20 text-xs tracking-widest'>Developed By Aditya Tiwari</p>
        </div>
    );

    // ── IN-GAME / PAUSED ─────────────────────────────────────────
    return (
        <div className='absolute z-30 h-screen w-screen flex items-center justify-center'>
            {isLoading && <Loader2 size={80} className='animate-spin' />}

            {!isLoading && !isDetected && gamePhase === 'playing' && (
                <div className='flex flex-col items-center gap-3'>
                    <div className='text-2xl animate-ping font-extrabold'>P A U S E D</div>
                    <p className='text-sm font-semibold text-white/60 tracking-widest mt-6'>Developed By Aditya Tiwari</p>
                </div>
            )}

            {gameOverCard}
            {namePromptModal}

            {/* Top-right HUD */}
            {gamePhase === 'playing' && (
                <div className='fixed top-4 right-6 flex flex-col items-end gap-2'>
                    {gameMode === 'multi' && (
                        <div className='text-xs font-bold px-3 py-1 rounded-full'
                            style={{ background: PLAYER_COLORS[currentPlayer] + '33', color: PLAYER_COLORS[currentPlayer], border: `1px solid ${PLAYER_COLORS[currentPlayer]}66` }}>
                            {PLAYER_LABELS[currentPlayer]}
                        </div>
                    )}
                    <div className={`flex items-center gap-1 font-bold text-base ${timerColor}`}>
                        <TimerIcon size={18} />
                        {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
                    </div>
                    <div className='flex items-center gap-1.5 text-lg font-black text-white'>
                        🏆 {currentScore}
                    </div>
                    <div className='flex items-center gap-1 text-xs font-semibold text-yellow-300'>
                        <StarIcon size={14} className='fill-yellow-300' /> {points} pts
                    </div>
                    <div className='text-xs font-semibold text-white/50'>🚀 {distance} m</div>
                    <div className='flex flex-row gap-1'>{lives}</div>
                    <div className='flex items-center gap-1 text-xs text-yellow-400/70'>
                        <TrophyIcon size={13} /> Best: {highScore}
                    </div>
                </div>
            )}

            {/* Bottom-right social */}
            <div className='text-xs fixed bottom-6 right-6 flex flex-col items-end gap-1'>
                <p className='text-white/40 tracking-widest text-[10px]'>Developed By Aditya Tiwari</p>
                <div className='flex flex-row items-center gap-3'>
                    <p className='text-white/50'>Share your thoughts 👉</p>
                    <SocialMediaLinks />
                </div>
            </div>
        </div>
    );
};

export default GameInfoOverlay;