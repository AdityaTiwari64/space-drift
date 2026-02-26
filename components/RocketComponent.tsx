import { RocketIcon } from 'lucide-react'
import React from 'react'

type Props = {
    degrees: number
}

const RocketComponent = React.memo(({ degrees }: Props) => {
    return (
        <div className='rocket-shadow'>
            <RocketIcon size={32} className='fill-red-600' style={{
                transform: `rotate(${-45 - degrees / 3}deg)`,
            }} />
        </div>
    )
});

RocketComponent.displayName = 'RocketComponent';

export default RocketComponent