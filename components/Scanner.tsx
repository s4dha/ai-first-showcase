import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { BOOTH_IDS, PRIZE_THRESHOLD } from '../constants';
import * as dataService from '../services/dataService';
import FeedbackModal from './FeedbackModal';
import Spinner from './Spinner';

interface ScannerProps {
  user: User;
}

declare const jsQR: any;
declare const QRCode: any;

const Scanner: React.FC<ScannerProps> = ({ user }) => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const [mode, setMode] = useState<'scan' | 'display'>('scan');
  const [scannedBoothId, setScannedBoothId] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(true);
  const [isInvalidScan, setIsInvalidScan] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const animationFrameId = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isProcessingCode = useRef(false);

  const stopScan = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);
  
  const showFeedbackMessage = (message: string, duration: number) => {
    setScanFeedback(message);
    setIsInvalidScan(true);
    isProcessingCode.current = true;
    setTimeout(() => {
      setIsInvalidScan(false);
      setScanFeedback(null);
      isProcessingCode.current = false;
    }, duration);
  };

  useEffect(() => {
    const tick = () => {
        if (isProcessingCode.current) {
            animationFrameId.current = requestAnimationFrame(tick);
            return;
        }

      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        if (canvasRef.current) {
          const canvas = canvasRef.current.getContext('2d');
          if (canvas) {
            canvasRef.current.height = videoRef.current.videoHeight;
            canvasRef.current.width = videoRef.current.videoWidth;
            canvas.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
            const imageData = canvas.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });
            
            if (code && code.data) {
                const scannedData = code.data.trim().toUpperCase();
                let parsedBoothId: string | null = null;
                
                // More robust check: find any valid booth ID within the scanned data
                for (const boothId of BOOTH_IDS) {
                    if (scannedData.includes(boothId)) {
                        parsedBoothId = boothId;
                        break; // Found a match, exit the loop
                    }
                }

                if (parsedBoothId) {
                  isProcessingCode.current = true; // Prevent re-scanning while modal opens
                  stopScan();
                  setScannedBoothId(parsedBoothId);
                  return; // Exit tick loop
                }

                // If not a valid booth, provide specific feedback
                let invalidMessage = 'Invalid QR Code';
                try {
                  // Check if it's a user passport QR code
                  const qrData = JSON.parse(code.data); // use original code.data before uppercasing
                  if (qrData.type === 'SCG_PASSPORT_USER') {
                      if (qrData.name === user.name) {
                          invalidMessage = "This is your own passport. Scan a booth's QR code.";
                      } else {
                          invalidMessage = "This is another attendee's QR code. Scan a booth's QR code.";
                      }
                  }
                } catch (e) {
                    // Not a JSON QR code, so it's just an invalid code. The default message is fine.
                }
                showFeedbackMessage(invalidMessage, 2500);
            }
          }
        }
      }
      animationFrameId.current = requestAnimationFrame(tick);
    };

    const startScan = async () => {
        setIsCameraLoading(true);
        setCameraError(null);
        isProcessingCode.current = false;
        try {
          streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          if (videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS
            await videoRef.current.play();
            animationFrameId.current = requestAnimationFrame(tick);
          }
        } catch (err) {
          console.error("Camera Error:", err);
          setCameraError('Could not access camera. Please grant permission and try again.');
        } finally {
            setIsCameraLoading(false);
        }
    };

    if (mode === 'scan' && !scannedBoothId) {
        startScan();
    } else {
        stopScan();
    }

    return () => {
      stopScan();
    };
  }, [mode, scannedBoothId, stopScan, user]);

  useEffect(() => {
    if (mode === 'display' && qrCanvasRef.current) {
      const userDataString = JSON.stringify({ name: user.name, division: user.division, type: 'SCG_PASSPORT_USER' });
      QRCode.toCanvas(
        qrCanvasRef.current,
        userDataString,
        {
          width: 256,
          margin: 2,
          color: {
            dark: '#e5e7eb', // gray-200
            light: '#00000000' // transparent
          }
        }, (error: Error | null) => {
        if (error) {
            console.error('QR Code generation error:', error);
            setScanFeedback('Failed to generate QR code.');
        }
      });
    }
  }, [mode, user]);

  const handleFeedbackSubmit = async (rating: number, feedback: string) => {
    if (scannedBoothId) {
      try {
        const allVisits = await dataService.getAllVisits();
        const userVisits = allVisits.filter(v => v.userName === user.name);
        const oldUniqueBooths = new Set(userVisits.map(v => v.boothId));

        await dataService.addVisit({
          boothId: scannedBoothId,
          rating,
          feedback,
        });

        const newUniqueBooths = new Set([...oldUniqueBooths, scannedBoothId]);
        const prizeWon = oldUniqueBooths.size < PRIZE_THRESHOLD && newUniqueBooths.size >= PRIZE_THRESHOLD;
        
        navigate('/', { state: { prizeWon } });
      } catch (error) {
        console.error("Error submitting feedback:", error);
      }
    }
  };

  const handleModalClose = () => {
      setScannedBoothId(null);
  }

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex flex-col items-center justify-center z-50 p-4">
      <div className="relative w-full max-w-lg bg-gray-800 rounded-2xl shadow-2xl p-6 border border-gray-700">
        <h2 className="text-2xl font-bold text-center text-purple-400 mb-4">
          {mode === 'scan' ? 'Visit Booth' : 'My Passport QR'}
        </h2>

        <div className="flex justify-center mb-4 rounded-lg bg-gray-900 p-1">
          <button
            onClick={() => setMode('scan')}
            className={`w-1/2 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'scan' ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700'}`}
            aria-pressed={mode === 'scan'}
          >
            Scan Booth QR
          </button>
          <button
            onClick={() => setMode('display')}
            className={`w-1/2 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'display' ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700'}`}
            aria-pressed={mode === 'display'}
          >
            Show My QR
          </button>
        </div>

        <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-900 flex items-center justify-center">
          {mode === 'scan' ? (
            <>
              {isCameraLoading && <Spinner />}
              {cameraError && !isCameraLoading && <p className="text-red-400 text-center p-4">{cameraError}</p>}
              <video ref={videoRef} className={`w-full h-full object-cover ${isCameraLoading || cameraError ? 'hidden' : ''}`} />
              <canvas ref={canvasRef} className="hidden" />

              <div className={`absolute inset-0 ${isInvalidScan ? 'animate-shake' : ''}`}>
                <div className={`absolute inset-0 border-8 rounded-lg pointer-events-none transition-colors duration-200 ${isInvalidScan ? 'border-red-500' : 'border-white/20'}`}></div>
                <div className={`absolute w-16 h-16 border-4 top-4 left-4 rounded-tl-lg rounded-br-lg animate-pulse transition-colors duration-200 ${isInvalidScan ? 'border-red-500' : 'border-purple-500'}`}></div>
                <div className={`absolute w-16 h-16 border-4 top-4 right-4 rounded-tr-lg rounded-bl-lg animate-pulse transition-colors duration-200 ${isInvalidScan ? 'border-red-500' : 'border-purple-500'}`}></div>
                <div className={`absolute w-16 h-16 border-4 bottom-4 left-4 rounded-bl-lg rounded-tr-lg animate-pulse transition-colors duration-200 ${isInvalidScan ? 'border-red-500' : 'border-purple-500'}`}></div>
                <div className={`absolute w-16 h-16 border-4 bottom-4 right-4 rounded-br-lg rounded-tl-lg animate-pulse transition-colors duration-200 ${isInvalidScan ? 'border-red-500' : 'border-purple-500'}`}></div>
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

        <button
          onClick={() => navigate('/')}
          className="mt-2 w-full flex justify-center py-3 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900 transition"
        >
          {mode === 'scan' ? 'Cancel' : 'Close'}
        </button>

        {scannedBoothId && (
          <FeedbackModal
            boothId={scannedBoothId}
            onSubmit={handleFeedbackSubmit}
            onClose={handleModalClose}
          />
        )}
      </div>
    </div>
  );
};

export default Scanner;