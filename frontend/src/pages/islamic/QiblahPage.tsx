import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Compass as CompassIcon, MapPin } from 'lucide-react';
import { fetchQiblah } from '@/lib/islamicApi';
import type { QiblahResult } from '@/types/islamic';

interface OrientationEventWithWebkit extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

export default function QiblahPage() {
  const [result, setResult] = useState<QiblahResult | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsPermission, setNeedsPermission] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Your browser does not support location access.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchQiblah(position.coords.latitude, position.coords.longitude)
          .then(setResult)
          .catch(() => setError('Could not calculate the Qiblah direction.'));
      },
      () => setError('Location access is needed to find the Qiblah direction.')
    );

    const requestPermissionFn = (
      DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      }
    ).requestPermission;

    if (typeof requestPermissionFn === 'function') {
      setNeedsPermission(true);
    } else {
      window.addEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
      window.addEventListener('deviceorientation', handleOrientation as EventListener, true);
    }

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
      window.removeEventListener('deviceorientation', handleOrientation as EventListener, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleOrientation(event: OrientationEventWithWebkit) {
    const compassHeading = event.webkitCompassHeading ?? (event.alpha !== null ? 360 - event.alpha : null);
    if (compassHeading !== null) setHeading(compassHeading);
  }

  const requestIOSPermission = async () => {
    const requestPermissionFn = (
      DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      }
    ).requestPermission;

    if (requestPermissionFn) {
      const permission = await requestPermissionFn();
      if (permission === 'granted') {
        window.addEventListener('deviceorientation', handleOrientation as EventListener, true);
        setNeedsPermission(false);
      }
    }
  };

  const needleRotation = result ? (heading !== null ? result.bearing - heading : result.bearing) : 0;

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/" className="rounded-full p-1.5 text-gray-500 hover:bg-primary-50 dark:hover:bg-primary-900/30">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-50">Qiblah Direction</h1>
      </div>

      {error && (
        <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
          <MapPin className="h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
        </div>
      )}

      {!error && !result && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {!error && result && (
        <div className="card flex flex-col items-center gap-6 px-6 py-8">
          {needsPermission && heading === null && (
            <button onClick={requestIOSPermission} className="btn-primary">
              Enable compass
            </button>
          )}

          <div className="relative flex h-64 w-64 items-center justify-center rounded-full border-4 border-primary-100 dark:border-primary-900/40">
            <div className="absolute inset-2 rounded-full border border-dashed border-gray-200 dark:border-gray-700" />
            <span className="absolute top-2 text-xs font-semibold text-gray-400">N</span>
            <div
              className="absolute flex h-full w-full items-center justify-center transition-transform duration-200"
              style={{ transform: `rotate(${needleRotation}deg)` }}
            >
              <div className="flex flex-col items-center">
                <CompassIcon className="h-10 w-10 text-primary" />
                <span className="text-2xl">🕋</span>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{result.bearing.toFixed(0)}°</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {result.distance_km.toLocaleString()} km to the Kaaba
            </p>
            {heading === null && (
              <p className="mt-2 text-xs text-gray-400">
                Turn on your device compass for a live-rotating needle, or use the bearing above with any compass app.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
