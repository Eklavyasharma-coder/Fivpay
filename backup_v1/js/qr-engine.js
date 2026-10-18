/* ==========================================================================
   FivPay - QR Code Generation & Scanner Engine
   Pure vanilla QR canvas rendering and interactive scanner simulation
   ========================================================================== */

class QREngine {
  constructor() {
    this.videoStream = null;
    this.isScanning = false;
  }

  /**
   * Deterministic mini QR matrix renderer for vanilla canvas
   * Generates standard QR finder patterns, timing patterns, and data bits
   */
  renderQR(canvas, text, options = {}) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = options.size || 220;
    const darkColor = options.darkColor || '#0f172a';
    const lightColor = options.lightColor || '#ffffff';

    canvas.width = size;
    canvas.height = size;

    // Grid size: 25x25 matrix (Version 2 standard)
    const N = 25;
    const matrix = Array.from({ length: N }, () => Array(N).fill(0));

    // 1. Finder pattern generator
    const setFinder = (startX, startY) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 || r === 6 || c === 0 || c === 6 ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            matrix[startY + r][startX + c] = 1;
          } else {
            matrix[startY + r][startX + c] = -1; // separator
          }
        }
      }
    };

    setFinder(0, 0);          // Top-Left
    setFinder(N - 7, 0);      // Top-Right
    setFinder(0, N - 7);      // Bottom-Left

    // Separator bars
    for (let i = 0; i < 8; i++) {
      if (matrix[7][i] === 0) matrix[7][i] = -1;
      if (matrix[i][7] === 0) matrix[i][7] = -1;
      if (matrix[7][N - 1 - i] === 0) matrix[7][N - 1 - i] = -1;
      if (matrix[i][N - 8] === 0) matrix[i][N - 8] = -1;
      if (matrix[N - 8][i] === 0) matrix[N - 8][i] = -1;
      if (matrix[N - 1 - i][7] === 0) matrix[N - 1 - i][7] = -1;
    }

    // 2. Timing patterns
    for (let i = 8; i < N - 8; i++) {
      matrix[6][i] = i % 2 === 0 ? 1 : -1;
      matrix[i][6] = i % 2 === 0 ? 1 : -1;
    }

    // 3. Alignment pattern (5x5 around (18, 18))
    const alignX = 18, alignY = 18;
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
          matrix[alignY + r][alignX + c] = 1;
        } else {
          matrix[alignY + r][alignX + c] = -1;
        }
      }
    }

    // 4. Fill payload deterministically based on input hash
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }

    let seed = Math.abs(hash);
    const pseudoRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (matrix[r][c] === 0) {
          matrix[r][c] = pseudoRandom() > 0.48 ? 1 : 0;
        }
      }
    }

    // Render Matrix to Canvas
    const cellSize = size / N;
    ctx.fillStyle = lightColor;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = darkColor;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (matrix[r][c] === 1) {
          // Add rounded pill aesthetics to QR blocks
          const x = c * cellSize;
          const y = r * cellSize;
          ctx.beginPath();
          ctx.roundRect(x + 0.5, y + 0.5, cellSize - 0.5, cellSize - 0.5, 1.5);
          ctx.fill();
        }
      }
    }
  }

  /**
   * Start Camera Scanner or Simulation
   */
  async startScanner(videoEl, onScanSuccess) {
    this.isScanning = true;
    let cameraStarted = false;

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        if (videoEl && this.isScanning) {
          videoEl.srcObject = stream;
          videoEl.play();
          this.videoStream = stream;
          cameraStarted = true;
        }
      } catch (err) {
        console.log('Camera access denied or unavailable, switching to visual simulation mode.');
      }
    }

    return cameraStarted;
  }

  /**
   * Stop scanner stream and cleanup
   */
  stopScanner(videoEl) {
    this.isScanning = false;
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }
    if (videoEl) {
      videoEl.srcObject = null;
    }
  }

  /**
   * Generates a sample scan payload for quick demo simulation
   */
  getRandomDemoPayload() {
    const demos = [
      {
        to: 'Elena Rostova',
        email: 'elena.r@finmail.com',
        amount: 85.00,
        note: 'Team Dinner split 🍕',
        category: 'Dining'
      },
      {
        to: 'Metro Express Transit',
        email: 'transit.ticket@citymetro.gov',
        amount: 14.50,
        note: 'Weekly Commuter Pass',
        category: 'Travel'
      },
      {
        to: 'Blue Bottle Artisan Coffee',
        email: 'pos.terminal@bluebottle.com',
        amount: 6.25,
        note: 'Oat Latte & Croissant ☕',
        category: 'Dining'
      },
      {
        to: 'David Chen',
        email: 'chen.d@singaporesinglet.sg',
        amount: 240.00,
        note: 'Co-working office space share',
        category: 'Transfer'
      }
    ];
    return demos[Math.floor(Math.random() * demos.length)];
  }
}

// Global instance
window.qrEngine = new QREngine();
