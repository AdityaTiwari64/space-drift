import React, { useMemo, forwardRef } from 'react'

type Props = {
    isMoving?: boolean,
    speed?: number
}

const BoulderComponent = React.memo(forwardRef<HTMLDivElement, Props>(
    ({ isMoving, speed = 10 }, ref) => {
        // Compute random positions synchronously — no mount→setState→re-render cycle
        const { x, y, rot } = useMemo(() => ({
            x: Math.random() * (window.innerWidth - 80),
            y: -Math.random() * 100 - 100,
            rot: Math.random() * 360,
        }), []);

        return (
            <div ref={ref} className='boulder-shadow' style={{
                position: 'absolute',
                left: x,
                top: y,
                animation: `moveDown ${speed}s linear forwards`,
                animationPlayState: isMoving ? 'running' : 'paused',
            }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src='/met.png' width={80} height={80} alt='' style={{
                    rotate: `${rot}deg`,
                    backfaceVisibility: 'hidden',
                }} />
            </div>
        )
    }
));

BoulderComponent.displayName = 'BoulderComponent';

export default BoulderComponent