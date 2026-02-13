/** ZARyder Cup — Sparkline + Price chart drawing + extended charts */
import { fmt } from './api.js';

function themeColors() {
  return {
    text: '#6C757D',
    textBold: '#E9ECEF',
    grid: '#1E293B',
    bg: '#111827',
  };
}

export function drawSparkline(canvas, data, color = '#FFD700') {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  if (!data || data.length < 2) return;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, color + '30');
  grad.addColorStop(1, color + '05');

  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let i = 0; i < data.length; i++) {
    const x = (i / (data.length - 1)) * w;
    const y = h - pad - ((data[i] - min) / range) * (h - pad * 2);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  for (let i = 0; i < data.length; i++) {
    const x = (i / (data.length - 1)) * w;
    const y = h - pad - ((data[i] - min) / range) * (h - pad * 2);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  const lastX = w;
  const lastY = h - pad - ((data[data.length - 1] - min) / range) * (h - pad * 2);
  ctx.beginPath();
  ctx.arc(lastX, lastY, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

export function drawPriceChart(canvas, data) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  if (!data || data.length < 2) return;

  const prices = data.map(d => d.priceZar);
  const min = Math.min(...prices) * 0.998;
  const max = Math.max(...prices) * 1.002;
  const range = max - min || 1;
  const padX = 60;
  const padY = 20;
  const chartW = w - padX - 10;
  const chartH = h - padY * 2;

  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  ctx.strokeStyle = isLight ? '#E2E8F0' : '#1E3355';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padY + (i / 4) * chartH;
    ctx.beginPath();
    ctx.moveTo(padX, y);
    ctx.lineTo(w - 10, y);
    ctx.stroke();
    const price = max - (i / 4) * range;
    ctx.fillStyle = isLight ? '#6B7280' : '#94A3B8';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`R${(price / 1000).toFixed(0)}k`, padX - 8, y + 3);
  }

  const isUp = prices[prices.length - 1] >= prices[0];
  const lineColor = isUp ? '#FFD700' : '#DC2626';
  const grad = ctx.createLinearGradient(0, padY, 0, h - padY);
  grad.addColorStop(0, lineColor + '25');
  grad.addColorStop(1, lineColor + '02');

  ctx.beginPath();
  ctx.moveTo(padX, h - padY);
  for (let i = 0; i < prices.length; i++) {
    const x = padX + (i / (prices.length - 1)) * chartW;
    const y = padY + ((max - prices[i]) / range) * chartH;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(padX + chartW, h - padY);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  for (let i = 0; i < prices.length; i++) {
    const x = padX + (i / (prices.length - 1)) * chartW;
    const y = padY + ((max - prices[i]) / range) * chartH;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();

  const lastPrice = prices[prices.length - 1];
  const lastY = padY + ((max - lastPrice) / range) * chartH;
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = lineColor + '80';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padX, lastY);
  ctx.lineTo(w - 10, lastY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = lineColor;
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(fmt.zar(lastPrice), padX + chartW + 4, lastY + 4);
}

/** Pie/donut chart for member contribution shares */
export function drawPieChart(canvas, labels, values, colors) {
  if (!canvas || !values || values.length === 0) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const tc = themeColors();
  const total = values.reduce((s, v) => s + v, 0);
  if (total === 0) return;

  const cx = w * 0.35;
  const cy = h / 2;
  const r = Math.min(cx - 10, cy - 10);
  const innerR = r * 0.55;

  let startAngle = -Math.PI / 2;
  const defaultColors = ['#FFD700', '#22C55E', '#0051A8', '#EF4444', '#8B5CF6', '#F59E0B', '#FFE44D', '#14B8A6', '#003399', '#CCB000'];

  for (let i = 0; i < values.length; i++) {
    const sliceAngle = (values[i] / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = (colors || defaultColors)[i % defaultColors.length];
    ctx.fill();
    startAngle += sliceAngle;
  }

  // Inner circle (donut hole)
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = tc.bg;
  ctx.fill();

  // Legend
  const legendX = w * 0.7;
  let legendY = 16;
  ctx.font = '11px Inter, sans-serif';
  for (let i = 0; i < labels.length && i < 10; i++) {
    ctx.fillStyle = (colors || defaultColors)[i % defaultColors.length];
    ctx.fillRect(legendX, legendY, 10, 10);
    ctx.fillStyle = tc.text;
    ctx.textAlign = 'left';
    const pct = ((values[i] / total) * 100).toFixed(1);
    ctx.fillText(`${labels[i]} (${pct}%)`, legendX + 16, legendY + 9);
    legendY += 18;
  }
}

/** Bar chart for monthly contribution totals */
export function drawBarChart(canvas, labels, values) {
  if (!canvas || !values || values.length === 0) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const tc = themeColors();
  const max = Math.max(...values) || 1;
  const padX = 60;
  const padY = 20;
  const padBottom = 40;
  const chartW = w - padX - 10;
  const chartH = h - padY - padBottom;
  const barW = Math.max(4, Math.min(30, (chartW / values.length) * 0.7));
  const gap = chartW / values.length;

  // Grid lines
  ctx.strokeStyle = tc.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padY + (i / 4) * chartH;
    ctx.beginPath();
    ctx.moveTo(padX, y);
    ctx.lineTo(w - 10, y);
    ctx.stroke();
    const val = max - (i / 4) * max;
    ctx.fillStyle = tc.text;
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`R${(val / 1000).toFixed(0)}k`, padX - 8, y + 3);
  }

  // Bars
  for (let i = 0; i < values.length; i++) {
    const barH = (values[i] / max) * chartH;
    const x = padX + i * gap + (gap - barW) / 2;
    const y = padY + chartH - barH;
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, [3, 3, 0, 0]);
    ctx.fill();

    // Label
    if (labels[i] && (values.length <= 24 || i % 3 === 0)) {
      ctx.fillStyle = tc.text;
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.save();
      ctx.translate(x + barW / 2, padY + chartH + 12);
      ctx.rotate(-0.5);
      ctx.fillText(labels[i], 0, 0);
      ctx.restore();
    }
  }
}

/** DCA line chart — avg buy price over time vs current price */
export function drawDCAChart(canvas, purchases, currentPrice) {
  if (!canvas || !purchases || purchases.length < 2) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const tc = themeColors();

  // Build running avg
  let runBtc = 0, runSpent = 0;
  const points = purchases.map(p => {
    runBtc += p.btcBought;
    runSpent += (p.amountInvested || 0);
    return { date: p.date, avg: runSpent / runBtc, price: p.priceZar };
  });

  const allPrices = points.map(p => p.avg).concat(points.map(p => p.price)).concat([currentPrice || 0]);
  const min = Math.min(...allPrices) * 0.95;
  const max = Math.max(...allPrices) * 1.05;
  const range = max - min || 1;
  const padX = 60;
  const padY = 20;
  const chartW = w - padX - 10;
  const chartH = h - padY * 2;

  // Grid
  ctx.strokeStyle = tc.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padY + (i / 4) * chartH;
    ctx.beginPath();
    ctx.moveTo(padX, y);
    ctx.lineTo(w - 10, y);
    ctx.stroke();
    const val = max - (i / 4) * range;
    ctx.fillStyle = tc.text;
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`R${(val / 1000).toFixed(0)}k`, padX - 8, y + 3);
  }

  // DCA avg line
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const x = padX + (i / (points.length - 1)) * chartW;
    const y = padY + ((max - points[i].avg) / range) * chartH;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Buy price dots
  for (let i = 0; i < points.length; i++) {
    const x = padX + (i / (points.length - 1)) * chartW;
    const y = padY + ((max - points[i].price) / range) * chartH;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#3B82F6';
    ctx.fill();
  }

  // Current price line
  if (currentPrice) {
    const y = padY + ((max - currentPrice) / range) * chartH;
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padX, y);
    ctx.lineTo(w - 10, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#059669';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Current: ' + fmt.zar(currentPrice), padX + 4, y - 6);
  }

  // Legend
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(padX + chartW - 180, padY, 10, 10);
  ctx.fillStyle = tc.text;
  ctx.font = '10px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Avg Buy Price', padX + chartW - 166, padY + 9);

  ctx.fillStyle = '#3B82F6';
  ctx.fillRect(padX + chartW - 90, padY, 10, 10);
  ctx.fillStyle = tc.text;
  ctx.fillText('Buy Price', padX + chartW - 76, padY + 9);
}

/** Fear & Greed gauge (semicircle) */
export function drawFearGreedGauge(canvas, value, label) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const tc = themeColors();
  const cx = w / 2;
  const cy = h - 20;
  const r = Math.min(cx - 20, cy - 10);

  // Background arc
  const startAngle = Math.PI;
  const endAngle = 2 * Math.PI;
  ctx.lineWidth = 18;
  ctx.lineCap = 'round';

  // Gradient arc segments: red → orange → yellow → green
  const segments = [
    { start: 0, end: 0.25, color: '#DC2626' },
    { start: 0.25, end: 0.45, color: '#F59E0B' },
    { start: 0.45, end: 0.55, color: '#EAB308' },
    { start: 0.55, end: 0.75, color: '#84CC16' },
    { start: 0.75, end: 1, color: '#059669' },
  ];

  for (const seg of segments) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle + seg.start * Math.PI, startAngle + seg.end * Math.PI);
    ctx.strokeStyle = seg.color + '40';
    ctx.stroke();
  }

  // Value arc
  const v = Math.max(0, Math.min(100, value || 0));
  const valAngle = startAngle + (v / 100) * Math.PI;

  // Determine color for value
  let valColor = '#EAB308';
  if (v <= 25) valColor = '#DC2626';
  else if (v <= 45) valColor = '#F59E0B';
  else if (v <= 55) valColor = '#EAB308';
  else if (v <= 75) valColor = '#84CC16';
  else valColor = '#059669';

  // Needle
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  const nx = cx + Math.cos(valAngle) * (r - 5);
  const ny = cy + Math.sin(valAngle) * (r - 5);
  ctx.lineTo(nx, ny);
  ctx.strokeStyle = valColor;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fillStyle = valColor;
  ctx.fill();

  // Value text
  ctx.fillStyle = tc.textBold;
  ctx.font = 'bold 28px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(v), cx, cy - 20);

  // Label
  ctx.fillStyle = tc.text;
  ctx.font = '12px Inter, sans-serif';
  ctx.fillText(label || '', cx, cy - 4);

  // Scale labels
  ctx.font = '10px Inter, sans-serif';
  ctx.fillStyle = '#DC2626';
  ctx.textAlign = 'left';
  ctx.fillText('Fear', cx - r - 5, cy + 16);
  ctx.fillStyle = '#059669';
  ctx.textAlign = 'right';
  ctx.fillText('Greed', cx + r + 5, cy + 16);
}

/** BTC Dominance display (big number + donut) */
export function drawDominanceChart(canvas, btcDom, ethDom) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const tc = themeColors();
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(cx, cy) - 20;
  const innerR = r * 0.65;

  const btc = btcDom || 0;
  const eth = ethDom || 0;
  const other = Math.max(0, 100 - btc - eth);

  const slices = [
    { val: btc, color: '#F59E0B', label: 'BTC' },
    { val: eth, color: '#627EEA', label: 'ETH' },
    { val: other, color: tc.grid, label: 'Other' },
  ];

  let startAngle = -Math.PI / 2;
  for (const s of slices) {
    const angle = (s.val / 100) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + angle);
    ctx.closePath();
    ctx.fillStyle = s.color;
    ctx.fill();
    startAngle += angle;
  }

  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = tc.bg;
  ctx.fill();

  // Center text
  ctx.fillStyle = tc.textBold;
  ctx.font = 'bold 24px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(btc.toFixed(1) + '%', cx, cy + 4);
  ctx.fillStyle = tc.text;
  ctx.font = '11px Inter, sans-serif';
  ctx.fillText('BTC Dominance', cx, cy + 20);

  // Legend below
  const legendY = h - 12;
  ctx.font = '10px Inter, sans-serif';
  let lx = cx - 80;
  for (const s of slices) {
    ctx.fillStyle = s.color;
    ctx.fillRect(lx, legendY - 8, 8, 8);
    ctx.fillStyle = tc.text;
    ctx.textAlign = 'left';
    ctx.fillText(`${s.label} ${s.val.toFixed(1)}%`, lx + 12, legendY);
    lx += 60;
  }
}
