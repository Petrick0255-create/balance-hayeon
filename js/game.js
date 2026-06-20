let saveScore = async () => {};
let getTop5 = async () => [];

import("./firebase.js")
  .then(mod => {
    saveScore = mod.saveScore;
    getTop5 = mod.getTop5;
    console.log("Firebase 연결 성공");
  })
  .catch(err => {
    console.warn("Firebase 연결 실패:", err);
  });

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const timeText = document.getElementById("timeText");
const bestTimeText = document.getElementById("bestTime");
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

let startTime = 0;
let survivalTime = 0;

let windForce = 0;
let hitForce = 0;
let fallingBall = null;

let tapFlash = null;

let weeklyTop5 = [];
let rankingLoading = false;

let bestTime = Number(localStorage.getItem("balanceHayeonBest") || 0);
bestTimeText.textContent = bestTime.toFixed(2);

function vibrate(ms = 18) {
  if (navigator.vibrate) {
    navigator.vibrate(ms);
  }
}

function getViewportHeight() {
  return window.visualViewport ? window.visualViewport.height : window.innerHeight;
}

function getHeaderHeight() {
  return window.innerHeight < 700 ? 62 : 72;
}

function setLayoutSize() {
  const vh = getViewportHeight();
  const headerH = getHeaderHeight();

  let panelH = 150;
  if (vh < 700) panelH = 140;
  if (vh < 620) panelH = 130;

  const canvasH = Math.max(320, vh - headerH - panelH);

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
  CY = H * 0.78;
}

window.addEventListener("resize", resize);

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", resize);
  window.visualViewport.addEventListener("scroll", resize);
}

resize();

function resetGame() {
  state = "ready";
  angle = 0;
  angularVelocity = 0;
  survivalTime = 0;
  windForce = 0;
  hitForce = 0;
  fallingBall = null;
  tapFlash = null;
  timeText.textContent = "0.00";
  weeklyTop5 = [];
  rankingLoading = false;
}

function startGame() {
  state = "playing";
  angle = 0;
  angularVelocity = 0;
  survivalTime = 0;
  windForce = 0;
  hitForce = 0;
  fallingBall = null;
  tapFlash = null;
  startTime = performance.now();
}

async function gameOver() {
  if (state === "gameover") return;

  state = "gameover";
  vibrate(80);

  if (survivalTime > bestTime) {
    bestTime = survivalTime;
    localStorage.setItem("balanceHayeonBest", bestTime);
    bestTimeText.textContent = bestTime.toFixed(2);
  }

  rankingLoading = true;

  try {
    await saveScore(survivalTime);
    weeklyTop5 = await getTop5();
    console.log("TOP5", weeklyTop5);
  } catch (err) {
    console.error("랭킹 저장/불러오기 실패:", err);
    weeklyTop5 = [];
  }

  rankingLoading = false;
}

function tapImpulse(side) {
  if (state === "ready" || state === "gameover") {
    startGame();
    vibrate(25);
    return;
  }

  if (state !== "playing") return;

  // 왼쪽 터치 = 왼쪽에서 톡 쳐서 오른쪽으로 세움
  // 오른쪽 터치 = 오른쪽에서 톡 쳐서 왼쪽으로 세움
  const force = 0.035;

  if (side === "left") {
    angularVelocity += force;
  } else {
    angularVelocity -= force;
  }

  tapFlash = {
    side,
    time: performance.now()
  };

  vibrate(18);
}

function handleTap(e) {
  e.preventDefault();

  const x = e.clientX ?? e.touches?.[0]?.clientX ?? W / 2;
  const side = x < window.innerWidth / 2 ? "left" : "right";

  tapImpulse(side);
}

document.addEventListener("pointerdown", handleTap, { passive: false });

resetBtn.onclick = e => {
  e.stopPropagation();
  resetGame();
  vibrate(20);
};

function updateObstacles() {
  const t = survivalTime;

  windForce = 0;

  if (t > 8) {
    windForce = Math.sin(t * 1.7) * 0.0013;
  }

  if (t > 13 && Math.floor(t) % 7 === 0) {
    hitForce = Math.sin(t * 9) * 0.0028;
  } else {
    hitForce *= 0.93;
  }

  if (t > 18 && !fallingBall && Math.floor(t) % 9 === 0) {
    fallingBall = {
      x: Math.random() < 0.5 ? CX - 90 : CX + 90,
      y: -30,
      vy: 3.6
    };
  }

  if (fallingBall) {
    fallingBall.y += fallingBall.vy;
    fallingBall.vy += 0.09;

    if (fallingBall.y > CY - 160 && fallingBall.y < CY - 90) {
      const side = fallingBall.x < CX ? -1 : 1;
      angularVelocity += side * 0.042;
      fallingBall = null;
      vibrate(35);
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

  const difficulty = 0.0021 + survivalTime * 0.000028;

  const naturalFall = Math.sin(angle) * difficulty;
  const randomShake = Math.sin(survivalTime * 2.8) * difficulty * 0.18;
  const obstacleForce = windForce + hitForce;

  angularVelocity += naturalFall;
  angularVelocity += randomShake;
  angularVelocity += obstacleForce;

  angularVelocity *= 0.986;

  angle += angularVelocity;

  if (Math.abs(angle) > 0.78) {
    gameOver();
  }
}

function drawBackground() {
  ctx.fillStyle = "rgba(255,255,255,0.48)";
  ctx.beginPath();
  ctx.arc(W * 0.18, H * 0.25, 36, 0, Math.PI * 2);
  ctx.arc(W * 0.24, H * 0.23, 28, 0, Math.PI * 2);
  ctx.arc(W * 0.78, H * 0.2, 40, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(34,197,94,0.18)";
  ctx.beginPath();
  ctx.ellipse(CX, H + 24, W * 0.65, 90, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawTapZones() {
  if (tapFlash) {

    const elapsed = performance.now() - tapFlash.time;
    const alpha = Math.max(0, 1 - elapsed / 120);

    if (alpha > 0) {

      ctx.save();

      ctx.globalAlpha = alpha * 0.15;
      ctx.fillStyle =
        tapFlash.side === "left"
          ? "#38bdf8"
          : "#fb923c";

      if (tapFlash.side === "left") {
        ctx.fillRect(0, 0, W / 2, H);
      } else {
        ctx.fillRect(W / 2, 0, W / 2, H);
      }

      ctx.restore();

    } else {
      tapFlash = null;
    }
  }
}

function drawPlatform() {
  const length = Math.min(W * 0.72, 410);

  ctx.save();
  ctx.translate(CX, CY);

  ctx.shadowColor = "rgba(0,0,0,0.22)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 5;

  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(-length / 2, 0);
  ctx.lineTo(length / 2, 0);
  ctx.strokeStyle = "#7c3f13";
  ctx.lineWidth = 28;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-length / 2 + 10, -6);
  ctx.lineTo(length / 2 - 10, -6);
  ctx.strokeStyle = "#d97706";
  ctx.lineWidth = 12;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-length / 2 + 18, -12);
  ctx.lineTo(length / 2 - 18, -12);
  ctx.strokeStyle = "rgba(255,255,255,0.42)";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.restore();
}

function drawPoleAndHayeon() {
  const poleLength = Math.min(H * 0.48, 270);
  const characterSize = Math.min(122, H * 0.29);

  ctx.save();
  ctx.translate(CX, CY);
  ctx.rotate(angle);

  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -poleLength);
  ctx.strokeStyle = "#7c3f13";
  ctx.lineWidth = 10;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-2, -8);
  ctx.lineTo(-2, -poleLength + 8);
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#cbd5e1";
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.save();
  ctx.translate(0, -poleLength);

  ctx.beginPath();
  ctx.moveTo(-20, 0);
  ctx.lineTo(20, 0);
  ctx.strokeStyle = "#7c3f13";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.restore();

  ctx.save();
  ctx.translate(0, -poleLength - 4);

  const lean = -angle * 1.15;
  ctx.rotate(lean);

  ctx.shadowColor = "rgba(0,0,0,0.24)";
  ctx.shadowBlur = 9;
  ctx.shadowOffsetY = 6;

  const img = hayeonCleanImg || hayeonImg;

  if (img.complete || hayeonCleanImg) {
    ctx.drawImage(
      img,
      -characterSize / 2,
      -characterSize + 22,
      characterSize,
      characterSize
    );
  } else {
    ctx.fillStyle = "#84cc16";
    ctx.beginPath();
    ctx.arc(0, -42, 34, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  ctx.restore();
}

function drawObstacles() {
  if (survivalTime > 8 && state === "playing") {
    ctx.fillStyle = "rgba(59,130,246,0.8)";
    ctx.font = "bold 22px Arial";
    ctx.textAlign = "center";
    ctx.fillText("💨", CX + Math.sin(survivalTime * 2) * 145, 50);
  }

  if (survivalTime > 13 && state === "playing") {
    ctx.font = "bold 24px Arial";
    ctx.fillText("💣", 70 + (survivalTime * 80) % (W - 140), 88);
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
    ctx.fillText("터치하여 시작", CX, 52);
    return;
  }

  if (state === "gameover") {

    ctx.fillStyle = "#dc2626";
    ctx.font = "bold 30px Arial";
    ctx.fillText("GAME OVER", CX, 42);

    ctx.fillStyle = "#111827";
    ctx.font = "bold 18px Arial";
    ctx.fillText(`${survivalTime.toFixed(2)}초 버팀`, CX, 72);

    ctx.font = "15px Arial";
    ctx.fillText("터치하면 다시 시작", CX, 98);

    // TOP5
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 16px Arial";
    ctx.fillText("🏆 이번 주 TOP 5", CX, 128);

    ctx.font = "14px Arial";

    if (rankingLoading) {

      ctx.fillText(
        "랭킹 불러오는 중...",
        CX,
        152
      );

    } else if (weeklyTop5.length === 0) {

      ctx.fillText(
        "기록 없음",
        CX,
        152
      );

    } else {

      weeklyTop5.forEach((item, i) => {

        ctx.fillText(
          `${i + 1}위   ${Number(item.score).toFixed(2)}초`,
          CX,
          152 + i * 18
        );

      });

    }
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  drawBackground();
  drawTapZones();
  drawObstacles();
  drawPlatform();
  drawPoleAndHayeon();
  drawStateText();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

function handleTap(e) {
  e.preventDefault();

  const x = e.clientX ?? W / 2;
  const side = x < window.innerWidth / 2 ? "left" : "right";

  tapImpulse(side);
}

document.addEventListener("pointerdown", handleTap, { passive: false });

resetBtn.onclick = e => {
  e.stopPropagation();
  resetGame();
  vibrate(20);
};

loop();