// Oyuncu atışının X ve Y koordinatları
var shotX = 75,
  shotY = 75;
const PLAYER_SHOT_SPEED = 20; // Oyuncu atışının hızı
var shotIsActive = false; // Oyuncu atışı aktif mi?

// Düşman atışının X ve Y koordinatları
var enemyShotX = 75,
  enemyShotY = 75;
const ENEMY_SHOT_SPEED = 12; // Düşman atışının hızı
var enemyShotIsActive = false; // Düşman atışı aktif mi?

// Uzaylıların genel özellikleri
const ALIEN_W = 80; // Uzaylı genişliği
const ALIEN_H = 35; // Uzaylı yüksekliği
const ALIEN_SPACING_W = 30; // Uzaylılar arası boşluk genişliği
const ALIEN_SPACING_H = 10; // Uzaylılar arası boşluk yüksekliği
const ALIEN_COLS = 7; // Uzaylı sütun sayısı
const ALIEN_ROWS = 7; // Uzaylı satır sayısı
var alienGrid = new Array(ALIEN_COLS * ALIEN_ROWS); // Uzaylıların grid'i
var aliensLeft; // Kullanılmayan uzaylılar

// Uzaylıların hareketi için gerekli değişkenler
var swarmOffsetX = 0;
var swarmOffsetY = 0;
var swarmMoveDir = 1; // Uzaylıların hareket yönü (1: sağa, -1: sola)
var swarmLowPopulationSpeedBoost = 1.0; // Uzaylı hızındaki artış miktarı
var swarmGroupWidth = 0; // Uzaylı grubunun genişliği
var swarmGroupLeftMargin = 0; // Uzaylı grubunun sol kenar boşluğu
var swarmGroupLowest = 0; // Uzaylı grubunun en alt sınırı
const SWARM_ADVANCE_JUMP = 15; // Uzaylıların aşağı inme miktarı
const ALIEN_POPULATION_BOOST_THRESHOLD = 25; // Uzaylı popülasyonu artış eşiği
const ALIEN_BOOST_MULT = 0.4; // Uzaylı hızındaki artışın çarpanı

// Oyuncu özellikleri
const PLAYER_WIDTH = 40; // Oyuncu genişliği
const PLAYER_THICKNESS = 20; // Oyuncu kalınlığı
const PLAYER_Y = 530; // Oyuncunun Y koordinatı
var playerX = 400; // Oyuncunun X koordinatı

var canvas, canvasContext;

// Fare pozisyonunu hesaplar
function calculateMousePos(evt) {
  var rect = canvas.getBoundingClientRect(),
    root = document.documentElement;

  var mouseX = evt.clientX - rect.left - root.scrollLeft;
  var mouseY = evt.clientY - rect.top - root.scrollTop;
  return {
    x: mouseX,
    y: mouseY,
  };
}

// Verilen satır ve sütundaki uzaylının dizinini hesaplar
function alienTileToIndex(tileCol, tileRow) {
  return tileCol + ALIEN_COLS * tileRow;
}

// Belirtilen koordinatta uzaylı var mı kontrol eder
function isAlienAtTileCoord(alienTileCol, alienTileRow) {
  var alienIndex = alienTileToIndex(alienTileCol, alienTileRow);
  return alienGrid[alienIndex] == 1;
}

// Verilen koordinattaki pikselin uzaylı üzerinde olup olmadığını kontrol eder
function pixelOnAlienCheck(whatX, whatY) {
  var shotPosInTileX = Math.floor(whatX - swarmOffsetX) % ALIEN_W;
  var shotPosInTileY = Math.floor(whatY - swarmOffsetY) % ALIEN_H;

  if (
    shotPosInTileX > ALIEN_W - ALIEN_SPACING_W ||
    shotPosInTileY > ALIEN_H - ALIEN_SPACING_H
  ) {
    return false;
  }

  var tileCol = (whatX - swarmOffsetX) / ALIEN_W;
  var tileRow = (whatY - swarmOffsetY) / ALIEN_H;

  tileCol = Math.floor(tileCol);
  tileRow = Math.floor(tileRow);

  if (
    tileCol < 0 ||
    tileCol >= ALIEN_COLS ||
    tileRow < 0 ||
    tileRow >= ALIEN_ROWS
  ) {
    return false;
  }

  var alienIndex = alienTileToIndex(tileCol, tileRow);

  if (alienGrid[alienIndex] == 1) {
    // Atış bu uzaylıya isabet etti
    alienGrid[alienIndex] = 0;
    aliensLeft--;
    shotIsActive = false;

    if (aliensLeft == 0) {
      resetGame();
    } else {
      if (aliensLeft < ALIEN_POPULATION_BOOST_THRESHOLD) {
        swarmLowPopulationSpeedBoost =
          1.0 +
          (ALIEN_POPULATION_BOOST_THRESHOLD - aliensLeft) * ALIEN_BOOST_MULT;
      }

      recomputeSwarmGroupWidth();
    }
  }
}

// Uzaylı grubunun genişliğini yeniden hesaplar
function recomputeSwarmGroupWidth() {
  var rightMostCol = 0;
  for (var eachRow = 0; eachRow < ALIEN_ROWS; eachRow++) {
    for (var eachCol = ALIEN_COLS - 1; eachCol > rightMostCol; eachCol--) {
      var alienIndex = alienTileToIndex(eachCol, eachRow);
      if (alienGrid[alienIndex] == 1) {
        rightMostCol = eachCol;
        break;
      }
    }
  }
  swarmGroupWidth = (rightMostCol + 1) * ALIEN_W - ALIEN_SPACING_W;

  var leftMostCol = ALIEN_COLS - 1;
  for (var eachRow = 0; eachRow < ALIEN_ROWS; eachRow++) {
    for (var eachCol = 0; eachCol < leftMostCol; eachCol++) {
      var alienIndex = alienTileToIndex(eachCol, eachRow);
      if (alienGrid[alienIndex] == 1) {
        leftMostCol = eachCol;
        break;
      }
    }
  }
  swarmGroupLeftMargin = leftMostCol * ALIEN_W;

  var bottomMostRow = 0;
  for (var eachCol = 0; eachCol < ALIEN_COLS; eachCol++) {
    for (var eachRow = ALIEN_ROWS - 1; eachRow > bottomMostRow; eachRow--) {
      var alienIndex = alienTileToIndex(eachCol, eachRow);
      if (alienGrid[alienIndex] == 1) {
        bottomMostRow = eachRow;
        break;
      }
    }
  }
  swarmGroupLowest = (bottomMostRow + 1) * ALIEN_H - ALIEN_SPACING_H;
}

// Uzaylıları sıfırlar
function resetAliens() {
  aliensLeft = 0;
  swarmLowPopulationSpeedBoost = 1.0;
  swarmOffsetX = 0;
  swarmOffsetY = 0;
  swarmMoveDir = 1;

  for (var eachRow = 0; eachRow < ALIEN_ROWS; eachRow++) {
    for (var eachCol = 0; eachCol < ALIEN_COLS; eachCol++) {
      var alienIndex = alienTileToIndex(eachCol, eachRow);
      if (eachRow >= 2) {
        alienGrid[alienIndex] = 1;
        aliensLeft++;
      } else {
        alienGrid[alienIndex] = 0;
      }
    }
  }

  recomputeSwarmGroupWidth();
}

// Oyunu sıfırlar
function resetGame() {
  resetAliens();
  shotReset();
}

// Oyuncu atışını yapar
function playerShootIfReloaded() {
  if (shotIsActive == false) {
    shotX = playerX + PLAYER_WIDTH / 2;
    shotY = PLAYER_Y;
    shotIsActive = true;
  }
}

// Oyuncunun üstündeki sütundaki düşman varsa ateş etmeye çalışır
function enemyInColAbovePlayerAttemptToFire() {
  if (enemyShotIsActive) {
    return;
  }

  var tileCol = (playerX + PLAYER_WIDTH / 2 - swarmOffsetX) / ALIEN_W;

  tileCol = Math.floor(tileCol);

  if (tileCol < 0 || tileCol >= ALIEN_COLS) {
    return;
  }

  for (var eachRow = ALIEN_ROWS - 1; eachRow >= 0; eachRow--) {
    var alienIndex = alienTileToIndex(tileCol, eachRow);
    if (alienGrid[alienIndex] == 1) {
      enemyShotX =
        swarmOffsetX + tileCol * ALIEN_W + (ALIEN_W - ALIEN_SPACING_W) * 0.5;
      enemyShotY =
        swarmOffsetY + eachRow * ALIEN_H + (ALIEN_H - ALIEN_SPACING_H) * 0.5;
      enemyShotIsActive = true;
      return;
    }
  }
}

// Fare tıklaması oyun içi ateş etmeyi tetikler
function mousedownHandler(evt) {
  playerShootIfReloaded();
}

// Sayfa yüklendiğinde çalışacak kodlar
window.onload = function () {
  canvas = document.getElementById("gameCanvas");
  canvasContext = canvas.getContext("2d");

  var framesPerSecond = 30;
  setInterval(function () {
    moveEverything();
    drawEverything();
  }, 1000 / framesPerSecond);

  canvas.addEventListener("mousedown", mousedownHandler);

  canvas.addEventListener("mousemove", function (evt) {
    var mousePos = calculateMousePos(evt);
    playerX = mousePos.x - PLAYER_WIDTH / 2;
  });

  resetGame();
};

// Atışı sıfırlar
function shotReset() {
  shotIsActive = false;
  enemyShotIsActive = false;
}

// Oyuncu atışlarının çarpışmalarını kontrol eder
function playerShotCollisionsCheck() {
  pixelOnAlienCheck(shotX, shotY);
  if (shotY < 0) {
    shotIsActive = false;
  }
}

// Düşman atışlarının çarpışmalarını kontrol eder
function enemyShotCollisionsCheck() {
  if (enemyShotY >= PLAYER_Y && enemyShotY <= PLAYER_Y + PLAYER_THICKNESS) {
    if (enemyShotX > playerX && enemyShotX < playerX + PLAYER_WIDTH) {
      resetGame();
    }
  }
  if (enemyShotY > canvas.height) {
    enemyShotIsActive = false;
  }
}

// Uzaylıları hareket ettirir
function moveAliens() {
  swarmOffsetX += swarmMoveDir * swarmLowPopulationSpeedBoost;
  if (swarmMoveDir > 0) {
    if (swarmOffsetX + swarmGroupWidth > canvas.width) {
      swarmMoveDir = -1;
      swarmOffsetY += SWARM_ADVANCE_JUMP;
    }
  }

  if (swarmMoveDir < 0) {
    if (swarmOffsetX + swarmGroupLeftMargin < 0) {
      swarmMoveDir = 1;
      swarmOffsetY += SWARM_ADVANCE_JUMP;
    }
  }

  if (swarmOffsetY + swarmGroupLowest > canvas.height) {
    resetGame();
  }

  if (pixelOnAlienCheck(playerX, PLAYER_Y)) {
    resetGame();
  }
}

// Atışları hareket ettirir
function moveShots() {
  if (shotIsActive) {
    shotY += -PLAYER_SHOT_SPEED;
    playerShotCollisionsCheck();
  }

  if (enemyShotIsActive) {
    enemyShotY += ENEMY_SHOT_SPEED;
    enemyShotCollisionsCheck();
  }
}

// Her şeyi hareket ettirir
function moveEverything() {
  moveAliens();
  enemyInColAbovePlayerAttemptToFire();
  moveShots();
}

// Dikdörtgen çizer
function colorRect(topLeftX, topLeftY, boxWidth, boxHeight, fillColor) {
  canvasContext.fillStyle = fillColor;
  canvasContext.fillRect(topLeftX, topLeftY, boxWidth, boxHeight);
}

// Daire çizer
function colorCircle(centerX, centerY, radius, fillColor) {
  canvasContext.fillStyle = fillColor;
  canvasContext.beginPath();
  canvasContext.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
  canvasContext.fill();
}

// Uzaylıları çizer
function drawAliens() {
  for (var eachCol = 0; eachCol < ALIEN_COLS; eachCol++) {
    for (var eachRow = 0; eachRow < ALIEN_ROWS; eachRow++) {
      if (isAlienAtTileCoord(eachCol, eachRow)) {
        var alienLeftEdgeX = eachCol * ALIEN_W + swarmOffsetX;
        var alienTopEdgeY = eachRow * ALIEN_H + swarmOffsetY;
        colorRect(
          alienLeftEdgeX,
          alienTopEdgeY,
          ALIEN_W - ALIEN_SPACING_W,
          ALIEN_H - ALIEN_SPACING_H,
          "gray"
        );
      }
    }
  }
}

// Atışları çizer
function drawShots() {
  if (shotIsActive) {
    colorRect(shotX - 1, shotY - 4, 3, 12, "white");
  }
  if (enemyShotIsActive) {
    colorRect(enemyShotX - 1, enemyShotY - 4, 2, 9, "red");
  }
}

// Her şeyi çizer
function drawEverything() {
  colorRect(0, 0, canvas.width, canvas.height, "black");

  colorRect(playerX, PLAYER_Y, PLAYER_WIDTH, PLAYER_THICKNESS, "brown");

  drawShots();
  drawAliens();
}

// Başlangıç ekranındaki "Başla" düğmesine tıklanırsa oyunu başlatır
document.getElementById("startButton").addEventListener("click", function () {
  var startMenu = document.getElementById("startMenu");
  startMenu.style.display = "none";
  var canvas = document.getElementById("gameCanvas");
  canvas.style.display = "block";
  resetGame();
});

// Klavyeden tuşa basıldığında olayları dinler

// Atış yapma kontrolleri
document.addEventListener("keydown", function (event) {
  if (event.code === "KeyV" || event.code === "ArrowDown") {
    playerShootIfReloaded();
  }
});

// Oyuncunun hareket kontrolleri
document.addEventListener("keydown", function (event) {
  if (event.code === "KeyC" || event.code === "ArrowLeft") {
    playerX -= 30;
  } else if (event.code === "KeyB" || event.code === "ArrowRight") {
    playerX += 30;
  }
});
