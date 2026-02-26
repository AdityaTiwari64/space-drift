'use client'
import React, { useEffect, useState, useMemo, forwardRef } from 'react'

type Props = {
    isMoving?: boolean,
    id: string,
    xOffset?: number,
    yOffset?: number,
    collected?: boolean,
    isRare?: boolean,
}

const RewardComponent = React.memo(forwardRef<HTMLDivElement, Props>(
    ({ isMoving, id, xOffset, yOffset, collected, isRare }, ref) => {
        // Compute positions synchronously — no mount→setState→re-render cycle
        const x = useMemo(() => xOffset !== undefined ? xOffset : Math.random() * (window.innerWidth - 80), [xOffset]);
        const y = useMemo(() => yOffset !== undefined ? yOffset : -Math.random() * 60 - 60, [yOffset]);
        const [showCollectFX, setShowCollectFX] = useState(false);

        // Trigger collect animation when collected becomes true
        useEffect(() => {
            if (collected && !showCollectFX) {
                setShowCollectFX(true);
            }
        }, [collected]);

        // Show collect animation briefly, then disappear
        if (showCollectFX) {
            return (
                <div style={{
                    position: 'absolute',
                    left: x,
                    top: y,
                    animation: 'moveDown 8s linear forwards',
                    animationPlayState: isMoving ? 'running' : 'paused',
                    zIndex: 25,
                    pointerEvents: 'none',
                }}>
                    <div className='collect-fx'>
                        <span className='collect-points' style={isRare ? { color: '#ef4444', textShadow: '0 0 10px #ef4444, 0 0 20px #dc2626' } : undefined}>
                            {isRare ? '+50' : '+10'}
                        </span>
                        <span className='collect-burst'>✨</span>
                    </div>
                </div>
            );
        }

        if (collected) return null;

        return (
            <div
                ref={ref}
                style={{
                    position: 'absolute',
                    left: x,
                    top: y,
                    animation: 'moveDown 8s linear forwards',
                    animationPlayState: isMoving ? 'running' : 'paused',
                    zIndex: isRare ? 18 : 15,
                    willChange: 'transform',
                    contain: 'layout style paint' as any,
                }}
            >
                <div style={{
                    fontSize: isRare ? '4rem' : '3.5rem',
                    animation: isRare ? 'spin 0.8s linear infinite' : 'spin 1.5s linear infinite',
                    userSelect: 'none',
                    backfaceVisibility: 'hidden',
                }}>
                    {isRare ? '🌟' : '⭐'}
                </div>
                {isRare && (
                    <div style={{
                        position: 'absolute',
                        bottom: -8,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '0.6rem',
                        fontWeight: 900,
                        color: '#ef4444',
                        textShadow: '0 0 6px #ef4444',
                        whiteSpace: 'nowrap',
                    }}>
                        +50
                    </div>
                )}
            </div>
        )
    }
));

RewardComponent.displayName = 'RewardComponent';

export default RewardComponent
