// Multimodal Aggregation Visualization
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('multimodalCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const restartBtn = document.getElementById('multimodalRestart');
  const toggleBtn = document.getElementById('multimodalToggle');

  // Set canvas size
  const resizeCanvas = () => {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  };
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Animation state
  let isPlaying = false;
  let animationFrame = null;
  let time = 0;

  // Two clusters of expert demonstrations (bimodal)
  const clusterA = [];
  const clusterB = [];
  const centerA = { x: 250, y: 150 };
  const centerB = { x: 550, y: 250 };
  const clusterRadius = 50;
  const numPerCluster = 30;

  // Initialize clusters
  const initializeClusters = () => {
    clusterA.length = 0;
    clusterB.length = 0;

    for (let i = 0; i < numPerCluster; i++) {
      const angleA = (i / numPerCluster) * Math.PI * 2;
      const rA = Math.random() * clusterRadius;
      clusterA.push({
        x: centerA.x + Math.cos(angleA) * rA + (Math.random() - 0.5) * 20,
        y: centerA.y + Math.sin(angleA) * rA + (Math.random() - 0.5) * 20,
        baseX: centerA.x + Math.cos(angleA) * rA,
        baseY: centerA.y + Math.sin(angleA) * rA
      });

      const angleB = (i / numPerCluster) * Math.PI * 2;
      const rB = Math.random() * clusterRadius;
      clusterB.push({
        x: centerB.x + Math.cos(angleB) * rB + (Math.random() - 0.5) * 20,
        y: centerB.y + Math.sin(angleB) * rB + (Math.random() - 0.5) * 20,
        baseX: centerB.x + Math.cos(angleB) * rB,
        baseY: centerB.y + Math.sin(angleB) * rB
      });
    }
  };

  // Query state (ambiguous - could go either way)
  const queryState = {
    x: 410,
    y: 150,
    selected: []
  };

  // Predictions
  const avgPrediction = { x: 0, y: 0, alpha: 0 };
  const setPrediction = { modes: [], alpha: 0 };

  // Helper to find k nearest neighbors
  const findKNearest = (query, k) => {
    const allPoints = [...clusterA, ...clusterB];
    const distances = allPoints.map((p, idx) => ({
      point: p,
      dist: Math.sqrt((p.x - query.x) ** 2 + (p.y - query.y) ** 2),
      cluster: idx < numPerCluster ? 'A' : 'B'
    }));
    distances.sort((a, b) => a.dist - b.dist);
    return distances.slice(0, k);
  };

  const draw = () => {
    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;

    // Clear
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, w, h);

    // Draw cluster labels
    ctx.font = '600 14px Inter, sans-serif';
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('Mode A (go left)', centerA.x - 50, centerA.y - 80);
    ctx.fillText('Mode B (go right)', centerB.x - 50, centerB.y + 100);

    // Draw expert demonstrations
    [...clusterA, ...clusterB].forEach(point => {
      const isSelected = queryState.selected.some(n => n.point === point);
      
      if (isSelected) {
        // Highlight selected neighbors
        ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = 'rgba(59, 130, 246, 0.6)';
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw lines to selected neighbors
    if (queryState.selected.length > 0) {
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      queryState.selected.forEach(n => {
        ctx.beginPath();
        ctx.moveTo(queryState.x, queryState.y);
        ctx.lineTo(n.point.x, n.point.y);
        ctx.stroke();
      });
      ctx.setLineDash([]);
    }

    // Draw query state
    ctx.fillStyle = '#8b5cf6';
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(139, 92, 246, 0.5)';
    ctx.beginPath();
    ctx.arc(queryState.x, queryState.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font = '600 12px Inter, sans-serif';
    ctx.fillStyle = '#8b5cf6';
    ctx.fillText('Query State', queryState.x - 35, queryState.y - 15);

    // Draw averaged prediction (bad - falls between clusters)
    if (avgPrediction.alpha > 0) {
      ctx.globalAlpha = avgPrediction.alpha;
      
      // Draw X mark to show this is bad
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 3;
      const xSize = 10;
      ctx.beginPath();
      ctx.moveTo(avgPrediction.x - xSize, avgPrediction.y - xSize);
      ctx.lineTo(avgPrediction.x + xSize, avgPrediction.y + xSize);
      ctx.moveTo(avgPrediction.x + xSize, avgPrediction.y - xSize);
      ctx.lineTo(avgPrediction.x - xSize, avgPrediction.y + xSize);
      ctx.stroke();

      ctx.fillStyle = '#dc2626';
      ctx.font = '600 11px Inter, sans-serif';
      ctx.fillText('Averaged', avgPrediction.x - 45, avgPrediction.y + 25);
      
      ctx.globalAlpha = 1;
    }

    // Draw set-based predictions (good - maintains modes)
    if (setPrediction.alpha > 0 && setPrediction.modes.length > 0) {
      ctx.globalAlpha = setPrediction.alpha;
      
      setPrediction.modes.forEach(mode => {
        ctx.fillStyle = '#16a34a';
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(22, 163, 74, 0.4)';
        ctx.beginPath();
        ctx.arc(mode.x, mode.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      ctx.fillStyle = '#16a34a';
      ctx.font = '600 11px Inter, sans-serif';
      ctx.fillText('Set-based', setPrediction.modes[0].x - 50, setPrediction.modes[0].y - 20);
      
      ctx.globalAlpha = 1;
    }
  };

  const update = () => {
    time += 0.02;

    // Add gentle floating animation to points
    [...clusterA, ...clusterB].forEach(point => {
      point.x = point.baseX + Math.sin(time + point.baseX * 0.01) * 3;
      point.y = point.baseY + Math.cos(time + point.baseY * 0.01) * 3;
    });

    // Animate the demonstration
    const phase = (time % 8);
    
    if (phase < 1) {
      // Phase 1: Select neighbors
      queryState.selected = findKNearest(queryState, 12);
      avgPrediction.alpha = 0;
      setPrediction.alpha = 0;
    } else if (phase < 2.5) {
      // Phase 2: Show averaged prediction
      const progress = (phase - 1) / 1.5;
      avgPrediction.alpha = Math.min(1, progress * 2);
      
      // Calculate average
      const avgX = queryState.selected.reduce((sum, n) => sum + n.point.x, 0) / queryState.selected.length;
      const avgY = queryState.selected.reduce((sum, n) => sum + n.point.y, 0) / queryState.selected.length;
      avgPrediction.x = avgX;
      avgPrediction.y = avgY;
      
      setPrediction.alpha = 0;
    } else if (phase < 5) {
      // Phase 3: Show set-based prediction
      const progress = (phase - 2.5) / 2.5;
      setPrediction.alpha = Math.min(1, progress * 2);
      
      // Calculate modes (cluster-aware)
      const clusterANeighbors = queryState.selected.filter(n => n.cluster === 'A');
      const clusterBNeighbors = queryState.selected.filter(n => n.cluster === 'B');
      
      setPrediction.modes = [];
      if (clusterANeighbors.length > 0) {
        const modeAX = clusterANeighbors.reduce((sum, n) => sum + n.point.x, 0) / clusterANeighbors.length;
        const modeAY = clusterANeighbors.reduce((sum, n) => sum + n.point.y, 0) / clusterANeighbors.length;
        setPrediction.modes.push({ x: modeAX, y: modeAY });
      }
      if (clusterBNeighbors.length > 0) {
        const modeBX = clusterBNeighbors.reduce((sum, n) => sum + n.point.x, 0) / clusterBNeighbors.length;
        const modeBY = clusterBNeighbors.reduce((sum, n) => sum + n.point.y, 0) / clusterBNeighbors.length;
        setPrediction.modes.push({ x: modeBX, y: modeBY });
      }
      
      avgPrediction.alpha = Math.max(0, 1 - progress * 1.5);
    } else {
      // Phase 4: Hold for viewing
      avgPrediction.alpha = 0;
      setPrediction.alpha = 1;
    }

    draw();

    if (isPlaying) {
      animationFrame = requestAnimationFrame(update);
    }
  };

  const reset = () => {
    time = 0;
    initializeClusters();
    queryState.selected = [];
    avgPrediction.alpha = 0;
    setPrediction.alpha = 0;
    setPrediction.modes = [];
    draw();
  };

  const togglePlay = () => {
    isPlaying = !isPlaying;
    if (isPlaying) {
      toggleBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16"></rect>
          <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
        Pause
      `;
      update();
    } else {
      toggleBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        Play
      `;
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    }
  };

  // Event listeners
  restartBtn.addEventListener('click', () => {
    reset();
    if (isPlaying) {
      isPlaying = false;
      toggleBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        Play
      `;
    }
  });

  toggleBtn.addEventListener('click', togglePlay);

  // Initialize
  reset();
  
  // Create distribution visualizations
  createDistributionViz();
});

// Create static distribution visualizations
function createDistributionViz() {
  const avgContainer = document.getElementById('avgDistribution');
  const setContainer = document.getElementById('setDistribution');

  if (!avgContainer || !setContainer) return;

  // SVG for averaging (single mode in wrong place)
  const avgSvg = `
    <svg viewBox="0 0 300 180" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="avgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#dc2626;stop-opacity:0.3" />
          <stop offset="100%" style="stop-color:#dc2626;stop-opacity:0.05" />
        </linearGradient>
      </defs>
      
      <!-- True modes (grayed out) -->
      <path d="M 50 140 Q 80 20 110 140" fill="none" stroke="#d1d5db" stroke-width="2" stroke-dasharray="5,5"/>
      <path d="M 190 140 Q 220 20 250 140" fill="none" stroke="#d1d5db" stroke-width="2" stroke-dasharray="5,5"/>
      <text x="80" y="160" class="dist-label">True mode A</text>
      <text x="220" y="160" class="dist-label">True mode B</text>
      
      <!-- Averaged prediction (wrong) -->
      <path d="M 120 140 Q 150 60 180 140" fill="url(#avgGrad)" stroke="#dc2626" stroke-width="3"/>
      <circle cx="150" cy="60" r="6" class="dist-prediction"/>
      <text x="130" y="40" style="fill:#dc2626;font-weight:600;font-size:13px">Averaged</text>
      <text x="110" y="55" style="fill:#dc2626;font-size:11px">(Between modes)</text>
    </svg>
  `;

  // SVG for set-based (preserves both modes)
  const setSvg = `
    <svg viewBox="0 0 300 180" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="setGradA" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#16a34a;stop-opacity:0.3" />
          <stop offset="100%" style="stop-color:#16a34a;stop-opacity:0.05" />
        </linearGradient>
        <linearGradient id="setGradB" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#16a34a;stop-opacity:0.3" />
          <stop offset="100%" style="stop-color:#16a34a;stop-opacity:0.05" />
        </linearGradient>
      </defs>
      
      <!-- Both modes preserved -->
      <path d="M 50 140 Q 80 20 110 140" fill="url(#setGradA)" stroke="#16a34a" stroke-width="3"/>
      <circle cx="80" cy="20" r="6" class="dist-prediction good"/>
      <text x="60" y="10" style="fill:#16a34a;font-weight:600;font-size:12px">Mode A</text>
      
      <path d="M 190 140 Q 220 20 250 140" fill="url(#setGradB)" stroke="#16a34a" stroke-width="3"/>
      <circle cx="220" cy="20" r="6" class="dist-prediction good"/>
      <text x="200" y="10" style="fill:#16a34a;font-weight:600;font-size:12px">Mode B</text>
      
      <text x="85" y="165" style="fill:#6b7280;font-size:11px">Multimodal distribution preserved</text>
    </svg>
  `;

  avgContainer.innerHTML = avgSvg;
  setContainer.innerHTML = setSvg;
}
