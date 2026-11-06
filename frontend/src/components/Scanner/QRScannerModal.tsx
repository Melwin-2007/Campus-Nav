import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, QrCode, Camera, AlertCircle, ArrowRight } from 'lucide-react';
import api from '../../services/api';
import { useNavigation } from '../../context/NavigationContext';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose }) => {
  const { setSelectedLocation, setFlyToTarget, startDirectionsFrom } = useNavigation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'qr-reader-container';

  // Extract identifier from scanned payload
  const parseScannedText = (text: string): string => {
    const trimmed = text.trim();
    try {
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        const url = new URL(trimmed);
        const locParam = url.searchParams.get('location_id') || url.searchParams.get('location');
        if (locParam) return locParam;

        const pathParts = url.pathname.split('/').filter(Boolean);
        if (pathParts.length >= 2 && (pathParts[0] === 'q' || pathParts[0] === 'qr')) {
          return pathParts[1];
        }
      }
    } catch {}
    return trimmed;
  };

  // Resolve QR code identifier with backend
  const handleResolveCode = useCallback(
    async (rawCode: string) => {
      const identifier = parseScannedText(rawCode);
      if (!identifier) return;

      setIsResolving(true);
      setErrorMessage(null);

      try {
        const qrResult = await api.qr.resolve(identifier);
        if (qrResult.location) {
          setSelectedLocation(qrResult.location);
          setFlyToTarget({
            lat: qrResult.location.latitude,
            lon: qrResult.location.longitude,
            zoom: 18,
          });
          startDirectionsFrom(qrResult.location);
          onClose();
        } else {
          setErrorMessage(`QR code recognized but no associated location data was found.`);
        }
      } catch (err: unknown) {
        // Fallback: If numeric, try looking up location directly
        const numId = parseInt(identifier, 10);
        if (!isNaN(numId) && numId > 0) {
          try {
            const loc = await api.locations.getById(numId);
            setSelectedLocation(loc);
            setFlyToTarget({ lat: loc.latitude, lon: loc.longitude, zoom: 18 });
            startDirectionsFrom(loc);
            onClose();
            return;
          } catch {}
        }

        setErrorMessage(
          'Invalid or unrecognized campus QR code. Please ensure code is valid or type location name into search.'
        );
      } finally {
        setIsResolving(false);
      }
    },
    [onClose, setSelectedLocation, setFlyToTarget, startDirectionsFrom]
  );

  // Start and teardown html5-qrcode camera scanner
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    const scanner = new Html5Qrcode(readerElementId);
    scannerRef.current = scanner;

    const startCamera = async () => {
      try {
        setErrorMessage(null);
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 240, height: 240 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (mounted) {
              handleResolveCode(decodedText);
            }
          },
          () => {
            // Frame error - ignored
          }
        );
        if (mounted) setIsScanning(true);
      } catch (err) {
        console.warn('Failed to start camera scanner:', err);
        if (mounted) {
          setErrorMessage('Camera access denied or unavailable. You can enter the code manually below.');
          setIsScanning(false);
        }
      }
    };

    // Delay start slightly to ensure DOM container is rendered
    const timeout = setTimeout(() => {
      startCamera();
    }, 150);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      if (scanner.isScanning) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch((e) => console.warn('Error during scanner cleanup:', e));
      } else {
        scanner.clear();
      }
    };
  }, [isOpen, handleResolveCode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-heading font-bold text-base">
            <QrCode size={20} className="text-brand-indigo dark:text-brand-teal" />
            <span>Scan Campus QR Code</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-colors"
            title="Close scanner"
          >
            <X size={18} />
          </button>
        </div>

        {/* Camera Viewfinder Container */}
        <div className="relative w-full aspect-square bg-black flex items-center justify-center overflow-hidden">
          <div id={readerElementId} className="w-full h-full" />

          {/* Viewfinder Reticle Overlay with Animated Scanning Laser */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-60 h-60 border-2 border-transparent">
                {/* 4 Corner Teal Brackets */}
                <span className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-brand-teal rounded-tl-md"></span>
                <span className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-brand-teal rounded-tr-md"></span>
                <span className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-brand-teal rounded-bl-md"></span>
                <span className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-brand-teal rounded-br-md"></span>

                {/* Animated Horizontal Laser Scan Line */}
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-brand-teal to-transparent shadow-[0_0_8px_#14B8A6] scanner-laser" />
              </div>
            </div>
          )}

          {/* Fallback Camera Placeholder if permission denied */}
          {!isScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-950">
              <Camera size={44} className="mb-2 text-slate-600" />
              <p className="text-sm">Camera scanning inactive</p>
            </div>
          )}
        </div>

        {/* Guidance and Error Text */}
        <div className="p-4 flex flex-col gap-3">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <p className="text-xs text-center text-slate-500 dark:text-slate-400">
            Position the QR code found on building signboards or entrance plaques inside the frame.
          </p>

          {/* Manual Code Input Option */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">
              Or Enter Location Code Manually
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualCode.trim()) handleResolveCode(manualCode);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g. LOC-0001 or ID"
                className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-indigo"
              />
              <button
                type="submit"
                disabled={!manualCode.trim() || isResolving}
                className="touch-target px-4 py-2 rounded-xl bg-brand-indigo hover:bg-brand-indigo-hover text-white text-xs font-semibold flex items-center gap-1 shadow-md disabled:opacity-50 transition-all active:scale-95"
              >
                <span>{isResolving ? 'Resolving...' : 'Lookup'}</span>
                <ArrowRight size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScannerModal;
