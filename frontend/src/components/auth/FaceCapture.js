import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

const MODELS_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights';

export default function FaceCapture({ onCapture, label = 'Capture Face', instructionText = 'Position your face in the frame and click capture.' }) {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [loaded, setLoaded] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [status, setStatus] = useState('Loading face models…');
  const [captured, setCaptured] = useState(false);
  const streamRef = useRef();
  const detectRef = useRef();

  useEffect(() => {
    const loadModels = async () => {
      try {
        setStatus('Loading face models…');
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL);
        setLoaded(true);
        setStatus('Models loaded. Starting camera…');
        await startCamera();
      } catch (e) {
        console.error('Model load error:', e);
        setStatus('Failed to load models: ' + e.message);
      }
    };
    loadModels();
    return () => { stopCamera(); clearInterval(detectRef.current); };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => { videoRef.current.play(); resolve(); };
        });
        setStatus('Camera ready. ' + instructionText);
        startDetection();
      }
    } catch (e) {
      setStatus('Camera access denied or not found: ' + e.message);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  const startDetection = () => {
    detectRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || !videoRef.current.videoWidth) return;
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();
      const dims = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
      faceapi.matchDimensions(canvasRef.current, dims);
      const resized = faceapi.resizeResults(detections, dims);
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, dims.width, dims.height);
      faceapi.draw.drawDetections(canvasRef.current, resized);
      faceapi.draw.drawFaceLandmarks(canvasRef.current, resized);
      if (detections.length === 1) { setStatus('Face detected ✓ — click capture when ready'); setDetecting(true); }
      else if (detections.length === 0) { setStatus('No face detected. Move closer.'); setDetecting(false); }
      else { setStatus('Multiple faces detected. One person only.'); setDetecting(false); }
    }, 300);
  };

  const handleCapture = async () => {
    if (!detecting || !videoRef.current) return;
    setStatus('Processing…');
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (!detection) { setStatus('No face found. Try again.'); return; }
      const descriptor = Array.from(detection.descriptor);
      setCaptured(true);
      setStatus('Face captured successfully ✓');
      stopCamera();
      clearInterval(detectRef.current);
      onCapture(descriptor);
    } catch (e) {
      setStatus('Capture failed: ' + e.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 480, background: '#0a0a10', borderRadius: 6, overflow: 'hidden', aspectRatio: '4/3' }}>
        <video ref={videoRef} muted playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: captured ? 'none' : 'block', transform: 'scaleX(-1)' }} />
        <canvas ref={canvasRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: 'scaleX(-1)', display: captured ? 'none' : 'block' }} />
        {captured && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#2d9e5f', fontSize: '3rem' }}>✓</div>
        )}
        {!captured && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -60%)', width: 160, height: 200, border: `2px solid ${detecting ? '#2d9e5f' : '#555'}`, borderRadius: '50%', pointerEvents: 'none', transition: 'border-color 0.3s' }} />
        )}
      </div>
      <p style={{ fontSize: '0.78rem', color: detecting ? 'var(--success)' : 'var(--muted)', fontFamily: 'DM Mono, monospace' }}>{status}</p>
      {!captured && (
        <button className="btn-primary" onClick={handleCapture} disabled={!detecting}>{label}</button>
      )}
    </div>
  );
}