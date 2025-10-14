import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { BOOTH_IDS, PRIZE_THRESHOLD } from '../constants';
import * as dataService from '../services/dataService';
import FeedbackModal from './FeedbackModal';
import Spinner from './Spinner';

interface ScannerProps { user: User; }

declare const jsQR: any;
declare const QRCode: any;

const Scanner: React.FC<ScannerProps> = ({ user }) => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [mode, setMode] = useState<'scan'|'display'>('scan');
  const [scannedBoothId, setScannedBoothId] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(true);
  const [isInvalidScan, setIsInvalidScan] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const animationFrameId = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isProcessingCode = useRef(false);

  // Guards to prevent concurrent starts / StrictMode double-run races
  const isStarting = useRef(false);
  const started = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);

  const stopScan = useCallback(() => {
    // Cancel animation
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    // Stop tracks
    if (streamRef.current) {
      try { streamRef.current.getTracks().forEach(t => t.stop()); } catch { /* ignore */ }
      streamRef.current = null;
    }
    // Clear video
    if (videoRef.current) {
      try { videoRef.current.pause(); } catch {}
      try { (videoRef.current as any).srcObject = null; } catch {}
    }
    isStarting.current = false;
    started.current = false;
  }, []);

  const showFeedbackMessage = (message: string, duration = 2500) => {
    if (!isMounted.current) return;
    setScanFeedback(message);
    setIsInvalidScan(true);
    isProcessingCode.current = true;
    setTimeout(() => {
      if (!isMounted.current) return;
      setIsInvalidScan(false);
      setScanFeedback(null);
      isProcessingCode.current = false;
    }, duration);
  };

  // helper: play() with one retry for AbortError
  const tryPlay = async (videoEl: HTMLVideoElement) => {
    try {
      await videoEl.play();
      return;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // brief delay and retry once
        await new Promise((r) => setTimeout(r, 120));
        await videoEl.play();
        return;
      }
      throw err;
    }
  };

  useEffect(() => {
    const tick = () => {
      if (isProcessingCode.current) {
        animationFrameId.current = requestAnimationFrame(tick);
        return;
      }
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        animationFrameId.current = requestAnimationFrame(tick);
        return;
      }

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.height = video.videoHeight || 480;
          canvas.width = video.videoWidth || 640;
          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
            if (code && code.data) {
              const scannedData = String(code.data).trim().toUpperCase();
              let parsedBoothId: string | null = null;
              for (const id of BOOTH_IDS) {
                if (scannedData.includes(id)) { parsedBoothId = id; break; }
              }
              if (parsedBoothId) {
                isProcessingCode.current = true;
                stopScan();
                setScannedBoothId(parsedBoothId);
                return;
              }
              // Not a booth — attempt to show better feedback (passport vs other)
              let invalid = 'Invalid QR Code';
              try {
                const parsed = JSON.parse(code.data);
                if (parsed?.type === 'SCG_PASSPORT_USER') {
                  invalid = parsed.name === user.name
                    ? "This is your own passport. Scan a booth's QR code."
                    : "This is another attendee's QR code. Scan a booth's QR code.";
                }
              } catch { /* not JSON */ }
              showFeedbackMessage(invalid, 2500);
            }
          } catch (e) {
            // getImageData may throw in some edge cases — ignore and continue
          }
        }
      }
      animationFrameId.current = requestAnimationFrame(tick);
    };

    const startScan = async () => {
      if (isStarting.current || started.current) return;
      isStarting.current = true;
      setIsCameraLoading(true);
      setCameraError(null);
      isProcessingCode.current = false;

      try {
        // Stop any previous stream first
        stopScan();

        // Request camera (use ideal environment so desktop still works)
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
        if (!isMounted.current) {
          // If unmounted while awaiting permission
          try { stream.getTracks().forEach(t => t.stop()); } catch {}
          isStarting.current = false;
          setIsCameraLoading(false);
          return;
        }

        streamRef.current = stream;

        const video = videoRef.current!;
        if (!video) throw new Error('Missing video element');

        video.muted = true;
        video.setAttribute('playsinline', 'true');

        // set srcObject then wait for loadedmetadata
        try {
          video.srcObject = stream;
        } catch {
          (video as any).srcObject = stream;
        }

        await new Promise<void>((resolve) => {
          const handler = () => {
            video.removeEventListener('loadedmetadata', handler);
            resolve();
          };
          video.addEventListener('loadedmetadata', handler);
          // if already have metadata
          if (video.readyState >= 1) {
            video.removeEventListener('loadedmetadata', handler);
            resolve();
          }
        });

        // Attempt to play (with a retry)
        await tryPlay(video);

        // Kick off scanning loop
        animationFrameId.current = requestAnimationFrame(tick);
        started.current = true;
      } catch (err: any) {
        console.error('Camera Error:', err);
        if (!isMounted.current) return;
        if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
          setCameraError('Camera access was denied. Please allow camera access in browser settings and refresh.');
        } else if (err?.name === 'NotFoundError') {
          setCameraError('No camera found on this device.');
        } else {
          setCameraError('Could not access camera. Try refreshing or another browser/profile.');
        }
      } finally {
        if (isMounted.current) setIsCameraLoading(false);
        isStarting.current = false;
      }
    };

    if (mode === 'scan' && !scannedBoothId) {
      startScan();
    } else {
      stopScan();
    }

    return () => { stopScan(); };
  }, [mode, scannedBoothId, stopScan, user]);

  // QR generation for display mode
  useEffect(() => {
    if (mode === 'display' && qrCanvasRef.current) {
      const payload = JSON.stringify({ name: user.name, division: user.division, type: 'SCG_PASSPORT_USER' });
      QRCode.toCanvas(qrCanvasRef.current, payload, { width: 256, margin: 2, color: { dark: '#e5e7eb', light: '#00000000' } }, (err: Error | null) => {
        if (err) {
          console.error('QR generation error:', err);
          setScanFeedback('Failed to generate QR code.');
        }
      });
    }
  }, [mode, user]);

  const handleFeedbackSubmit = async (rating: number, feedback: string) => {
    if (!scannedBoothId) return;
    try {
      const updated = await dataService.addVisit(scannedBoothId, rating, feedback);
      const prizeWon = updated.prizeWon || (updated.visitedCount >= PRIZE_THRESHOLD);
      navigate('/', { state: { prizeWon } });
    } catch (err) {
      console.error('Error submitting feedback:', err);
      showFeedbackMessage('Failed to save visit. Try again.', 3000);
    }
  };

  const handleModalClose = () => setScannedBoothId(null);

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex flex-col items-center justify-center z-50 p-4">
      <div className="relative w-full max-w-lg bg-gray-800 rounded-2xl shadow-2xl p-6 border border-gray-700">
        <h2 className="text-2xl font-bold text-center text-purple-400 mb-4">
          {mode === 'scan' ? 'Visit Booth' : 'My Passport QR'}
        </h2>

        <div className="flex justify-center mb-4 rounded-lg bg-gray-900 p-1">
          <button onClick={() => setMode('scan')} className={`w-1/2 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'scan' ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700'}`}>Scan Booth QR</button>
          <button onClick={() => setMode('display')} className={`w-1/2 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'display' ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700'}`}>Show My QR</button>
        </div>

        <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-900 flex items-center justify-center">
          {mode === 'scan' ? (
            <>
              {isCameraLoading && <Spinner />}
              {cameraError && !isCameraLoading && <p className="text-red-400 text-center p-4">{cameraError}</p>}
              <video ref={videoRef} className={`w-full h-full object-cover ${isCameraLoading || cameraError ? 'hidden' : ''}`} muted playsInline autoPlay />
              <canvas ref={canvasRef} className="hidden" />
              <div className={`absolute inset-0 ${isInvalidScan ? 'animate-shake' : ''}`}>
                <div className={`absolute inset-0 border-8 rounded-lg pointer-events-none transition-colors duration-200 ${isInvalidScan ? 'border-red-500' : 'border-white/20'}`} />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-4 bg-gray-700/50 rounded-lg w-full h-full">
              <canvas ref={qrCanvasRef}></canvas>
              <p className="mt-4 text-gray-300 text-center text-sm max-w-xs">Show this code to an exhibitor to register your booth visit.</p>
            </div>
          )}
        </div>

        <div className="h-10 mt-2 text-center flex items-center justify-center">
          {mode === 'scan' && scanFeedback && <p className="text-red-400 text-sm font-medium">{scanFeedback}</p>}
        </div>

        <button onClick={() => { stopScan(); navigate('/'); }} className="mt-2 w-full flex justify-center py-3 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600">
          {mode === 'scan' ? 'Cancel' : 'Close'}
        </button>

        {scannedBoothId && <FeedbackModal boothId={scannedBoothId} onSubmit={handleFeedbackSubmit} onClose={handleModalClose} />}
      </div>
    </div>
  );
};

export default Scanner;