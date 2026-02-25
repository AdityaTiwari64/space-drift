import React, { useEffect, useRef, useState, forwardRef } from 'react'

type Props = {
    isMoving?: boolean,
    speed?: number
}

const BoulderComponent = React.memo(forwardRef<HTMLDivElement, Props>(
    ({ isMoving, speed = 10 }, ref) => {
        const xRef = useRef(0);
        const yRef = useRef(0);
        const rotRef = useRef(0);
        const [ready, setReady] = useState(false);

        useEffect(() => {
            xRef.current = Math.random() * (window.innerWidth - 80);
            yRef.current = -Math.random() * 100 - 100;
            rotRef.current = Math.random() * 360;
            setReady(true);
        }, []);

        if (!ready) return null;

        return (
            <div ref={ref} className='boulder-shadow' style={{
                position: 'absolute',
                left: xRef.current,
                top: yRef.current,
                animation: `moveDown ${speed}s linear forwards`,
                animationPlayState: isMoving ? 'running' : 'paused',
            }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src='/met.png' width={80} height={80} alt='' style={{
                    rotate: `${rotRef.current}deg`
                }} />
            </div>
        )
    }
));

BoulderComponent.displayName = 'BoulderComponent';

export default BoulderComponent