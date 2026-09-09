const starCanvas = document.querySelector("#star-canvas");
const titleCanvas = document.querySelector("#title-canvas");
const invitationButton = document.querySelector("#invitation-btn");
const starContext = starCanvas.getContext("2d");
const titleContext = titleCanvas.getContext("2d");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const stars = [];
const starCount = 220;
let titleTargets = [];
let animationStart = performance.now();
let formedAt = 0;

function resizeCanvas() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  [starCanvas, titleCanvas].forEach((canvas) => {
    const bounds = canvas.getBoundingClientRect();
    canvas.width = Math.round(bounds.width * pixelRatio);
    canvas.height = Math.round(bounds.height * pixelRatio);
    canvas.getContext("2d").setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  });
  titleTargets = createTextTargets();
}

function createTextTargets() {
  const bounds = titleCanvas.getBoundingClientRect();
  const offscreen = document.createElement("canvas");
  offscreen.width = Math.max(1, Math.floor(bounds.width));
  offscreen.height = Math.max(1, Math.floor(bounds.height));
  const context = offscreen.getContext("2d");
  const fontSize = Math.min(bounds.width * 0.3, bounds.height * 0.92);
  context.font = `700 ${fontSize}px "Bodoni 72", Didot, Georgia, serif`;
  context.textBaseline = "middle";
  const characters = ["Y", "&", "A"];
  const characterGap = fontSize * 0.08;
  const characterWidths = characters.map((character) => context.measureText(character).width);
  const textWidth = characterWidths.reduce((total, width) => total + width, 0) + characterGap * 2;
  let characterX = (bounds.width - textWidth) / 2;

  characters.forEach((character, index) => {
    context.textAlign = "left";
    context.fillText(character, characterX, bounds.height / 2);
    characterX += characterWidths[index] + characterGap;
  });
  const pixels = context.getImageData(0, 0, offscreen.width, offscreen.height).data;
  const targets = [];
  const step = Math.max(3, Math.floor(fontSize / 22));

  for (let y = 0; y < offscreen.height; y += step) {
    for (let x = 0; x < offscreen.width; x += step) {
      if (pixels[(y * offscreen.width + x) * 4 + 3] > 90) targets.push({ x, y });
    }
  }
  return targets;
}

function createStars() {
  const width = starCanvas.clientWidth;
  const height = starCanvas.clientHeight;
  for (let index = 0; index < starCount; index += 1) {
    const targetIndex = titleTargets.length ? Math.floor((index / starCount) * titleTargets.length) : 0;
    const target = titleTargets[targetIndex] || { x: width / 2, y: height / 2 };
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      targetX: width / 2 - titleCanvas.clientWidth / 2 + target.x,
      targetY: height / 2 - titleCanvas.clientHeight / 2 + target.y,
      size: Math.random() * 1.8 + 0.45,
      delay: Math.random() * 1300,
      speed: Math.random() * 0.018 + 0.012,
      drift: Math.random() * Math.PI * 2,
      hue: Math.random() > 0.82 ? 205 : 0,
    });
  }
}

function drawStars(now) {
  const width = starCanvas.clientWidth;
  const height = starCanvas.clientHeight;
  const elapsed = now - animationStart;
  const formed = document.querySelector(".page-shell").classList.contains("is-formed");
  starContext.clearRect(0, 0, width, height);
  titleContext.clearRect(0, 0, titleCanvas.clientWidth, titleCanvas.clientHeight);
  starContext.fillStyle = "rgba(255, 255, 255, 0.035)";
  starContext.fillRect(0, 0, width, height);

  stars.forEach((star) => {
    const progress = reducedMotion ? 1 : Math.min(1, Math.max(0, (elapsed - star.delay) / 3200));
    const eased = progress * progress * (3 - 2 * progress);
    const driftX = Math.sin(now * 0.0007 + star.drift) * (1 - eased) * 18;
    const driftY = Math.cos(now * 0.0005 + star.drift) * (1 - eased) * 12;
    const x = star.x + (star.targetX - star.x) * eased + driftX;
    const y = star.y + (star.targetY - star.y) * eased + driftY;
    const pulse = 0.7 + Math.sin(now * 0.002 + star.drift) * 0.3;
    const alpha = 0.35 + eased * 0.65;
    starContext.beginPath();
    starContext.fillStyle = formed
      ? `rgba(212, 175, 55, ${alpha * pulse})`
      : star.hue
        ? `rgba(166, 214, 255, ${alpha * pulse})`
        : `rgba(255, 255, 255, ${alpha * pulse})`;
    starContext.shadowBlur = eased > 0.65 ? 8 : 2;
    starContext.shadowColor = formed ? "#D4AF37" : star.hue ? "#8ccaff" : "#ffffff";
    starContext.arc(x, y, star.size * (0.8 + eased * 0.7), 0, Math.PI * 2);
    starContext.fill();
  });
  starContext.shadowBlur = 0;
  if (formed) drawSolidTitle(now);
  if (!reducedMotion) requestAnimationFrame(drawStars);
}

let coupleNames = { brideName: 'Y', groomName: 'A' };

async function refreshCoupleNamesFromServer() {
  const serverUrl = window.location.protocol === 'file:' ? 'http://localhost:3000/api/settings' : '/api/settings';

  try {
    const response = await fetch(serverUrl);
    if (!response.ok) return;

    const settings = await response.json();
    if (!settings || typeof settings !== 'object') return;

    coupleNames = {
      brideName: settings.brideName || 'Y',
      groomName: settings.groomName || 'A'
    };
    resizeCanvas();
  } catch (error) {
    console.warn('No se pudieron cargar los nombres desde el servidor.', error);
  }
}

function drawSolidTitle(now) {
  const bounds = titleCanvas.getBoundingClientRect();
  const fontSize = Math.min(bounds.width * 0.3, bounds.height * 0.92);
  const progress = reducedMotion ? 1 : Math.min(1, (now - formedAt) / 1800);
  const eased = progress * progress * (3 - 2 * progress);
  const shadowOffset = -22 * eased;
  const { brideName, groomName } = coupleNames;
  const initials = `${(brideName || 'Y').charAt(0).toUpperCase()} & ${(groomName || 'A').charAt(0).toUpperCase()}`;
  const context = titleContext;
  context.font = `700 ${fontSize}px "Bodoni 72", Didot, Georgia, serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.globalAlpha = eased;
  context.shadowColor = `rgba(78, 38, 10, ${0.7 * eased})`;
  context.shadowBlur = 4 + 16 * eased;
  context.shadowOffsetX = shadowOffset;
  context.shadowOffsetY = 10 * eased;
  context.fillStyle = "#f3d477";
  context.fillText(initials, bounds.width / 2, bounds.height / 2);
  context.globalAlpha = 1;
  context.shadowColor = "transparent";
  context.shadowBlur = 0;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
}

function startExperience() {
  resizeCanvas();
  createStars();
  drawStars(animationStart);
  window.setTimeout(() => {
    formedAt = performance.now();
    document.querySelector(".page-shell").classList.add("is-formed");
    invitationButton.classList.add("show");
  }, reducedMotion ? 100 : 4550);
}

window.addEventListener("resize", resizeCanvas);
invitationButton.addEventListener("click", () => {
  window.location.href = "invitacion.html";
});

window.addEventListener("load", async () => {
  await refreshCoupleNamesFromServer();
  startExperience();
}, { once: true });
