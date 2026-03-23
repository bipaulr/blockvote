import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import axios from 'axios';

const MODELS_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights';

export default function FaceAuth({ voterId, onSuccess, onFail }) {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [status, setStatus] = useState('Loading face models…');
  const [scanning, setScanning] = useState(false);
  const streamRef = useRef();
  const detectRef = useRef();
  const attemptRef = useRef(0);

  useEffect(() => {
    const init = async () => {
      try {
        setStatus('Loading face models…');
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL);
        await startCamera();
      } catch(e) {
        console.error('Model load error:', e);
        setStatus('Failed to load models: ' + e.message);
      }
    };
    init();
    return () => { stopCamera(); clearInterval(detectRef.current); };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await new Promise((resolve) => {
        videoRef.current.onloadedmetadata = () => { videoRef.current.play(); resolve(); };
      });
      setStatus('Look at the camera…');
      setScanning(true);
      autoVerify();
    } catch(e) {
      setStatus('Camera access denied: ' + e.message);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    clearInterval(detectRef.current);
  };

  const autoVerify = () => {
    detectRef.current = setInterval(async () => {
      if (!videoRef.current || !videoRef.current.videoWidth || attemptRef.current > 5) {
        clearInterval(detectRef.current);
        setStatus('Could not verify face. Try password login.');
        onFail?.();
        return;
      }
      attemptRef.current++;
      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (!detection) {
          setStatus(`Scanning… (${attemptRef.current}/5) — face not detected`);
          return;
        }
        setStatus('Face detected — verifying…');
        const descriptor = Array.from(detection.descriptor);
        const { data } = await axios.post('/auth/face/authenticate', { voter_id: voterId, descriptor });
        clearInterval(detectRef.current);
        stopCamera();
        setStatus(`Verified ✓ Welcome, ${data.name}`);
        setScanning(false);
        setTimeout(() => onSuccess(data), 800);
      } catch (e) {
        if (e.response?.status === 401) {
          clearInterval(detectRef.current);
          stopCamera();
          setStatus('Face not recognised. Use password instead.');
          setScanning(false);
          onFail?.();
        }
      }
    }, 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 480, background: '#0a0a10', borderRadius: 6, overflow: 'hidden', aspectRatio: '4/3' }}>
        <video ref={videoRef} muted playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
        <canvas ref={canvasRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: 'scaleX(-1)' }} />
        {scanning && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -60%)', width: 160, height: 200, border: '2px solid #4361ee', borderRadius: '50%', pointerEvents: 'none', animation: 'pulse-border 1.5s ease-in-out infinite' }} />
        )}
      </div>
      <p style={{ fontSize: '0.78rem', fontFamily: 'DM Mono, monospace', color: status.includes('✓') ? 'var(--success)' : 'var(--muted)' }}>{status}</p>
      <style>{`@keyframes pulse-border { 0%,100% { opacity:1; } 50% { opacity:0.3; } }`}</style>
    </div>
  );
}