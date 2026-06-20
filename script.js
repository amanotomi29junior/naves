const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayMessage = document.getElementById('overlayMessage');
const restartButton = document.getElementById('restartButton');

const width = canvas.width;
const height = canvas.height;

const ship = {
  x: width / 2,
  y: height - 60,
  radius: 18,
  speed: 6,
  cooldown: 0,
  color: '#3af4ff',
};

const bullets = [];
const enemies = [];
const particles = [];
let score = 0;
let lives = 3;
let stage = 1;
let gameOver = false;
let keys = {};
let lastEnemySpawn = 0;
let enemySpawnInterval = 1300;

const cursor = {
  x: width / 2,
  y: height - 100,
  radius: 14,
  active: false,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function drawShip() {
  ctx.save();
  ctx.fillStyle = ship.color;
  ctx.beginPath();
  ctx.moveTo(ship.x, ship.y - ship.radius);
  ctx.lineTo(ship.x + ship.radius, ship.y + ship.radius);
  ctx.lineTo(ship.x, ship.y + ship.radius * 0.4);
  ctx.lineTo(ship.x - ship.radius, ship.y + ship.radius);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBullet(bullet) {
  ctx.save();
  ctx.fillStyle = bullet.color;
  ctx.fillRect(bullet.x - 2.5, bullet.y - 12, 5, 14);
  ctx.restore();
}

function drawEnemy(enemy) {
  ctx.save();
  ctx.fillStyle = enemy.color;
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParticle(particle) {
  ctx.save();
  ctx.globalAlpha = particle.alpha;
  ctx.fillStyle = particle.color;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function spawnEnemy() {
  const radius = randomBetween(14, 22);
  enemies.push({
    x: randomBetween(radius, width - radius),
    y: -radius,
    radius,
    speed: randomBetween(1.4, 2.4) + stage * 0.12,
    color: '#ff5588',
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: randomBetween(0.01, 0.04),
  });
}

function spawnParticle(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      size: randomBetween(1.2, 3.2),
      alpha: 1,
      color,
      vx: randomBetween(-2.5, 2.5),
      vy: randomBetween(-2.5, 2.5),
      decay: randomBetween(0.03, 0.07),
    });
  }
}

function updateEntities() {
  if (cursor.active) {
    ship.x = clamp(cursor.x, ship.radius, width - ship.radius);
    ship.y = clamp(cursor.y, ship.radius, height - ship.radius - 20);
  } else {
    if (keys.ArrowLeft) ship.x -= ship.speed;
    if (keys.ArrowRight) ship.x += ship.speed;
    if (keys.ArrowUp) ship.y -= ship.speed;
    if (keys.ArrowDown) ship.y += ship.speed;
  }

  ship.x = clamp(ship.x, ship.radius, width - ship.radius);
  ship.y = clamp(ship.y, ship.radius, height - ship.radius - 20);

  if (ship.cooldown > 0) ship.cooldown -= 1;
  if (keys.Space && ship.cooldown <= 0 && !gameOver) {
    bullets.push({
      x: ship.x,
      y: ship.y - ship.radius - 6,
      vy: -9,
      color: '#ffffff',
    });
    ship.cooldown = 14;
  }

  bullets.forEach((bullet, index) => {
    bullet.y += bullet.vy;
    if (bullet.y < -20) bullets.splice(index, 1);
  });

  enemies.forEach((enemy, index) => {
    enemy.y += enemy.speed;
    enemy.x += Math.cos(enemy.wobble) * 1.7;
    enemy.wobble += enemy.wobbleSpeed;

    if (enemy.y - enemy.radius > height) {
      enemies.splice(index, 1);
      lives -= 1;
      spawnParticle(enemy.x, height - 20, '#ff5588', 18);
    }
  });

  bullets.forEach((bullet, bulletIndex) => {
    enemies.forEach((enemy, enemyIndex) => {
      const dx = bullet.x - enemy.x;
      const dy = bullet.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < enemy.radius + 4) {
        bullets.splice(bulletIndex, 1);
        enemies.splice(enemyIndex, 1);
        score += 10;
        spawnParticle(enemy.x, enemy.y, '#ffcc88', 18);
      }
    });
  });

  enemies.forEach((enemy, index) => {
    const dx = ship.x - enemy.x;
    const dy = ship.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < ship.radius + enemy.radius * 0.8) {
      enemies.splice(index, 1);
      lives -= 1;
      spawnParticle(ship.x, ship.y, '#3af4ff', 24);
    }
  });

  particles.forEach((particle, index) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.alpha -= particle.decay;
    if (particle.alpha <= 0) particles.splice(index, 1);
  });

  if (score > stage * 150) {
    stage += 1;
    enemySpawnInterval = Math.max(650, enemySpawnInterval - 50);
  }

  if (!gameOver && performance.now() - lastEnemySpawn > enemySpawnInterval) {
    spawnEnemy();
    lastEnemySpawn = performance.now();
  }

  if (lives <= 0) {
    endGame();
  }
}

function drawBackground() {
  ctx.clearRect(0, 0, width, height);
  const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, height);
  gradient.addColorStop(0, 'rgba(7, 20, 38, 0.35)');
  gradient.addColorStop(1, '#02030c');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 50; i++) {
    const x = (i * 67) % width;
    const y = ((i * 37) % height) + (performance.now() * 0.01);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(x, y % height, 2, 12);
  }
}

function drawCursor() {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cursor.x, cursor.y, cursor.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cursor.x - cursor.radius - 6, cursor.y);
  ctx.lineTo(cursor.x + cursor.radius + 6, cursor.y);
  ctx.moveTo(cursor.x, cursor.y - cursor.radius - 6);
  ctx.lineTo(cursor.x, cursor.y + cursor.radius + 6);
  ctx.stroke();
  ctx.restore();
}

function draw() {
  drawBackground();
  particles.forEach(drawParticle);
  drawShip();
  bullets.forEach(drawBullet);
  enemies.forEach(drawEnemy);
  if (cursor.active) drawCursor();
}

function updateHud() {
  scoreElement.textContent = `Puntaje: ${score}`;
  livesElement.textContent = `Vidas: ${lives}`;
}

function endGame() {
  gameOver = true;
  overlayTitle.textContent = '¡Game Over!';
  overlayMessage.textContent = `Puntaje final: ${score}. Presiona Enter o haz clic en Reiniciar.`;
  overlay.classList.remove('hidden');
}

function restart() {
  score = 0;
  lives = 3;
  stage = 1;
  gameOver = false;
  bullets.length = 0;
  enemies.length = 0;
  particles.length = 0;
  ship.x = width / 2;
  ship.y = height - 60;
  ship.cooldown = 0;
  enemySpawnInterval = 1300;
  lastEnemySpawn = performance.now();
  overlay.classList.add('hidden');
}

function loop() {
  if (!gameOver) {
    updateEntities();
  }
  draw();
  updateHud();
  requestAnimationFrame(loop);
}

function updateCursorPosition(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  cursor.x = ((clientX - rect.left) / rect.width) * width;
  cursor.y = ((clientY - rect.top) / rect.height) * height;
}

canvas.addEventListener('pointermove', (event) => {
  if (gameOver) return;
  cursor.active = true;
  updateCursorPosition(event.clientX, event.clientY);
});

canvas.addEventListener('pointerdown', (event) => {
  if (gameOver) return;
  cursor.active = true;
  updateCursorPosition(event.clientX, event.clientY);
  if (ship.cooldown <= 0) {
    bullets.push({
      x: ship.x,
      y: ship.y - ship.radius - 6,
      vy: -9,
      color: '#ffffff',
    });
    ship.cooldown = 14;
  }
});

canvas.addEventListener('pointerup', () => {
  cursor.active = false;
});

canvas.addEventListener('pointerleave', () => {
  cursor.active = false;
});

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') event.preventDefault();
  keys[event.code] = true;

  if (gameOver && event.code === 'Enter') {
    restart();
  }
});

window.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

restartButton.addEventListener('click', restart);
restart();
requestAnimationFrame(loop);
