/* ==========================================================================
   FivPay - Canvas Charts & Analytics Engine
   High-performance pure vanilla HTML5 Canvas charts with responsive tooltips
   ========================================================================== */

class FivPayCharts {
  constructor() {
    this.charts = {};
  }

  getThemeColors() {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    return {
      textColor: isDark ? '#9ca3af' : '#64748b',
      gridColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
      tooltipBg: isDark ? '#1f2937' : '#ffffff',
      tooltipText: isDark ? '#f9fafb' : '#0f172a',
      primary: '#6366f1',
      secondary: '#06b6d4',
      success: '#10b981',
      danger: '#ef4444'
    };
  }

  /**
   * Setup canvas with devicePixelRatio for ultra-sharp rendering on Retina/HiDPI screens
   */
  setupCanvas(canvas) {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Set actual canvas size in memory
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, width: rect.width, height: rect.height, dpr };
  }

  /**
   * 1. Balance Trend Area/Line Chart
   */
  renderBalanceTrend(canvasId, timeframe = '1M') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const setup = this.setupCanvas(canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;
    const colors = this.getThemeColors();

    // Data points based on timeframe
    let labels, data;
    if (timeframe === '1W') {
      labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      data = [21200, 22100, 21850, 23400, 22900, 24100, 24850];
    } else if (timeframe === '6M') {
      labels = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
      data = [14200, 16800, 19400, 18200, 21500, 24850];
    } else {
      // 1M default
      labels = ['Oct 1', 'Oct 5', 'Oct 9', 'Oct 13', 'Oct 16', 'Oct 18'];
      data = [18400, 19600, 21200, 20800, 22400, 24850];
    }

    const padding = { top: 25, right: 20, bottom: 35, left: 55 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxVal = Math.max(...data) * 1.1;
    const minVal = Math.min(...data) * 0.9;

    // Draw horizontal grid lines & Y-axis labels
    const gridLines = 4;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = colors.textColor;
    ctx.textAlign = 'right';

    for (let i = 0; i <= gridLines; i++) {
      const yVal = minVal + (maxVal - minVal) * (i / gridLines);
      const y = padding.top + chartH - (i / gridLines) * chartH;
      
      ctx.beginPath();
      ctx.strokeStyle = colors.gridColor;
      ctx.lineWidth = 1;
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillText('$' + (yVal / 1000).toFixed(1) + 'k', padding.left - 10, y + 4);
    }

    // Calculate (x, y) coordinates for data points
    const points = data.map((val, index) => {
      const x = padding.left + (index / (data.length - 1)) * chartW;
      const y = padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
      return { x, y, val, label: labels[index] };
    });

    // Draw X-axis labels
    ctx.textAlign = 'center';
    points.forEach(pt => {
      ctx.fillText(pt.label, pt.x, height - padding.bottom + 20);
    });

    // Draw Gradient Area fill under curve
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.45)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.00)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
    ctx.lineTo(points[0].x, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw Smooth Line
    ctx.beginPath();
    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.stroke();

    // Draw Data Point Circles
    points.forEach((pt, i) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, i === points.length - 1 ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = colors.primary;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  /**
   * 2. Cash Flow Comparison (Monthly Inflow vs Outflow Bar Chart)
   */
  renderCashFlow(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const setup = this.setupCanvas(canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;
    const colors = this.getThemeColors();

    const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
    const inflow = [6200, 7800, 6900, 8400, 9200];
    const outflow = [4100, 4900, 5200, 4800, 5600];

    const padding = { top: 25, right: 20, bottom: 35, left: 50 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxVal = 10000;

    // Grid lines
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = colors.textColor;
    ctx.textAlign = 'right';

    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (i / 4) * chartH;
      const val = maxVal - (i / 4) * maxVal;

      ctx.beginPath();
      ctx.strokeStyle = colors.gridColor;
      ctx.lineWidth = 1;
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillText('$' + (val / 1000).toFixed(0) + 'k', padding.left - 8, y + 4);
    }

    const groupWidth = chartW / months.length;
    const barWidth = Math.min(groupWidth * 0.28, 22);

    months.forEach((m, idx) => {
      const groupCenterX = padding.left + idx * groupWidth + groupWidth / 2;

      // Inflow Bar
      const inH = (inflow[idx] / maxVal) * chartH;
      const inX = groupCenterX - barWidth - 3;
      const inY = padding.top + chartH - inH;
      ctx.fillStyle = colors.success;
      ctx.beginPath();
      ctx.roundRect(inX, inY, barWidth, inH, [4, 4, 0, 0]);
      ctx.fill();

      // Outflow Bar
      const outH = (outflow[idx] / maxVal) * chartH;
      const outX = groupCenterX + 3;
      const outY = padding.top + chartH - outH;
      ctx.fillStyle = colors.primary;
      ctx.beginPath();
      ctx.roundRect(outX, outY, barWidth, outH, [4, 4, 0, 0]);
      ctx.fill();

      // Month Label
      ctx.fillStyle = colors.textColor;
      ctx.textAlign = 'center';
      ctx.fillText(m, groupCenterX, height - padding.bottom + 20);
    });
  }

  /**
   * 3. Spending by Category (Interactive Doughnut Chart)
   */
  renderSpendingDonut(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const setup = this.setupCanvas(canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;
    const colors = this.getThemeColors();

    const categories = [
      { name: 'Housing', val: 2450, color: '#6366f1' },
      { name: 'Food & Dining', val: 890, color: '#10b981' },
      { name: 'Travel', val: 1350, color: '#f59e0b' },
      { name: 'Tech & Cloud', val: 650, color: '#06b6d4' },
      { name: 'Entertainment', val: 280, color: '#ec4899' }
    ];

    const total = categories.reduce((sum, c) => sum + c.val, 0);
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 20;
    const cutout = radius * 0.65;

    let startAngle = -Math.PI / 2;

    categories.forEach(item => {
      const sliceAngle = (item.val / total) * (Math.PI * 2);
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.arc(centerX, centerY, cutout, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = item.color;
      ctx.fill();

      startAngle = endAngle;
    });

    // Donut Center Text
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.textColor;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('Total Spent', centerX, centerY - 8);

    ctx.fillStyle = colors.tooltipText;
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.fillText('$' + total.toLocaleString(), centerX, centerY + 14);
  }

  /**
   * Re-render all active charts (called on resize or theme toggle)
   */
  refreshAll() {
    this.renderBalanceTrend('chart-balance-trend');
    this.renderCashFlow('chart-cash-flow');
    this.renderSpendingDonut('chart-category-donut');
    this.renderBalanceTrend('chart-analytics-trend');
    this.renderCashFlow('chart-analytics-cashflow');
  }
}

// Global charts instance
window.fivpayCharts = new FivPayCharts();

window.addEventListener('resize', () => {
  if (window.fivpayCharts) {
    window.fivpayCharts.refreshAll();
  }
});
