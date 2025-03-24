// DungeonDaily - A daily roguelike puzzle game
// Each day has the same dungeon for all players based on the date

// Game constants
const GRID_SIZE = 10;
const INITIAL_HEALTH = 3;
const ENTITIES = {
  EMPTY: '.',
  WALL: '#',
  PLAYER: '@',
  ENEMY: 'E',
  HEALTH: '+',
  EXIT: 'X',
  TRAP: '^',
  COIN: '$',
  EXPLORED: ' '
};

const ENTITY_SYMBOLS = {
  [ENTITIES.EMPTY]: '·',
  [ENTITIES.WALL]: '■',
  [ENTITIES.PLAYER]: '@',
  [ENTITIES.ENEMY]: '👹',
  [ENTITIES.HEALTH]: '❤️',
  [ENTITIES.EXIT]: '🚪',
  [ENTITIES.TRAP]: '⚡',
  [ENTITIES.COIN]: '💰',
  [ENTITIES.EXPLORED]: ' '
};

const ENTITY_TITLES = {
  [ENTITIES.EMPTY]: 'Empty space',
  [ENTITIES.WALL]: 'Wall',
  [ENTITIES.PLAYER]: 'Player',
  [ENTITIES.ENEMY]: 'Enemy',
  [ENTITIES.HEALTH]: 'Health potion',
  [ENTITIES.EXIT]: 'Exit door',
  [ENTITIES.TRAP]: 'Trap',
  [ENTITIES.COIN]: 'Coin',
  [ENTITIES.EXPLORED]: 'Explored space'
};

// Game state
let gameState = {
  grid: [],
  playerPosition: { x: 0, y: 0 },
  health: INITIAL_HEALTH,
  moves: 0,
  score: 0,
  gameOver: false,
  victory: false,
  enemies: [],
  seed: 0
};

// DOM elements
const gameBoard = document.getElementById('game-board');
const healthValue = document.getElementById('health-value');
const movesValue = document.getElementById('moves-value');
const scoreValue = document.getElementById('score-value');
const messageEl = document.getElementById('message');
const gameOverModal = document.getElementById('game-over');
const gameOverTitle = document.getElementById('game-over-title');
const gameOverMessage = document.getElementById('game-over-message');
const finalScore = document.getElementById('final-score');
const finalMoves = document.getElementById('final-moves');
const shareBtn = document.getElementById('share-btn');
const shareText = document.getElementById('share-text');

// Control buttons
const btnUp = document.getElementById('btn-up');
const btnDown = document.getElementById('btn-down');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');

// Seeded random number generator
function seededRandom(seed) {
  let state = seed;
  return function() {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

// Initialize game based on the current date
function initGame() {
  // Create a seed from today's date
  const today = new Date();
  const dateString = `${today.getFullYear()}${today.getMonth()}${today.getDate()}`;
  gameState.seed = parseInt(dateString, 10);

  const random = seededRandom(gameState.seed);

  // Reset game state
  gameState.grid = [];
  gameState.health = INITIAL_HEALTH;
  gameState.moves = 0;
  gameState.score = 0;
  gameState.gameOver = false;
  gameState.victory = false;
  gameState.enemies = [];

  // Generate empty grid
  for (let y = 0; y < GRID_SIZE; y++) {
    gameState.grid[y] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      gameState.grid[y][x] = ENTITIES.EMPTY;
    }
  }

  // Add walls (maze generation with cellular automata)
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      // Add walls around the edges
      if (x === 0 || y === 0 || x === GRID_SIZE - 1 || y === GRID_SIZE - 1) {
        gameState.grid[y][x] = ENTITIES.WALL;
        continue;
      }

      // Random walls (about 30%)
      if (random() < 0.3) {
        gameState.grid[y][x] = ENTITIES.WALL;
      }
    }
  }

  // Smooth the maze with 3 iterations of cellular automata
  for (let i = 0; i < 3; i++) {
    const newGrid = JSON.parse(JSON.stringify(gameState.grid));

    for (let y = 1; y < GRID_SIZE - 1; y++) {
      for (let x = 1; x < GRID_SIZE - 1; x++) {
        const wallCount = countNeighborWalls(x, y);

        if (gameState.grid[y][x] === ENTITIES.WALL) {
          // Walls stay if they have 4+ neighbors, otherwise become empty
          newGrid[y][x] = wallCount >= 4 ? ENTITIES.WALL : ENTITIES.EMPTY;
        } else {
          // Empty becomes wall if 5+ neighbors are walls
          newGrid[y][x] = wallCount >= 5 ? ENTITIES.WALL : ENTITIES.EMPTY;
        }
      }
    }

    gameState.grid = newGrid;
  }

  // Place player in top left area (finding first available space)
  let playerPlaced = false;
  for (let y = 1; y < 4; y++) {
    for (let x = 1; x < 4; x++) {
      if (!playerPlaced && gameState.grid[y][x] === ENTITIES.EMPTY) {
        gameState.grid[y][x] = ENTITIES.PLAYER;
        gameState.playerPosition = { x, y };
        playerPlaced = true;
        break;
      }
    }
    if (playerPlaced) break;
  }

  // If we couldn't place the player in the top left, just find any empty spot
  if (!playerPlaced) {
    for (let y = 1; y < GRID_SIZE - 1; y++) {
      for (let x = 1; x < GRID_SIZE - 1; x++) {
        if (!playerPlaced && gameState.grid[y][x] === ENTITIES.EMPTY) {
          gameState.grid[y][x] = ENTITIES.PLAYER;
          gameState.playerPosition = { x, y };
          playerPlaced = true;
          break;
        }
      }
      if (playerPlaced) break;
    }
  }

  // Place exit in bottom right area
  let exitPlaced = false;
  for (let y = GRID_SIZE - 4; y < GRID_SIZE - 1; y++) {
    for (let x = GRID_SIZE - 4; x < GRID_SIZE - 1; x++) {
      if (!exitPlaced && gameState.grid[y][x] === ENTITIES.EMPTY) {
        gameState.grid[y][x] = ENTITIES.EXIT;
        exitPlaced = true;
        break;
      }
    }
    if (exitPlaced) break;
  }

  // If exit couldn't be placed in bottom right, find any spot
  if (!exitPlaced) {
    for (let y = GRID_SIZE - 2; y > 0; y--) {
      for (let x = GRID_SIZE - 2; x > 0; x--) {
        if (!exitPlaced && gameState.grid[y][x] === ENTITIES.EMPTY) {
          gameState.grid[y][x] = ENTITIES.EXIT;
          exitPlaced = true;
          break;
        }
      }
      if (exitPlaced) break;
    }
  }

  // Add enemies (3-5)
  const enemyCount = Math.floor(random() * 3) + 3;
  let enemiesAdded = 0;

  while (enemiesAdded < enemyCount) {
    const x = Math.floor(random() * (GRID_SIZE - 2)) + 1;
    const y = Math.floor(random() * (GRID_SIZE - 2)) + 1;

    if (gameState.grid[y][x] === ENTITIES.EMPTY) {
      gameState.grid[y][x] = ENTITIES.ENEMY;
      gameState.enemies.push({ x, y });
      enemiesAdded++;
    }
  }

  // Add health potions (2-3)
  const healthCount = Math.floor(random() * 2) + 2;
  let healthAdded = 0;

  while (healthAdded < healthCount) {
    const x = Math.floor(random() * (GRID_SIZE - 2)) + 1;
    const y = Math.floor(random() * (GRID_SIZE - 2)) + 1;

    if (gameState.grid[y][x] === ENTITIES.EMPTY) {
      gameState.grid[y][x] = ENTITIES.HEALTH;
      healthAdded++;
    }
  }

  // Add traps (3-5)
  const trapCount = Math.floor(random() * 3) + 3;
  let trapsAdded = 0;

  while (trapsAdded < trapCount) {
    const x = Math.floor(random() * (GRID_SIZE - 2)) + 1;
    const y = Math.floor(random() * (GRID_SIZE - 2)) + 1;

    if (gameState.grid[y][x] === ENTITIES.EMPTY) {
      gameState.grid[y][x] = ENTITIES.TRAP;
      trapsAdded++;
    }
  }

  // Add coins (5-8)
  const coinCount = Math.floor(random() * 4) + 5;
  let coinsAdded = 0;

  while (coinsAdded < coinCount) {
    const x = Math.floor(random() * (GRID_SIZE - 2)) + 1;
    const y = Math.floor(random() * (GRID_SIZE - 2)) + 1;

    if (gameState.grid[y][x] === ENTITIES.EMPTY) {
      gameState.grid[y][x] = ENTITIES.COIN;
      coinsAdded++;
    }
  }

  // Ensure the dungeon is solvable by running a pathfinding algorithm
  ensureSolvable();

  // Render initial game state
  renderGame();
  updateStats();
  showMessage(`Welcome to today's dungeon!\nFind the exit door 🚪. Watch out for enemies ${ENTITY_SYMBOLS[ENTITIES.ENEMY]} and traps ${ENTITY_SYMBOLS[ENTITIES.TRAP]}.`);
}

// Helper function to count neighboring walls
function countNeighborWalls(x, y) {
  let count = 0;

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;

      const nx = x + dx;
      const ny = y + dy;

      if (
        nx >= 0 && nx < GRID_SIZE &&
        ny >= 0 && ny < GRID_SIZE &&
        gameState.grid[ny][nx] === ENTITIES.WALL
      ) {
        count++;
      }
    }
  }

  return count;
}

// Ensure the dungeon is solvable using A* pathfinding
function ensureSolvable() {
  // Find exit position
  let exitPos = { x: 0, y: 0 };
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (gameState.grid[y][x] === ENTITIES.EXIT) {
        exitPos = { x, y };
        break;
      }
    }
  }

  // Run A* pathfinding
  const path = findPath(gameState.playerPosition, exitPos);

  // If no path is found, create one
  if (!path) {
    createPath(gameState.playerPosition, exitPos);
  }
}

// Simple A* pathfinding implementation
function findPath(start, end) {
  const openSet = [{
    x: start.x,
    y: start.y,
    g: 0,
    h: manhattan(start, end),
    f: manhattan(start, end),
    parent: null
  }];

  const closedSet = new Set();

  while (openSet.length > 0) {
    // Find node with lowest f score
    let lowestIndex = 0;
    for (let i = 0; i < openSet.length; i++) {
      if (openSet[i].f < openSet[lowestIndex].f) {
        lowestIndex = i;
      }
    }

    const current = openSet[lowestIndex];

    // Check if we reached the end
    if (current.x === end.x && current.y === end.y) {
      // Reconstruct path
      const path = [];
      let temp = current;
      while (temp.parent) {
        path.push({ x: temp.x, y: temp.y });
        temp = temp.parent;
      }
      return path.reverse();
    }

    // Remove current from openSet and add to closedSet
    openSet.splice(lowestIndex, 1);
    closedSet.add(`${current.x},${current.y}`);

    // Check neighbors
    const neighbors = getNeighbors(current);

    for (const neighbor of neighbors) {
      if (closedSet.has(`${neighbor.x},${neighbor.y}`)) {
        continue;
      }

      const tentativeG = current.g + 1;

      const existingNeighborIndex = openSet.findIndex(
        node => node.x === neighbor.x && node.y === neighbor.y
      );

      if (existingNeighborIndex === -1) {
        // Node is not in openSet
        neighbor.g = tentativeG;
        neighbor.h = manhattan({ x: neighbor.x, y: neighbor.y }, end);
        neighbor.f = neighbor.g + neighbor.h;
        neighbor.parent = current;
        openSet.push(neighbor);
      } else if (tentativeG < openSet[existingNeighborIndex].g) {
        // This path is better
        openSet[existingNeighborIndex].g = tentativeG;
        openSet[existingNeighborIndex].f = tentativeG + openSet[existingNeighborIndex].h;
        openSet[existingNeighborIndex].parent = current;
      }
    }
  }

  // No path found
  return null;
}

// Get valid neighbors for pathfinding
function getNeighbors(node) {
  const dirs = [
    { x: 0, y: -1 }, // up
    { x: 1, y: 0 },  // right
    { x: 0, y: 1 },  // down
    { x: -1, y: 0 }  // left
  ];

  const neighbors = [];

  for (const dir of dirs) {
    const nx = node.x + dir.x;
    const ny = node.y + dir.y;

    if (
      nx >= 0 && nx < GRID_SIZE &&
      ny >= 0 && ny < GRID_SIZE &&
      gameState.grid[ny][nx] !== ENTITIES.WALL
    ) {
      neighbors.push({ x: nx, y: ny });
    }
  }

  return neighbors;
}

// Calculate Manhattan distance between two points
function manhattan(start, end) {
  return Math.abs(start.x - end.x) + Math.abs(start.y - end.y);
}

// Create a path between two points
function createPath(start, end) {
  // Simple path creation by clearing walls in a straight line
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  // Clear a path horizontally first, then vertically
  for (let x = Math.min(start.x, end.x); x <= Math.max(start.x, end.x); x++) {
    if (gameState.grid[start.y][x] === ENTITIES.WALL) {
      gameState.grid[start.y][x] = ENTITIES.EMPTY;
    }
  }

  for (let y = Math.min(start.y, end.y); y <= Math.max(start.y, end.y); y++) {
    if (gameState.grid[y][end.x] === ENTITIES.WALL) {
      gameState.grid[y][end.x] = ENTITIES.EMPTY;
    }
  }
}

// Render the game board
function renderGame() {
  gameBoard.innerHTML = '';

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = document.createElement('div');
      cell.className = 'cell';

      const entity = gameState.grid[y][x];
      cell.textContent = ENTITY_SYMBOLS[entity];
      cell.title = ENTITY_TITLES[entity];

      // Add appropriate class based on entity type
      switch (entity) {
        case ENTITIES.WALL:
          cell.classList.add('wall');
          break;
        case ENTITIES.PLAYER:
          cell.classList.add('player');
          break;
        case ENTITIES.ENEMY:
          cell.classList.add('enemy');
          break;
        case ENTITIES.HEALTH:
          cell.classList.add('health');
          break;
        case ENTITIES.EXIT:
          cell.classList.add('exit');
          break;
        case ENTITIES.TRAP:
          cell.classList.add('trap');
          break;
        case ENTITIES.COIN:
          cell.classList.add('coin');
          break;
        case ENTITIES.EXPLORED:
          cell.classList.add('explored');
          break;
      }

      gameBoard.appendChild(cell);
    }
  }
}

// Update game statistics
function updateStats() {
  healthValue.textContent = gameState.health;
  movesValue.textContent = gameState.moves;
  scoreValue.textContent = gameState.score;
}

// Show a message to the player
function showMessage(message) {
  messageEl.textContent = message;
}

// Handle player movement
function movePlayer(dx, dy) {
  if (gameState.gameOver) return;

  const newX = gameState.playerPosition.x + dx;
  const newY = gameState.playerPosition.y + dy;

  // Check if move is within bounds
  if (newX < 0 || newX >= GRID_SIZE || newY < 0 || newY >= GRID_SIZE) {
    return;
  }

  const targetCell = gameState.grid[newY][newX];

  // Handle different cell types
  switch (targetCell) {
    case ENTITIES.WALL:
      return; // Can't move into walls

    case ENTITIES.ENEMY:
      gameState.health--;
      if (gameState.health <= 0) {
        gameOver(false);
      }
      break;

    case ENTITIES.HEALTH:
      gameState.health = Math.min(gameState.health + 1, INITIAL_HEALTH);
      break;

    case ENTITIES.TRAP:
      gameState.health--;
      if (gameState.health <= 0) {
        gameOver(false);
      }
      break;

    case ENTITIES.COIN:
      gameState.score += 10;
      break;

    case ENTITIES.EXIT:
      gameOver(true);
      return;
  }

  // Move player
  gameState.grid[gameState.playerPosition.y][gameState.playerPosition.x] = ENTITIES.EXPLORED;
  gameState.grid[newY][newX] = ENTITIES.PLAYER;
  gameState.playerPosition = { x: newX, y: newY };
  gameState.moves++;

  // Move enemies
  moveEnemies();

  // Update display
  renderGame();
  updateStats();
}

// Move enemies towards player
function moveEnemies() {
  for (const enemy of gameState.enemies) {
    const dx = Math.sign(gameState.playerPosition.x - enemy.x);
    const dy = Math.sign(gameState.playerPosition.y - enemy.y);

    // Try to move horizontally first, then vertically
    const newX = enemy.x + dx;
    const newY = enemy.y + dy;

    if (gameState.grid[newY][enemy.x] === ENTITIES.EMPTY) {
      gameState.grid[enemy.y][enemy.x] = ENTITIES.EMPTY;
      gameState.grid[newY][enemy.x] = ENTITIES.ENEMY;
      enemy.y = newY;
    } else if (gameState.grid[enemy.y][newX] === ENTITIES.EMPTY) {
      gameState.grid[enemy.y][enemy.x] = ENTITIES.EMPTY;
      gameState.grid[enemy.y][newX] = ENTITIES.ENEMY;
      enemy.x = newX;
    }
  }
}

// Handle game over
function gameOver(victory) {
  gameState.gameOver = true;
  gameState.victory = victory;

  gameOverTitle.textContent = victory ? 'Victory!' : 'Game Over';
  gameOverMessage.textContent = victory
                              ? 'Congratulations! You found the exit!'
                              : 'Better luck next time!';

  finalScore.textContent = gameState.score;
  finalMoves.textContent = gameState.moves;

  gameOverModal.classList.remove('hidden');
}

// Handle share button click
shareBtn.addEventListener('click', () => {
  const shareText = `DungeonDaily - ${gameState.victory ? 'Victory' : 'Game Over'}\n` +
                    `Score: ${gameState.score}\n` +
                    `Moves: ${gameState.moves}\n` +
                    `Play at: ${window.location.href}`;

  document.getElementById('share-text').textContent = shareText;
  navigator.clipboard.writeText(shareText);
});

// Add swipe controls
document.addEventListener('swipe', (e) => {
    switch (e.detail.direction) {
        case 'up':
            movePlayer(0, -1);
            break;
        case 'down':
            movePlayer(0, 1);
            break;
        case 'left':
            movePlayer(-1, 0);
            break;
        case 'right':
            movePlayer(1, 0);
            break;
    }
});

// Add keyboard controls
document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowUp':
            movePlayer(0, -1);
            break;
        case 'ArrowDown':
            movePlayer(0, 1);
            break;
        case 'ArrowLeft':
            movePlayer(-1, 0);
            break;
        case 'ArrowRight':
            movePlayer(1, 0);
            break;
    }
});

// Initialize the game when the page loads
window.addEventListener('load', initGame);
