import { Loader2, RocketIcon, TrophyIcon, TimerIcon, StarIcon, PlayIcon, UsersIcon, UserIcon, HelpCircleIcon, XIcon } from 'lucide-react';
import React, { useState } from 'react'
import SocialMediaLinks from './SocialLinks';

type Props = { info: any }

const PLAYER_COLORS = ['#60a5fa', '#f472b6', '#34d399']; // blue, pink, green
const PLAYER_LABELS = ['Player 1', 'Player 2', 'Player 3'];

const GameInfoOverlay = ({ info }: Props) => {
    const {
        gamePhase, gameMode, playerCount, currentPlayer, playerResults,
        isLoading, isDetected, isColliding, distance, points, timeLeft,
        livesRemainingState, highScore,
        onStartSolo, onStartMulti, onPlayAgain, onBackToMenu, onNextPlayer, onShowResults,
    } = info;

    const [showInstructions, setShowInstructions] = useState(false);
    const [pendingStartAction, setPendingStartAction] = useState<(() => void) | null>(null);

    const lives = Array.from({ length: livesRemainingState }, (_, i) =>
        <RocketIcon key={i} size={20} className='fill-red-600' />
    );
    const timerColor = timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-green-300';
    const isLastPlayer = currentPlayer >= playerCount - 1;

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

    // ── INSTRUCTIONS MODAL (wide horizontal layout) ───────────────
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
                        <div><span className='font-bold text-white'>Collect Stars</span><br />Grab falling stars for <span className='text-yellow-300 font-bold'>+10 points</span> each.</div>
                    </div>
                    <div className='flex items-start gap-3 bg-white/5 px-4 py-3 rounded-xl border border-white/10'>
                        <span className='text-xl mt-0.5'>⏱️</span>
                        <div><span className='font-bold text-white'>Survive 60s</span><br />Game lasts 60 seconds. Difficulty rises!</div>
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
            .map((r, i) => ({ ...r, playerIdx: i }))
            .sort((a, b) => b.points - a.points);
        const topScore = sorted[0]?.points ?? 0;
        const isTie = sorted.length > 1 && sorted[0].points === sorted[1].points && topScore > 0;

        const medals = ['🥇', '🥈', '🥉'];

        return (
            <div className='absolute z-30 h-screen w-screen flex items-center justify-center'>
                <div className='flex flex-col items-center gap-5 bg-black/80 px-12 py-10 rounded-3xl border border-white/20 shadow-2xl backdrop-blur-md w-full max-w-md'>
                    <h2 className='text-3xl font-black tracking-widest text-white'>🏁 FINAL RESULTS</h2>

                    <div className='w-full flex flex-col gap-3 mt-1'>
                        {sorted.map((r, rank) => {
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
                                        <div className='text-yellow-300 font-bold text-lg'>⭐ {r.points} pts</div>
                                        <div className='text-white/50 text-xs'>🚀 {r.distance} m</div>
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
                <div className='flex items-center gap-2 text-xl font-bold text-white'>
                    <StarIcon size={22} className='text-yellow-300 fill-yellow-300' />
                    Points: <span className='text-yellow-300 ml-1'>{points}</span>
                </div>
                <div className='text-base font-semibold text-white/80'>
                    🚀 Distance: <span className='text-cyan-300'>{distance}</span>
                </div>
                <div className='flex items-center gap-2 text-sm font-bold text-white border-t border-white/20 pt-2 mt-1 w-full justify-center'>
                    <TrophyIcon size={16} className='text-yellow-400' />
                    High Score: <span className='text-yellow-400 ml-1'>{highScore}</span>
                </div>
            </div>

            <div className='flex gap-3 mt-1 w-full'>
                {gameMode === 'solo' ? (
                    <>
                        <button onClick={onPlayAgain}
                            className='flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all px-4 py-2 rounded-xl font-bold text-white shadow-lg'>
                            <PlayIcon size={15} /> Play Again
                        </button>
                        <button onClick={onBackToMenu}
                            className='px-4 py-2 rounded-xl font-semibold text-white/60 border border-white/20 hover:bg-white/10 transition-all text-sm'>
                            Menu
                        </button>
                    </>
                ) : isLastPlayer ? (
                    <button onClick={onShowResults}
                        className='flex-1 flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 active:scale-95 transition-all px-4 py-2 rounded-xl font-bold text-black shadow-lg'>
                        <TrophyIcon size={15} /> See Results →
                    </button>
                ) : (
                    <button onClick={() => onNextPlayer(currentPlayer + 1)}
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
        <div className={`absolute z-30 h-screen w-screen flex items-center justify-center ${isColliding && 'border-[20px] border-red-600'}`}>
            {isLoading && <Loader2 size={80} className='animate-spin' />}

            {!isLoading && !isDetected && gamePhase === 'playing' && (
                <div className='flex flex-col items-center gap-3'>
                    <div className='text-2xl animate-ping font-extrabold'>P A U S E D</div>
                    <p className='text-sm font-semibold text-white/60 tracking-widest mt-6'>Developed By Aditya Tiwari</p>
                </div>
            )}

            {gameOverCard}

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
                    <div className='flex items-center gap-1 text-sm font-semibold text-yellow-300'>
                        <StarIcon size={16} className='fill-yellow-300' /> {points} pts
                    </div>
                    <div className='text-sm font-semibold text-white/70'>Dist: {distance}</div>
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