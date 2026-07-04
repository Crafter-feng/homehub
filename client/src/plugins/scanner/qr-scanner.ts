import type { ScannerAdapterExports, ScanResult } from '../types/client-plugin.types';
import jsQR from 'jsqr';

/**
 * QR Scanner Frontend Adapter — jsQR + browser camera.
 *
 * Uses the jsQR library to decode QR codes from device camera.
 * Requires navigator.mediaDevices support (most modern browsers).
 */

/** Check if camera scanning is supported */
function checkQrSupport(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;
}

/**
 * Perform a QR code scan using the device camera and jsQR.
 *
 * Opens a fullscreen overlay with camera feed, continuously
 * reads frames until a QR code is detected, then cleans up.
 */
async function performQrScan(): Promise<ScanResult> {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'width:100vw', 'height:100vh',
    'z-index:10000', 'background:rgba(0,0,0,0.85)',
    'display:flex', 'flex-direction:column', 'align-items:center', 'justify-content:center',
  ].join(';');

  // Video element (hidden, used for frame capture)
  const video = document.createElement('video');
  video.setAttribute('playsinline', '');
  video.style.cssText = 'width:100%;max-width:480px;border-radius:12px;';

  // Canvas for frame extraction
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  // Scan area indicator (overlay guide)
  const guide = document.createElement('div');
  guide.style.cssText = [
    'position:absolute', 'width:240px', 'height:240px', 'border:3px solid #6366f1',
    'border-radius:16px', 'box-shadow:0 0 0 9999px rgba(0,0,0,0.5)',
    'pointer-events:none',
  ].join(';');

  const videoWrapper = document.createElement('div');
  videoWrapper.style.cssText = 'position:relative;display:flex;align-items:center;justify-content:center;';
  videoWrapper.appendChild(video);
  videoWrapper.appendChild(guide);
  overlay.appendChild(videoWrapper);

  // Status text
  const statusText = document.createElement('div');
  statusText.style.cssText = 'color:#fff;font-size:16px;margin-top:16px;';
  statusText.textContent = '将 QR 码对准取景框';
  overlay.appendChild(statusText);

  // Cancel button
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '取消';
  cancelBtn.style.cssText = [
    'margin-top:20px', 'padding:10px 28px', 'background:#ef4444', 'color:#fff',
    'border:none', 'border-radius:8px', 'font-size:15px', 'cursor:pointer',
  ].join(';');
  overlay.appendChild(cancelBtn);

  document.body.appendChild(overlay);

  return new Promise<ScanResult>((resolve, reject) => {
    let settled = false;
    let stream: MediaStream | null = null;
    let animFrameId: number | null = null;

    const cleanup = () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (video.srcObject) video.srcObject = null;
      if (overlay.parentNode) document.body.removeChild(overlay);
    };

    cancelBtn.addEventListener('click', () => {
      if (!settled) { settled = true; cleanup(); reject(new Error('用户取消扫描')); }
    });

    // Start camera
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
    }).then((mediaStream) => {
      stream = mediaStream;
      video.srcObject = mediaStream;
      video.play();

      // Frame loop
      const frameLoop = () => {
        if (settled) return;

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data.length > 0) {
            settled = true;
            cleanup();
            resolve({
              type: 'qr',
              raw: code.data,
              timestamp: Date.now(),
              metadata: {
                location: code.location ? {
                  topLeft: code.location.topLeftCorner,
                  topRight: code.location.topRightCorner,
                  bottomLeft: code.location.bottomLeftCorner,
                  bottomRight: code.location.bottomRightCorner,
                } : undefined,
              },
            });
            return;
          }
        }

        animFrameId = requestAnimationFrame(frameLoop);
      };

      video.onloadedmetadata = () => {
        video.play();
        frameLoop();
      };
    }).catch((err) => {
      if (!settled) { settled = true; cleanup(); reject(new Error(`摄像头启动失败: ${err.message}`)); }
    });
  });
}

/** QR Scanner Adapter exports */
export const qrScannerAdapter: ScannerAdapterExports = {
  type: 'qr',
  name: 'QR 码扫描器',
  get isSupported() { return checkQrSupport(); },

  async scan(): Promise<ScanResult> {
    if (!this.isSupported) {
      throw new Error('您的设备不支持摄像头扫描');
    }
    return performQrScan();
  },
};