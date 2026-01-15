// Divergence Analysis Animation
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('divergenceCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const restartBtn = document.getElementById('divergenceRestart');
  const playBtn = document.getElementById('divergencePlay');

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

  // Expert demonstration particles
  const expertDemos = [];
  const numDemos = 80;
  const baseY = canvas.height / (2 * window.devicePixelRatio);
  const noiseAmount = 40;

  // Initialize expert demos
  for (let i = 0; i < numDemos; i++) {
    expertDemos.push({
      x: (i / numDemos) * canvas.width / window.devicePixelRatio,
      y: baseY + (Math.random() - 0.5) * noiseAmount,
      vx: 1.5,
      baseY: baseY + (Math.random() - 0.5) * noiseAmount
    });
  }

  // Agent states
  const bcAgent = {
    x: 100,
    y: baseY,
    trail: [],
    drift: 0,
    likelihood: 1.0
  };

  const darpAgent = {
    x: 100,
    y: baseY,
    trail: [],
    stateLikelihood: 1.0,
    deltaLikelihood: 0.9, // Will be properly calculated on first reset/update
    nearestNeighbors: []
  };

  // Helper functions
  const distance = (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

  const findNearestNeighbors = (agent, k = 3) => {
    const distances = expertDemos.map((demo, idx) => ({
      idx,
      dist: distance(agent.x, agent.y, demo.x, demo.y),
      demo
    }));
    distances.sort((a, b) => a.dist - b.dist);
    return distances.slice(0, k);
  };

  const calculateLikelihood = (agent) => {
    const distFromBase = Math.abs(agent.y - baseY);
    // Exponential decay based on distance from expert manifold
    return Math.max(0, Math.exp(-distFromBase / 50));
  };

  const calculateDeltaLikelihood = (agent, neighbors) => {
    if (neighbors.length === 0) return 0.9;
    
    // Calculate average difference vector magnitude
    let avgDeltaMag = 0;
    neighbors.forEach(n => {
      const dx = n.demo.x - agent.x;
      const dy = n.demo.y - agent.y;
      avgDeltaMag += Math.sqrt(dx * dx + dy * dy);
    });
    avgDeltaMag /= neighbors.length;
    
    // Expert demos are spaced ~(canvas_width/numDemos) apart horizontally with vertical noise
    // Typical nearest-neighbor distance within expert data is ~20-50 pixels
    // DARP's difference vectors should be similar to these typical expert-to-expert distances
    const typicalNeighborDist = 30; // Realistic typical distance
    const variance = 25; // Allow some flexibility
    
    // High likelihood if difference vector is similar to typical expert-to-expert differences  
    const rawLikelihood = Math.exp(-Math.pow(avgDeltaMag - typicalNeighborDist, 2) / (2 * variance * variance));
    // Keep it in the high range (85-95%)
    return Math.max(0.85, Math.min(0.95, 0.85 + rawLikelihood * 0.1));
  };

  const updateMetrics = () => {
    // Update BC metrics
    const bcLikelihoodPct = Math.round(bcAgent.likelihood * 100);
    document.getElementById('bcStateLikelihood').style.width = `${bcLikelihoodPct}%`;
    document.getElementById('bcStateValue').textContent = `${bcLikelihoodPct}%`;

    // Update DARP metrics
    const darpStatePct = Math.round(darpAgent.stateLikelihood * 100);
    document.getElementById('darpStateLikelihood').style.width = `${darpStatePct}%`;
    document.getElementById('darpStateValue').textContent = `${darpStatePct}%`;

    const darpDeltaPct = Math.round(darpAgent.deltaLikelihood * 100);
    document.getElementById('darpDeltaLikelihood').style.width = `${darpDeltaPct}%`;
    document.getElementById('darpDeltaValue').textContent = `${darpDeltaPct}%`;
  };

  const draw = () => {
    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;

    // Clear canvas
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, w, h);

    // Draw expert demo stream
    ctx.fillStyle = 'rgba(59, 130, 246, 0.6)';
    expertDemos.forEach(demo => {
      ctx.beginPath();
      ctx.arc(demo.x, demo.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw BC agent trail
    if (bcAgent.trail.length > 1) {
      ctx.strokeStyle = 'rgba(220, 38, 38, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bcAgent.trail[0].x, bcAgent.trail[0].y);
      for (let i = 1; i < bcAgent.trail.length; i++) {
        ctx.lineTo(bcAgent.trail[i].x, bcAgent.trail[i].y);
      }
      ctx.stroke();
    }

    // Draw DARP agent trail
    if (darpAgent.trail.length > 1) {
      ctx.strokeStyle = 'rgba(22, 163, 74, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(darpAgent.trail[0].x, darpAgent.trail[0].y);
      for (let i = 1; i < darpAgent.trail.length; i++) {
        ctx.lineTo(darpAgent.trail[i].x, darpAgent.trail[i].y);
      }
      ctx.stroke();
    }

    // Draw DARP difference vectors
    if (darpAgent.nearestNeighbors.length > 0) {
      ctx.strokeStyle = 'rgba(212, 148, 10, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      darpAgent.nearestNeighbors.forEach(n => {
        ctx.beginPath();
        ctx.moveTo(n.demo.x, n.demo.y);
        ctx.lineTo(darpAgent.x, darpAgent.y);
        ctx.stroke();

        // Draw arrow head
        const angle = Math.atan2(darpAgent.y - n.demo.y, darpAgent.x - n.demo.x);
        const arrowSize = 6;
        ctx.beginPath();
        ctx.moveTo(darpAgent.x, darpAgent.y);
        ctx.lineTo(
          darpAgent.x - arrowSize * Math.cos(angle - Math.PI / 6),
          darpAgent.y - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(darpAgent.x, darpAgent.y);
        ctx.lineTo(
          darpAgent.x - arrowSize * Math.cos(angle + Math.PI / 6),
          darpAgent.y - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      });
      ctx.setLineDash([]);
    }

    // Draw BC agent
    ctx.fillStyle = '#dc2626';
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(220, 38, 38, 0.4)';
    ctx.beginPath();
    ctx.arc(bcAgent.x, bcAgent.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw DARP agent
    ctx.fillStyle = '#16a34a';
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(22, 163, 74, 0.4)';
    ctx.beginPath();
    ctx.arc(darpAgent.x, darpAgent.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw labels
    ctx.font = '600 12px Inter, sans-serif';
    ctx.fillStyle = '#dc2626';
    ctx.fillText('BC', bcAgent.x - 10, bcAgent.y - 12);
    
    ctx.fillStyle = '#16a34a';
    ctx.fillText('DARP', darpAgent.x - 18, darpAgent.y - 12);
  };

  const update = () => {
    time += 0.016; // ~60fps

    // Update expert demos (wrap around)
    expertDemos.forEach(demo => {
      demo.x += demo.vx;
      if (demo.x > canvas.width / window.devicePixelRatio + 20) {
        demo.x = -20;
        demo.baseY = baseY + (Math.random() - 0.5) * noiseAmount;
      }
      // Add some vertical drift
      demo.y += (demo.baseY - demo.y) * 0.05 + (Math.random() - 0.5) * 0.5;
    });

    // Update BC agent - gradually drifts away and doesn't recover
    bcAgent.x += 1.5;
    bcAgent.drift += 0.012; // Increases over time
    bcAgent.y += Math.sin(time * 2) * 0.5 + bcAgent.drift * 0.4;
    bcAgent.trail.push({ x: bcAgent.x, y: bcAgent.y });
    if (bcAgent.trail.length > 150) bcAgent.trail.shift();
    bcAgent.likelihood = calculateLikelihood(bcAgent);

    // Update DARP agent - drifts OOD initially, then uses delta vectors to gradually recover
    darpAgent.x += 1.5;
    
    // Find nearest neighbors first to use for correction
    darpAgent.nearestNeighbors = findNearestNeighbors(darpAgent, 10);
    
    // DARP experiences drift but can use difference vectors to correct
    let correctionY = 0;
    if (darpAgent.nearestNeighbors.length > 0) {
      // Average Y position of neighbors gives correction signal
      const avgNeighborY = darpAgent.nearestNeighbors.reduce((sum, n) => sum + n.demo.y, 0) / darpAgent.nearestNeighbors.length;
      // Weaker correction that kicks in gradually
      const correctionStrength = Math.min(time / 5, 0.08); // Builds up over time, max 8%
      correctionY = (avgNeighborY - darpAgent.y) * correctionStrength;
    }
    
    // Accumulates some drift initially, then correction helps stabilize
    const driftAmount = Math.max(0, 10 - time * 1.1); // Decreases over time as correction improves
    console.log(driftAmount)
    darpAgent.y += Math.sin(time * 2) * 0.5 + driftAmount * time * 0.15 + correctionY;
    console.log(darpAgent.y)
    darpAgent.trail.push({ x: darpAgent.x, y: darpAgent.y });
    if (darpAgent.trail.length > 150) darpAgent.trail.shift();
    
    // Calculate likelihoods
    darpAgent.stateLikelihood = calculateLikelihood(darpAgent);
    darpAgent.deltaLikelihood = calculateDeltaLikelihood(darpAgent, darpAgent.nearestNeighbors);

    // Update UI metrics
    updateMetrics();

    draw();

    if (isPlaying) {
      animationFrame = requestAnimationFrame(update);
    }
  };

  const reset = () => {
    time = 0;
    bcAgent.x = 100;
    bcAgent.y = baseY;
    bcAgent.trail = [];
    bcAgent.drift = 0;
    bcAgent.likelihood = 1.0;

    darpAgent.x = 100;
    darpAgent.y = baseY;
    darpAgent.trail = [];
    darpAgent.stateLikelihood = 1.0;
    
    // Reset expert demos first
    for (let i = 0; i < expertDemos.length; i++) {
      expertDemos[i].x = (i / numDemos) * canvas.width / window.devicePixelRatio;
      expertDemos[i].y = baseY + (Math.random() - 0.5) * noiseAmount;
    }
    
    // Now calculate neighbors and delta likelihood with actual expert demo positions
    darpAgent.nearestNeighbors = findNearestNeighbors(darpAgent, 10);
    darpAgent.deltaLikelihood = calculateDeltaLikelihood(darpAgent, darpAgent.nearestNeighbors);

    updateMetrics();
    draw();
  };

  const togglePlay = () => {
    isPlaying = !isPlaying;
    if (isPlaying) {
      playBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16"></rect>
          <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
        Pause
      `;
      update();
    } else {
      playBtn.innerHTML = `
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
      playBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        Play
      `;
    }
  });

  playBtn.addEventListener('click', togglePlay);

  // Initial draw
  reset();
});
