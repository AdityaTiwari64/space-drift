'use client'
import React, { useEffect, useState, forwardRef } from 'react'

type Props = {
    isMoving?: boolean,
    id: string,
    xOffset?: number,
    yOffset?: number,
    collected?: boolean,
}

const RewardComponent = React.memo(forwardRef<HTMLDivElement, Props>(
    ({ isMoving, id, xOffset, yOffset, collected }, ref) => {
        const [xState, setXState] = useState(0);
        const [yState, setYState] = useState(0);
        const [showCollectFX, setShowCollectFX] = useState(false);

        useEffect(() => {
            setXState(xOffset !== undefined ? xOffset : Math.random() * (window.innerWidth - 80));
            setYState(yOffset !== undefined ? yOffset : -Math.random() * 60 - 60);
        }, [xOffset, yOffset]);

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
                    left: xState,
                    top: yState,
                    animation: 'moveDown 8s linear forwards',
                    animationPlayState: isMoving ? 'running' : 'paused',
                    zIndex: 25,
                    pointerEvents: 'none',
                }}>
                    <div className='collect-fx'>
                        <span className='collect-points'>+10</span>
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
                    left: xState,
                    top: yState,
                    animation: 'moveDown 8s linear forwards',
                    animationPlayState: isMoving ? 'running' : 'paused',
                    zIndex: 15,
                    willChange: 'transform',
                }}
            >
                <div style={{
                    fontSize: '3.5rem',
                    animation: 'spin 1.5s linear infinite',
                    filter: 'drop-shadow(0 0 10px gold)',
                    userSelect: 'none',
                }}>
                    ⭐
                </div>
            </div>
        )
    }
));

RewardComponent.displayName = 'RewardComponent';

export default RewardComponent
