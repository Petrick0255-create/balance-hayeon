const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const timeText = document.getElementById("timeText");
const bestTimeText = document.getElementById("bestTime");

const leftWeightSelect = document.getElementById("leftWeight");
const rightWeightSelect = document.getElementById("rightWeight");

const controlPad = document.getElementById("controlPad");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");

let W, H, CX, CY;

const hayeonImg = new Image();
hayeonImg.src = "assets/images/hayeon.png";

let hayeonCleanImg = null;

hayeonImg.onload = () => {
  const temp = document.createElement("canvas");
  const tctx = temp.getContext("2d");

  temp.width = hayeonImg.width;
  temp.height = hayeonImg.height;

  tctx.drawImage(hayeonImg, 0, 0);

  const imgData = tctx.getImageData(0, 0, temp.width, temp.height);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (r > 225 && g > 225 && b > 225) {
      data[i + 3] = 0;
    }
  }

  tctx.putImageData(imgData, 0, 0);
  hayeonCleanImg = temp;
};

let state = "ready";

let angle = 0;
let angularVelocity = 0;
let inputPower = 0;

let startTime = 0;
let survivalTime = 0;

let windForce = 0;
let birdHit = 0;
let fallingBall = null;

let bestTime = Number(localStorage.getItem("balanceHayeonBest") || 0);
bestTimeText.textContent = bestTime.toFixed(2);

let dragging = false;
let lastX = 0;

function getViewportHeight() {
  if (window.visualViewport) {
    return window.visualViewport.height;
  }
  return window.innerHeight;
}

function getHeaderHeight() {
  return window.innerHeight < 700 ? 62 : 72;
}

function setLayoutSize() {
  const vh = getViewportHeight();
  const headerH = getHeaderHeight();

  let panelH = 250;

  if (vh < 700) panelH = 230;
  if (vh < 620) panelH = 215;

  const canvasH = Math.max(250, vh - headerH - panelH);

  document.documentElement.style.setProperty("--app-height", `${vh}px`);
  document.documentElement.style.setProperty("--panel-height", `${panelH}px`);
  document.documentElement.style.setProperty("--canvas-height", `${canvasH}px`);
}

function resize() {
  setLayoutSize();

  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;

  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

  W = rect.width;
  H = rect.height;
  CX = W / 2;
  CY = H * 0.67;
}

window.addEventListener("resize", resize);

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", resize);
  window.visualViewport.addEventListener("scroll", resize);
}

resize();

function syncWeightTotal(changedSide) {
  const left = Number(leftWeightSelect.value);
  const right = Number(rightWeightSelect.value);

  if (changedSide === "left") {
    rightWeightSelect.value = String(6 - left);
  } else {
    leftWeightSelect.value = String(6 - right);
  }
}

leftWeightSelect.addEventListener("change", () => syncWeightTotal("left"));
rightWeightSelect.addEventListener("change", () => syncWeightTotal("right"));

function getWeights() {
  return {
    left: Number(leftWeightSelect.value),
    right: Number(rightWeightSelect.value)
  };
}

function resetGame() {
  state = "ready";
  angle = 0;
  angularVelocity = 0;
  inputPower = 0;
  survivalTime = 0;
  windForce = 0;
  birdHit = 0;
  fallingBall = null;
  timeText.textContent = "0.00";
}

function startGame() {
  state = "playing";
  angle = 0;
  angularVelocity = 0;
  inputPower = 0;
  survivalTime = 0;
  windForce = 0;
  birdHit = 0;
  fallingBall = null;
  startTime = performance.now();
}

function gameOver() {
  state = "gameover";

  if (survivalTime > bestTime) {
    bestTime = survivalTime;
    localStorage.setItem("balanceHayeonBest", bestTime);
    bestTimeText.textContent = bestTime.toFixed(2);
  }
}

function updateObstacles() {
  const t = survivalTime;
  windForce = 0;

  if (t > 8) {
    windForce = Math.sin(t * 1.8) * 0.0012;
  }

  if (t > 12 && Math.floor(t) % 7 === 0) {
    birdHit = Math.sin(t * 12) * 0.0025;
  } else {
    birdHit *= 0.92;
  }

  if (t > 18 && !fallingBall && Math.floor(t) % 9 === 0) {
    fallingBall = {
      x: Math.random() < 0.5 ? CX - 110 : CX + 110,
      y: -30,
      vy: 3.8
    };
  }

  if (fallingBall) {
    fallingBall.y += fallingBall.vy;
    fallingBall.vy += 0.08;

    if (fallingBall.y > CY - 25 && fallingBall.y < CY + 45) {
      const side = fallingBall.x < CX ? -1 : 1;
      angularVelocity += side * 0.045;
      fallingBall = null;
    }

    if (fallingBall && fallingBall.y > H + 60) {
      fallingBall = null;
    }
  }
}

function update() {
  if (state !== "playing") return;

  survivalTime = (performance.now() - startTime) / 1000;
  timeText.textContent = survivalTime.toFixed(2);

  updateObstacles();

  const weights = getWeights();
  const totalWeight = weights.left + weights.right;
  const weightDiff = weights.right - weights.left;

  const stability = 1 + totalWeight * 0.38;
  const imbalance = weightDiff * 0.00032;

  const difficulty = 0.00115 + survivalTime * 0.000017;

  const naturalFall = Math.sin(angle) * difficulty * 3.0 / stability;
  const randomShake = Math.sin(survivalTime * 2.4) * difficulty / stability;
  const obstacleForce = (windForce + birdHit) / stability;

  angularVelocity += inputPower * 0.00072;
  angularVelocity += naturalFall;
  angularVelocity += randomShake;
  angularVelocity += obstacleForce;
  angularVelocity += imbalance;

  angularVelocity *= 0.982 - totalWeight * 0.0025;

  angle += angularVelocity;
  inputPower *= 0.86;

  if (Math.abs(angle) > 1.12) {
    gameOver();
  }
}

function drawBackground() {
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.arc(W * 0.18, H * 0.25, 36, 0, Math.PI * 2);
  ctx.arc(W * 0.24, H * 0.23, 28, 0, Math.PI * 2);
  ctx.arc(W * 0.78, H * 0.2, 40, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(34,197,94,0.18)";
  ctx.beginPath();
  ctx.ellipse(CX, H + 28, W * 0.65, 90, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBase() {
  ctx.save();
  ctx.translate(CX, CY + 88);

  ctx.fillStyle = "#64748b";
  ctx.beginPath();
  ctx.moveTo(-52, 44);
  ctx.lineTo(52, 44);
  ctx.lineTo(17, -76);
  ctx.lineTo(-17, -76);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#475569";
  ctx.fillRect(-76, 44, 152, 18);

  ctx.restore();
}

function getBeamLength() {
  return Math.min(W * 0.82, 450);
}

function getBeamBend() {
  const weights = getWeights();
  const totalWeight = weights.left + weights.right;
  return 4 + totalWeight * 4;
}

function beamYAt(x) {
  const beamLength = getBeamLength();
  const bend = getBeamBend();
  const t = x / (beamLength / 2);
  return bend * (1 - t * t);
}

function drawCurvedBeam() {
  const beamLength = getBeamLength();
  const bend = getBeamBend();

  ctx.save();
  ctx.translate(CX, CY);
  ctx.rotate(angle);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.moveTo(-beamLength / 2, 4);
  ctx.quadraticCurveTo(0, bend + 8, beamLength / 2, 4);
  ctx.strokeStyle = "rgba(0,0,0,0.22)";
  ctx.lineWidth = 30;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-beamLength / 2, 0);
  ctx.quadraticCurveTo(0, bend, beamLength / 2, 0);
  ctx.strokeStyle = "#7c3f13";
  ctx.lineWidth = 26;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-beamLength / 2, -2);
  ctx.quadraticCurveTo(0, bend - 2, beamLength / 2, -2);
  ctx.strokeStyle = "#d97706";
  ctx.lineWidth = 17;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-beamLength / 2 + 10, -8);
  ctx.quadraticCurveTo(0, bend - 9, beamLength / 2 - 10, -8);
  ctx.strokeStyle = "rgba(255,255,255,0.42)";
  ctx.lineWidth = 4;
  ctx.stroke();

  drawWeight(-beamLength / 2 + 42, getWeights().left);
  drawWeight(beamLength / 2 - 42, getWeights().right);

  ctx.fillStyle = "#cbd5e1";
  ctx.beginPath();
  ctx.arc(0, bend, 21, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.restore();
}

function drawWeight(x, kg) {
  if (kg <= 0) return;

  const y = beamYAt(x);

  ctx.save();
  ctx.translate(x, y + 78);

  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, -78);
  ctx.lineTo(0, -18);
  ctx.stroke();

  ctx.fillStyle = "#374151";
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.rect(-28, -18, 56, 52);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.font = "bold 21px Arial";
  ctx.fillText(kg, 0, 11);

  ctx.font = "bold 12px Arial";
  ctx.fillText("KG", 0, 28);

  ctx.restore();
}

function drawHayeon() {
  const bend = getBeamBend();

  ctx.save();
  ctx.translate(CX, CY);
  ctx.rotate(angle);

  ctx.translate(0, bend - 4);

  const lean = -angle * 0.85;
  ctx.rotate(lean);

  const size = Math.min(112, H * 0.27);

  ctx.shadowColor = "rgba(0,0,0,0.22)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 5;

  const img = hayeonCleanImg || hayeonImg;

  if (img.complete || hayeonCleanImg) {
    ctx.drawImage(img, -size / 2, -size + 40, size, size);
  } else {
    ctx.fillStyle = "#84cc16";
    ctx.beginPath();
    ctx.arc(0, -45, 34, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawObstacles() {
  if (survivalTime > 8 && state === "playing") {
    ctx.fillStyle = "rgba(59,130,246,0.8)";
    ctx.font = "bold 22px Arial";
    ctx.textAlign = "center";
    ctx.fillText("💨", CX + Math.sin(survivalTime * 2) * 150, 48);
  }

  if (survivalTime > 12 && state === "playing") {
    ctx.font = "bold 24px Arial";
    ctx.fillText("💣", 70 + (survivalTime * 80) % (W - 140), 86);
  }

  if (fallingBall) {
    ctx.beginPath();
    ctx.arc(fallingBall.x, fallingBall.y, 18, 0, Math.PI * 2);
    ctx.fillStyle = "#ef4444";
    ctx.fill();

    ctx.strokeStyle = "#7f1d1d";
    ctx.lineWidth = 4;
    ctx.stroke();
  }
}

function drawStateText() {
  ctx.textAlign = "center";

  if (state === "ready") {
    ctx.fillStyle = "#1f2937";
    ctx.font = `bold ${Math.min(28, W * 0.075)}px Arial`;
    ctx.fillText("시작 버튼을 누르세요", CX, 42);

    ctx.font = `${Math.min(15, W * 0.038)}px Arial`;
    ctx.fillText("안정추가 많을수록 막대가 아래로 휘어 안정해집니다.", CX, 70);
  }

  if (state === "gameover") {
    ctx.fillStyle = "#dc2626";
    ctx.font = "bold 30px Arial";
    ctx.fillText("GAME OVER", CX, 42);

    ctx.fillStyle = "#111827";
    ctx.font = "bold 18px Arial";
    ctx.fillText(`${survivalTime.toFixed(2)}초 버팀`, CX, 70);
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  drawBackground();
  drawObstacles();
  drawBase();
  drawCurvedBeam();
  drawHayeon();
  drawStateText();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

controlPad.addEventListener("pointerdown", e => {
  dragging = true;
  lastX = e.clientX;
  controlPad.setPointerCapture(e.pointerId);
});

controlPad.addEventListener("pointermove", e => {
  if (!dragging || state !== "playing") return;

  const dx = e.clientX - lastX;
  inputPower += dx;

  lastX = e.clientX;
});

controlPad.addEventListener("pointerup", e => {
  dragging = false;
  controlPad.releasePointerCapture(e.pointerId);
});

controlPad.addEventListener("pointercancel", e => {
  dragging = false;
  controlPad.releasePointerCapture(e.pointerId);
});

document.addEventListener("keydown", e => {
  if (state !== "playing") return;

  if (e.key === "ArrowLeft") inputPower -= 14;
  if (e.key === "ArrowRight") inputPower += 14;
});

startBtn.onclick = startGame;
resetBtn.onclick = resetGame;

loop();