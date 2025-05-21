document.addEventListener("DOMContentLoaded", () => {
  // Game constants
  const BOARD_SIZE = 4
  const NUM_PITS = 3

  // Game elements
  const gameBoard = document.getElementById("game-board")
  const scoreElement = document.getElementById("score")
  const arrowsElement = document.getElementById("arrows")
  const statusElement = document.getElementById("status")
  const messageText = document.getElementById("message-text")

  // Control buttons
  const btnUp = document.getElementById("btn-up")
  const btnDown = document.getElementById("btn-down")
  const btnLeft = document.getElementById("btn-left")
  const btnRight = document.getElementById("btn-right")
  const btnShoot = document.getElementById("btn-shoot")
  const btnRestart = document.getElementById("btn-restart")

  // Game state
  let gameState = {
    board: [],
    playerPosition: { x: 0, y: 3 }, // Bottom left
    wumpusPosition: null,
    goldPosition: null,
    pitPositions: [],
    visitedCells: new Set(),
    hasArrow: true,
    hasGold: false,
    score: 0,
    gameOver: false,
  }

  // Initialize the game
  function initGame() {
    // Reset game state
    gameState = {
      board: Array(BOARD_SIZE)
        .fill()
        .map(() => Array(BOARD_SIZE).fill(null)),
      playerPosition: { x: 0, y: 3 }, // Bottom left
      wumpusPosition: null,
      goldPosition: null,
      pitPositions: [],
      visitedCells: new Set("0,3"), // Start position is visited
      hasArrow: true,
      hasGold: false,
      score: 0,
      gameOver: false,
    }

    // Place Wumpus (not in start position)
    do {
      gameState.wumpusPosition = {
        x: Math.floor(Math.random() * BOARD_SIZE),
        y: Math.floor(Math.random() * BOARD_SIZE),
      }
    } while (isStartPosition(gameState.wumpusPosition))

    // Place Gold (not in start position or Wumpus position)
    do {
      gameState.goldPosition = {
        x: Math.floor(Math.random() * BOARD_SIZE),
        y: Math.floor(Math.random() * BOARD_SIZE),
      }
    } while (
      isStartPosition(gameState.goldPosition) ||
      isSamePosition(gameState.goldPosition, gameState.wumpusPosition)
    )

    // Place Pits (not in start position, Wumpus position, or Gold position)
    for (let i = 0; i < NUM_PITS; i++) {
      let pitPosition
      do {
        pitPosition = {
          x: Math.floor(Math.random() * BOARD_SIZE),
          y: Math.floor(Math.random() * BOARD_SIZE),
        }
      } while (
        isStartPosition(pitPosition) ||
        isSamePosition(pitPosition, gameState.wumpusPosition) ||
        isSamePosition(pitPosition, gameState.goldPosition) ||
        gameState.pitPositions.some((pit) => isSamePosition(pit, pitPosition))
      )
      gameState.pitPositions.push(pitPosition)
    }

    // Update UI
    updateGameBoard()
    updateStats()
    messageText.textContent = "Welcome to Wumpus World! Use the controls to navigate."
    statusElement.textContent = "Exploring"
  }

  // Helper function to check if a position is the start position
  function isStartPosition(position) {
    return position.x === 0 && position.y === 3
  }

  // Helper function to check if two positions are the same
  function isSamePosition(pos1, pos2) {
    return pos1.x === pos2.x && pos1.y === pos2.y
  }

  // Create the game board UI
  function createGameBoard() {
    gameBoard.innerHTML = ""
    gameBoard.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, 1fr)`
    gameBoard.style.gridTemplateRows = `repeat(${BOARD_SIZE}, 1fr)`

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const cell = document.createElement("div")
        cell.classList.add("cell")

        // Checkerboard pattern
        if ((x + y) % 2 === 0) {
          cell.classList.add("cell-light")
        } else {
          cell.classList.add("cell-dark")
        }

        cell.dataset.x = x
        cell.dataset.y = y

        const cellContent = document.createElement("div")
        cellContent.classList.add("cell-content")
        cell.appendChild(cellContent)

        gameBoard.appendChild(cell)
      }
    }
  }

  // Update the game board based on current state
  function updateGameBoard() {
    // Clear all cell contents
    document.querySelectorAll(".cell-content").forEach((content) => {
      content.innerHTML = ""
      content.parentElement.classList.remove("current", "visited")
    })

    // Mark visited cells
    gameState.visitedCells.forEach((posStr) => {
      const [x, y] = posStr.split(",").map(Number)
      const cell = getCellElement(x, y)
      if (cell) {
        cell.classList.add("visited")
      }
    })

    // Mark current position
    const currentCell = getCellElement(gameState.playerPosition.x, gameState.playerPosition.y)
    if (currentCell) {
      currentCell.classList.add("current")

      // Add player to current cell
      const cellContent = currentCell.querySelector(".cell-content")
      const playerElement = document.createElement("div")
      playerElement.classList.add("player")
      cellContent.appendChild(playerElement)

      // Check for perceptions
      const perceptions = getPerceptions()

      if (perceptions.breeze) {
        const breezeElement = document.createElement("div")
        breezeElement.classList.add("breeze")
        cellContent.appendChild(breezeElement)
      }

      if (perceptions.stench) {
        const stenchElement = document.createElement("div")
        stenchElement.classList.add("stench")
        cellContent.appendChild(stenchElement)
      }

      // Check for game over conditions
      if (isSamePosition(gameState.playerPosition, gameState.wumpusPosition)) {
        endGame(false, "You were eaten by the Wumpus!")

        // Show the Wumpus
        const wumpusElement = document.createElement("div")
        wumpusElement.classList.add("wumpus")
        cellContent.appendChild(wumpusElement)
      } else if (gameState.pitPositions.some((pit) => isSamePosition(pit, gameState.playerPosition))) {
        endGame(false, "You fell into a pit!")

        // Show the pit
        const pitElement = document.createElement("div")
        pitElement.classList.add("pit")
        cellContent.appendChild(pitElement)
      } else if (isSamePosition(gameState.playerPosition, gameState.goldPosition) && !gameState.hasGold) {
        gameState.hasGold = true
        gameState.score += 1000
        updateStats()
        messageText.textContent = "You found the gold! Now find your way back to the start to win."

        // Show the gold
        const goldElement = document.createElement("div")
        goldElement.classList.add("gold")
        cellContent.appendChild(goldElement)
      } else if (gameState.hasGold && isStartPosition(gameState.playerPosition)) {
        endGame(true, "Congratulations! You escaped with the gold!")
      }
    }
  }

  // Get perceptions at current position
  function getPerceptions() {
    const perceptions = {
      breeze: false,
      stench: false,
    }

    // Check for breeze (adjacent to pit)
    perceptions.breeze = gameState.pitPositions.some((pit) => isAdjacent(gameState.playerPosition, pit))

    // Check for stench (adjacent to Wumpus)
    perceptions.stench = isAdjacent(gameState.playerPosition, gameState.wumpusPosition)

    return perceptions
  }

  // Check if two positions are adjacent
  function isAdjacent(pos1, pos2) {
    const dx = Math.abs(pos1.x - pos2.x)
    const dy = Math.abs(pos1.y - pos2.y)
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1)
  }

  // Get cell element by coordinates
  function getCellElement(x, y) {
    return document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`)
  }

  // Update game stats
  function updateStats() {
    scoreElement.textContent = gameState.score
    arrowsElement.textContent = gameState.hasArrow ? "1" : "0"
  }

  // Move player in a direction
  function movePlayer(dx, dy) {
    if (gameState.gameOver) return

    const newX = gameState.playerPosition.x + dx
    const newY = gameState.playerPosition.y + dy

    // Check if the move is valid
    if (newX >= 0 && newX < BOARD_SIZE && newY >= 0 && newY < BOARD_SIZE) {
      gameState.playerPosition = { x: newX, y: newY }

      // Mark as visited
      gameState.visitedCells.add(`${newX},${newY}`)

      // Decrease score for each move
      gameState.score -= 1

      updateGameBoard()
      updateStats()
    }
  }

  // Shoot arrow
  function shootArrow() {
    if (gameState.gameOver || !gameState.hasArrow) return

    // Ask for direction
    const direction = prompt("Enter direction to shoot (up, down, left, right):")
    if (!direction) return

    gameState.hasArrow = false
    updateStats()

    let hitWumpus = false
    const { x, y } = gameState.playerPosition

    switch (direction.toLowerCase()) {
      case "up":
        hitWumpus = gameState.wumpusPosition.x === x && gameState.wumpusPosition.y < y
        break
      case "down":
        hitWumpus = gameState.wumpusPosition.x === x && gameState.wumpusPosition.y > y
        break
      case "left":
        hitWumpus = gameState.wumpusPosition.y === y && gameState.wumpusPosition.x < x
        break
      case "right":
        hitWumpus = gameState.wumpusPosition.y === y && gameState.wumpusPosition.x > x
        break
    }

    if (hitWumpus) {
      messageText.textContent = "You killed the Wumpus!"
      gameState.score += 500

      // Remove the Wumpus
      gameState.wumpusPosition = null

      updateStats()
    } else {
      messageText.textContent = "Your arrow missed the Wumpus!"
    }
  }

  // End the game
  function endGame(isWin, message) {
    gameState.gameOver = true
    messageText.textContent = message

    if (isWin) {
      statusElement.textContent = "Victory!"
      // Add bonus for winning
      gameState.score += 500
      updateStats()
    } else {
      statusElement.textContent = "Game Over"
    }
  }

  // Event listeners
  btnUp.addEventListener("click", () => movePlayer(0, -1))
  btnDown.addEventListener("click", () => movePlayer(0, 1))
  btnLeft.addEventListener("click", () => movePlayer(-1, 0))
  btnRight.addEventListener("click", () => movePlayer(1, 0))
  btnShoot.addEventListener("click", shootArrow)
  btnRestart.addEventListener("click", initGame)

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowUp":
        movePlayer(0, -1)
        break
      case "ArrowDown":
        movePlayer(0, 1)
        break
      case "ArrowLeft":
        movePlayer(-1, 0)
        break
      case "ArrowRight":
        movePlayer(1, 0)
        break
      case " ":
        shootArrow()
        break
    }
  })

  // Initialize the game
  createGameBoard()
  initGame()
})
