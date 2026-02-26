import { FilesetResolver, HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision';
import React, { useEffect, useRef } from 'react'

type Props = {
    setHandResults: (result: any) => void
}

let detectionRafId: any;
const DETECTION_INTERVAL = 33; // ~30fps — fast enough for smooth, responsive movement

const HandRecognizer = ({ setHandResults }: Props) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        initVideoAndModel();

        return () => {
            cancelAnimationFrame(detectionRafId);
        }
    }, [])

    const initVideoAndModel = async () => {
        setHandResults({ isLoading: true })

        const videoElement = videoRef.current;
        if (!videoElement) {
            return;
        }

        await initVideo(videoElement);

        const handLandmarker = await initModel();

        let lastDetection = 0;
        const detectLoop = (timestamp: number) => {
            if (timestamp - lastDetection >= DETECTION_INTERVAL) {
                lastDetection = timestamp;
                try {
                    const detections = handLandmarker.detectForVideo(videoElement, Date.now());
                    processDetections(detections, setHandResults);
                } catch (e) {
                    // skip frame on detection error
                }
            }
            detectionRafId = requestAnimationFrame(detectLoop);
        };
        detectionRafId = requestAnimationFrame(detectLoop);

        setHandResults({ isLoading: false });
    }
    return (
        <div>
            <video className='-scale-x-1 border-2 border-stone-800 rounded-lg' ref={videoRef}></video>
        </div>
    )
}

export default HandRecognizer

async function initVideo(videoElement: HTMLVideoElement) {
    // Lower resolution = faster MediaPipe processing = more responsive
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 240, height: 180, frameRate: 30 }
    });
    videoElement.srcObject = stream;
    videoElement.addEventListener("loadeddata", () => {
        videoElement.play();
    });
}
async function initModel() {
    const wasm = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
    const handLandmarker = HandLandmarker.createFromOptions(wasm, {
        baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: 'GPU'
        },
        numHands: 2,
        runningMode: 'VIDEO'
    });
    return handLandmarker
}

function processDetections(detections: HandLandmarkerResult, setHandResults: (result: any) => void) {
    if (detections && detections.handedness.length > 1) {
        const rightIndex = detections.handedness[0][0].categoryName === 'Right' ? 0 : 1;
        const leftIndex = rightIndex === 0 ? 1 : 0;

        const { x: leftX, y: leftY, z: leftZ } = detections.landmarks[leftIndex][6];
        const { x: rightX, y: rightY, z: rightZ } = detections.landmarks[rightIndex][6];

        const tilt = (rightY - leftY) / (rightX - leftX);
        const degrees = (Math.atan(tilt) * 180) / Math.PI;

        setHandResults({
            isDetected: true,
            tilt,
            degrees
        })
    } else {
        setHandResults({
            isDetected: false,
            tilt: 0,
            degrees: 0
        })
    }
}
