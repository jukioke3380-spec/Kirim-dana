import { useEffect, useState } from 'react';

export function useSharedReceipt(onImageReceived: (blob: Blob, fileName: string) => void) {
  const [isCheckingShared, setIsCheckingShared] = useState(false);

  useEffect(() => {
    async function checkSharedCache() {
      if (typeof window === 'undefined' || !('caches' in window)) return;

      try {
        setIsCheckingShared(true);
        const cache = await caches.open('kirim-dana-shared');
        const response = await cache.match('latest-shared-receipt');

        if (response) {
          const blob = await response.blob();
          const fileName = response.headers.get('X-File-Name')
            ? decodeURIComponent(response.headers.get('X-File-Name')!)
            : 'bukti-transfer-shared.jpg';

          // Clear cache so it won't re-trigger on next refresh
          await cache.delete('latest-shared-receipt');

          // Clean up URL query if present (?shared=1)
          if (window.location.search.includes('shared=')) {
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
          }

          onImageReceived(blob, fileName);
        }
      } catch (err) {
        console.error('Error checking shared cache:', err);
      } finally {
        setIsCheckingShared(false);
      }
    }

    // Check on initial mount
    checkSharedCache();

    // Also check on visibilitychange (when coming back from another app's share sheet)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkSharedCache();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [onImageReceived]);

  return { isCheckingShared };
}
