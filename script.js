let currentVisibleScreen = document.getElementById("registerScreen");
let boardColumns = 7;
let opponent = "Player2";
let whoRollsDiceFirst = "Blue";
let player1Wins = 0;
let aiWins = 0;

let currentPlayer = whoRollsDiceFirst;
let latestDiceValue = 0;

let pieceWith2AlternativesSelected = false;
let pieceWith2AlternativesId = null;

let numbersToggled = false;


const server = "";

const usernameField = document.getElementById("usernameInput");
const passwordField = document.getElementById("passwordInput");


let nick;
let password;

let opponentNick;

let bluePlayerNick;
let redPlayerNick;

let gameID;
let gameIsSetUp = false;
let cellWith2Choices = null;

let storageHasToBeUpdated = false;


class Piece {
    constructor(position, owner) {
        this.position = position;
        this.state = "neverMoved"; // "neverMoved", "neverBeenInFourthRow", "hasBeenInFourthRow"
        this.owner = owner;        
    }

    getState() {
        return this.state;
    }

    setState(state) {
        this.state = state;
    }

    getPosition() {
        return this.position;
    }

    setPosition(position) {
        let positionRow = Math.floor(position / boardColumns) + 1;
        this.position = position;

        if (this.state != "hasBeenInFourthRow") {
            if (this.state == "neverMoved") {
                this.state = "neverBeenInFourthRow";
            } else if (positionRow == 4 && this.owner == "Blue") {
                this.state = "hasBeenInFourthRow";
            } else if (positionRow == 1 && this.owner == "Red") {
                this.state = "hasBeenInFourthRow";
            }
        }
    }

    getOwner() {
        return this.owner;
    }

    getBorderColorBasedOnState() {
        if (this.owner == "Blue") {
            if (this.state == "neverMoved") {
                return "3px solid rgba(181, 198, 252, 1)";
            } else if (this.state == "neverBeenInFourthRow") {
                return "3px solid rgba(85, 123, 247, 1)";
            }   else {
                return "3px solid rgba(0, 38, 163, 1)";
            }
        } else {
            if (this.state == "neverMoved") {
                return "3px solid rgba(254, 201, 198, 1)";
            } else if (this.state == "neverBeenInFourthRow") {
                return "3px solid rgba(252, 116, 109, 1)";
            }   else {
                return "3px solid rgba(157, 13, 6, 1)";
            }
        }
    }  
}

class Board {
    constructor() {
        this.array = new Array(boardColumns * 4).fill(null);
        for (let i = 0 ; i < boardColumns; i++) { this.array[i] = new Piece(i, "Blue"); }
        for (let i = 3 * boardColumns; i < 4 * boardColumns; i++) { this.array[i] = new Piece(i, "Red"); }
    }

    movePiece(selectedPieceId, targetPosition) {
        // atualiza o board e a posição da peça e retorna a peça que estava nessa posição (pode ser null)
        let piece = this.array[selectedPieceId];
        let targetPiece = this.array[targetPosition];

        this.array[targetPosition] = piece;
        this.array[selectedPieceId] = null;
        piece.setPosition(targetPosition);

        return targetPiece;
    }

    isPositionFree(position) {
        return this.array[position] == null;
    }

    getPieceOnPosition(position) {
        return this.array[position];
    }
    
    size() {
        return this.array.length;
    }
}

class Game {
    constructor() {
        this.board = new Board();
        this.bluePiecesLeft = boardColumns;
        this.redPiecesLeft = boardColumns;
        this.generateBoardUI();
        this.updatePiecesOnUI();
        this.toggleNumbersOnUI();
        this.updateRemainingPieces(null);
    }

    getBoard() {
        return this.board;
    }

    generateBoardUI() {
        const boardContainer = document.getElementById('boardContainer');
        boardContainer.innerHTML = '';
        boardContainer.style.gridTemplateColumns = `repeat(${boardColumns}, 60px)`;

        for (let i = 3; i >= 0; i--) {
            const isEvenRow = i % 2 == 0;

            for (let j = 0; j < boardColumns; j++) {
                const cellBox = document.createElement('div');
                cellBox.classList.add('cellBox');

                const cellPiece = document.createElement('div');
                cellPiece.classList.add('cellPiece');

                if (isEvenRow) {
                    cellPiece.id = i * boardColumns + j;
                } else {
                    cellPiece.id = (i + 1) * boardColumns - (j + 1);
                }

                if (opponent == "AI") {
                    cellPiece.addEventListener("mouseenter", (event) => { handleMouseEnter(event, "Blue"); });
                    cellPiece.addEventListener("mouseleave", (event) => { handleMouseLeave(event, "Blue"); });
                    cellPiece.addEventListener("click", (event) => { handleClick(event, "Blue"); });
                }

                if (opponent == "Player2" && gameIsSetUp) {
                    cellPiece.addEventListener("mouseenter", (event) => { handleMouseEnter(event, getPlayerColor(nick)); });
                    cellPiece.addEventListener("mouseleave", (event) => { handleMouseLeave(event, getPlayerColor(nick)); });
                    cellPiece.addEventListener("click", (event) => { handleClick(event, getPlayerColor(nick)); });
                }

                cellBox.appendChild(cellPiece);
                boardContainer.appendChild(cellBox);
            }
        }
    }

    updatePiecesOnUI() {
        // pinta o UI com base no estado atual do tabuleiro (quando chamada)
        for (let i = 0; i < this.board.size(); i++) {
            let currentPiece = this.board.getPieceOnPosition(i);
            const cellToPaint = document.getElementById(i);

            if (currentPiece != null) {
                if (currentPiece.getOwner() == "Blue") {
                    cellToPaint.style.backgroundColor = "rgb(50, 91, 225)";
                    cellToPaint.style.border = currentPiece.getBorderColorBasedOnState();
                } else {
                    cellToPaint.style.backgroundColor = "rgb(225, 59, 50)";
                    cellToPaint.style.border = currentPiece.getBorderColorBasedOnState();                
                }
            } else {
                cellToPaint.style.backgroundColor = "transparent";
                cellToPaint.style.border = "3px dotted rgb(190, 129, 94)";
            }
        }
    }

    toggleNumbersOnUI() {
        // adiciona ou remove números no tabuleiro quando chamada dependendo de numbersToggled
        for (let i = 0; i < this.board.size(); i++) {
            const cell = document.getElementById(i);

            if (numbersToggled) {
                cell.textContent = i;
            } else {
                cell.textContent = "";
            }
        }
    }

    isGameFinished() {
        return this.bluePiecesLeft == 0 || this.redPiecesLeft == 0; 
    }

    updateRemainingPieces(piece) {
        // atualiza o número de peças restantes na classe e no UI
        if (piece != null) {
            if (piece.getOwner() == "Blue") {
                this.bluePiecesLeft--;
            } else {
                this.redPiecesLeft--;
            }
        }

        const blueScoreboard = document.getElementById("bluePiecesRemaining");
        const redScoreboard = document.getElementById("redPiecesRemaining");
        blueScoreboard.innerHTML = this.bluePiecesLeft;
        redScoreboard.innerHTML = this.redPiecesLeft;
    }

    makeMove(selectedPieceId, targetPosition) {
        let targetPositionPiece = this.board.movePiece(selectedPieceId, targetPosition);
        if (opponent == "Player2") {
            addNewMessage(getPlayerNick(currentPlayer) + " moved piece in position " + selectedPieceId + " to " + targetPosition);
        } else {
            addNewMessage(currentPlayer + " moved piece in position " + selectedPieceId + " to " + targetPosition);
        }

        if (targetPositionPiece != null) {
            if ("Player2") {
                addNewMessage(getPlayerNick(currentPlayer) + " has captured a piece!");                
            } else {
                addNewMessage(currentPlayer + " has captured a piece!");
            }
            this.updateRemainingPieces(targetPositionPiece);
        } 

        this.updatePiecesOnUI();

        if (opponent == "AI" && this.isGameFinished()) {
            this.processWin();
        }
    }

    processWin(forfeit = false) {
        disablePassTurnButton();
        disableRollDiceButton();
        latestDiceValue = 0;
        
        if (forfeit || this.bluePiecesLeft == 0) {
            currentPlayer = "Red";
            addNewMessage(currentPlayer + " has won!");
            aiWins++;
        } else {
            addNewMessage("Blue has won!");
            player1Wins++;
        }

        resetDice();
        enableSaveSettingsButton();
        enableSignInButton();
        showStartGameButton();
        setTimeout(clearMessages, 2000);
    }
}


let game = new Game();


window.addEventListener("load", () => {
    const callbacks = {
        "showRegisterScreenButton": () => { show("registerScreen"); },
        "showRulesScreenButton": () => { show("rulesScreen"); },
        "showPlayScreenButton": () => { show("playScreen"); },
        "showRankingsScreenButton": () => { show("rankingsScreen"); renderRankings(); },
        "showSettingsScreenButton": () => { show("settingsScreen"); },
        "toggleBoardNumbersButton": () => { toggleNumbers(); },
        "startGameButton": () => { startGame(); },
        "registerUserButton": () => { register(); },
        "forfeitButton": () => { forfeit(); },
        "passTurnButton": () => { passTurn(); },
        "rollDiceButton": () => { rollDice(); },
        "saveSettingsButton": () => { saveSettings(); } 
    }

    for (let id in callbacks) {
        document.getElementById(id).addEventListener("click", callbacks[id]);
    }

    // console.log(game);
    // console.log("Playing against: " + opponent);
    // console.log("Rolls dice first: " + whoRollsDiceFirst);
    document.getElementById("currentOpponentDisplay").textContent = "Playing Against: " + opponent;
    currentVisibleScreen.style.display = "flex";
    disableRollDiceButton();
});

function handleMouseEnter(event, color) {
    let currPieceID = parseInt(event.target.id);
    let piece = game.getBoard().getPieceOnPosition(currPieceID);

    if (currentPlayer == color && game.getBoard().getPieceOnPosition(currPieceID)?.owner == color) {
        
        let targetPositionsList = [];
        if (color == "Blue") {
            targetPositionsList = getBluePieceTargetPositions(piece);
        } else {
            targetPositionsList = getRedPieceTargetPositions(piece);
        }

        if (currPieceID != pieceWith2AlternativesId) { 

            // reduce scale of the piece with 2 alternatives previously selected otherwise it stays dilated
            if (pieceWith2AlternativesSelected) {
                const cellPieceWith2Alternatives = document.getElementById(pieceWith2AlternativesId);
                cellPieceWith2Alternatives.style.transition = "transform 0.2s ease";
                cellPieceWith2Alternatives.style.transform = "scale(1)";
                pieceWith2AlternativesId = null;
                pieceWith2AlternativesSelected = false;
            }

            game.updatePiecesOnUI();

            const cellPiece = event.target;
            cellPiece.style.transition = "transform 0.2s ease";
            cellPiece.style.transform = "scale(1.08)";

            for (let position of targetPositionsList) {
                let positionId = position.toString();
                const cellPosition = document.getElementById(positionId);
                cellPosition.style.backgroundColor = "rgba(11, 234, 26, 0.3)";
                cellPosition.style.border = "3px dotted rgba(2, 25, 3, 0.45)";
            }
        }
    }
}

function handleMouseLeave(event, color) {
    let currPieceID = parseInt(event.target.id);
    let piece = game.getBoard().getPieceOnPosition(currPieceID);

    if (currentPlayer == color && game.getBoard().getPieceOnPosition(currPieceID)?.owner == color) {
        let targetPositionsList = [];
        if (color == "Blue") {
            targetPositionsList = getBluePieceTargetPositions(piece);
        } else {
            targetPositionsList = getRedPieceTargetPositions(piece);
        }
        
        if (!pieceWith2AlternativesSelected) {
            const cellPiece = event.target;
            cellPiece.style.transition = "transform 0.2s ease";
            cellPiece.style.transform = "scale(1)";

            if (targetPositionsList.length != 0) {
                game.updatePiecesOnUI();
            }
        }
    }
}

function handleClick(event, color) {
    let currPieceID = parseInt(event.target.id);
    let piece = game.getBoard().getPieceOnPosition(currPieceID);

    if (currentPlayer == color && game.getBoard().getPieceOnPosition(currPieceID)?.owner == color) {
        let targetPositionsList = [];
        if (color == "Blue") {
            targetPositionsList = getBluePieceTargetPositions(piece);
        } else {
            targetPositionsList = getRedPieceTargetPositions(piece);
        }
        
        
        if (targetPositionsList.length != 0) {
            if (targetPositionsList.length == 2) {
                pieceWith2AlternativesSelected = true;
                pieceWith2AlternativesId = currPieceID;
            } else {
                pieceWith2AlternativesSelected = false;
                pieceWith2AlternativesId = null;
                if (opponent == "Player2") {
                    serverNotify(currPieceID);
                } else {
                    userMove(currPieceID, targetPositionsList[0]);
                }
            }
        } else {
            console.log("Piece " + currPieceID + " can't move.");
        }

    } else {
        if (pieceWith2AlternativesSelected) {
            let pieceWith2Alternatives = game.getBoard().getPieceOnPosition(pieceWith2AlternativesId);

            let selectedPieceTargetPositions = [];
            if (color == "Blue") {
                selectedPieceTargetPositions = getBluePieceTargetPositions(pieceWith2Alternatives);
            } else {
                selectedPieceTargetPositions = getRedPieceTargetPositions(pieceWith2Alternatives);
            }

            if (selectedPieceTargetPositions.includes(currPieceID)) {
                if (opponent == "Player2") {
                    console.log("Notifying piece with two alternatives: " + pieceWith2AlternativesId + " to " + currPieceID);
                    serverNotify(pieceWith2AlternativesId);
                    setTimeout(async () => {
                        await serverNotify(currPieceID);
                    }, 200);
                } else {
                    userMove(pieceWith2AlternativesId, currPieceID);
                }
                const cellPieceWith2Alternatives = document.getElementById(pieceWith2AlternativesId);
                cellPieceWith2Alternatives.style.transition = "transform 0.2s ease";
                cellPieceWith2Alternatives.style.transform = "scale(1)";
                pieceWith2AlternativesSelected = false;
                pieceWith2AlternativesId = null;
            } else {
                console.log("Position clicked not within: ", selectedPieceTargetPositions);
            }
        } else {
            console.log("Invalid Selection");
        }
    }

    if (!pieceWith2AlternativesSelected) {
        const cellPiece = document.getElementById(currPieceID);
        cellPiece.style.transition = "transform 0.2s ease";
        cellPiece.style.transform = "scale(1)"; 
    }
}

function disableRollDiceButton() {
    const diceButton = document.getElementById("rollDiceButton");
    diceButton.disabled = true;
    diceButton.classList.toggle("disabled", true);
}

function enableRollDiceButton() {
    const diceButton = document.getElementById("rollDiceButton");
    diceButton.disabled = false;
    diceButton.classList.toggle("disabled", false);
}

function disablePassTurnButton() {
    const passTurnButton = document.getElementById("passTurnButton");
    passTurnButton.disabled = true;
    passTurnButton.classList.toggle("disabled", true);
}

function enablePassTurnButton() {
    const passTurnButton = document.getElementById("passTurnButton");
    passTurnButton.disabled = false;
    passTurnButton.classList.toggle("disabled", false);
}

function disableForfeitButton() {
    const forfeitButton = document.getElementById("forfeitButton");
    forfeitButton.disabled = true;
    forfeitButton.classList.toggle("disabled", true);
}

function enableForfeitButton() {
    const forfeitButton = document.getElementById("forfeitButton");
    forfeitButton.disabled = false;
    forfeitButton.classList.toggle("disabled", false);
}

function disableSignInButton() {
    const registerUserButton = document.getElementById("registerUserButton");
    registerUserButton.disabled = true;
    registerUserButton.classList.toggle("disabled", true);
}

function enableSignInButton() {
    const registerUserButton = document.getElementById("registerUserButton");
    registerUserButton.disabled = false;
    registerUserButton.classList.toggle("disabled", false);
}

function disableSaveSettingsButton() {
    const saveSettingsButton = document.getElementById("saveSettingsButton");
    saveSettingsButton.disabled = true;
    saveSettingsButton.classList.toggle("disabled", true);
}

function enableSaveSettingsButton() {
    const saveSettingsButton = document.getElementById("saveSettingsButton");
    saveSettingsButton.disabled = false;
    saveSettingsButton.classList.toggle("disabled", false);
}

function showStartGameButton() {
    const forfeitPassTurnButtonArea = document.getElementById("forfeitPassTurnButtonArea");
    const startGameButtonArea = document.getElementById("startGameButtonArea");
    forfeitPassTurnButtonArea.style.display = "none";
    startGameButtonArea.style.display = "flex";
}

function hideStartGameButton() {
    const forfeitPassTurnButtonArea = document.getElementById("forfeitPassTurnButtonArea");
    const startGameButtonArea = document.getElementById("startGameButtonArea");
    forfeitPassTurnButtonArea.style.display = "flex";
    startGameButtonArea.style.display = "none";
}

function userMove(selectedPieceId, targetPosition) {
    if (latestDiceValue != 0) {
        let hasToRollAgain = willHaveToRollAgain(latestDiceValue);

        game.makeMove(selectedPieceId, targetPosition);
        resetDice();

        if (game.isGameFinished()) {
            return;
        }

        if (hasToRollAgain) {
            enableRollDiceButton();
            latestDiceValue = 0;
        } else {
            disablePassTurnButton();
            currentPlayer = "Red";
            latestDiceValue = 0;
            aiMove();
        }

    } else {
        console.log("Please roll the dice first.");
    }
}

function getBluePiecesOnBoard() {
    let bluePiecesOnBoard = [];

    for (let i = 0; i < 4 * boardColumns; i++) {
        let piece = game.getBoard().getPieceOnPosition(i);
        if (piece?.getOwner() == "Blue") {
            bluePiecesOnBoard.push(piece);
        }
    }

    return bluePiecesOnBoard;
}

function getBlueValidPiecesToMove() {
    // retorna uma lista de peças do jogador azul que podem ser movidas com base no estado
    // do jogo e no valor do latestDiceValue 
    let bluePiecesOnBoard = getBluePiecesOnBoard();
    let blueValidPiecesToMoveList = [];
    
    for (let piece of bluePiecesOnBoard) {
        let pieceTargetPositions = getBluePieceTargetPositions(piece);

        if (pieceTargetPositions.length > 0) {
            blueValidPiecesToMoveList.push(piece);
        }
    }

    return blueValidPiecesToMoveList;
}

function getBluePieceTargetPositions(piece) {

    let targetPositions = [];

    let currentRow = Math.floor(piece.getPosition() / boardColumns) + 1;

    let targetPosition = piece.getPosition() + latestDiceValue;

    let targetRow = Math.floor(targetPosition / boardColumns) + 1;

    // uma peça que esteja na última fila (4a fila do POV do utilizador) só pode ser movida se
    // o utilizador não tiver peças suas (da mesma cor) na fila inicial (1a fila do POV do utilizador) 
    if (currentRow == 4) {
        for (let i = 0; i < boardColumns; i++) {
            if (game.getBoard().getPieceOnPosition(i)?.getOwner() == "Blue") {
                return targetPositions;
            }
        }
    }

    // se a linha em que a peça está coincidir com a fila na qual poderá calhar se o utilizador a jogar (não tem que mudar/saltar filas)
    if (currentRow == targetRow) {
        // verificamos se essa posição não está ocupada por uma peça do próprio utilizador
        // e verificamos o estado da peça (não pode mover-se se o estado é "neverMoved" e o valor do dado for diferente de 1)
        if (game.getBoard().isPositionFree(targetPosition) || game.getBoard().getPieceOnPosition(targetPosition).getOwner() != currentPlayer) {
            if (piece.getState() != "neverMoved" || (piece.getState() == "neverMoved" && latestDiceValue == 1)) {
                targetPositions.push(targetPosition);
            }
        }
    // caso contrário, a linha da peça não coincide com a fila na qual poderá calhar (tem que mudar / saltar de fila)
    } else { 
        // se a fila em que a peça se encontra for maior que 2 (fila 3 ou 4) do POV do utilizador, 
        // a peça tem oportunidade de saltar para a fila de baixo
        if (currentRow > 2) { 
            let rowEndPosition = (currentRow) * boardColumns - 1;
            let stepsToReachRowEnd = rowEndPosition - piece.getPosition();
            let secondTargetPosition = rowEndPosition - (2*boardColumns - 1) + (latestDiceValue - (stepsToReachRowEnd + 1)); 
            
            // verificamos se essa posição não está ocupada por uma peça do próprio utilizador
            if (game.getBoard().isPositionFree(secondTargetPosition) || game.getBoard().getPieceOnPosition(secondTargetPosition).getOwner() != currentPlayer) {
                targetPositions.push(secondTargetPosition);
            }
        }

        // se a fila em que a peça se encontra for diferente de 4 (última fila do POV do utilizador),
        // a peça tem a oportunidade de saltar para a fila de cima.
        if (currentRow != 4) {
            // verificamos se essa posição não está ocupada por uma peça do próprio utilizador
            // e verificamos o estado da peça (não pode mover-se se o estado é "neverMoved" e o valor do dado for diferente de 1 ou
            // se o seu estado é "hasBeenInFourthRow" e a peça está na 3a fila (do POV do utilizador))
            if (game.getBoard().isPositionFree(targetPosition) || game.getBoard().getPieceOnPosition(targetPosition).getOwner() != currentPlayer) {
                if (!(piece.getState() == "hasBeenInFourthRow" && currentRow == 3)) {
                    if (piece.getState() != "neverMoved" || (piece.getState() == "neverMoved" && latestDiceValue == 1)) {
                        targetPositions.push(targetPosition);
                    }
                }
            }
        }
    }

    return targetPositions;
}

function aiMove() {
    disableRollDiceButton();
    disableForfeitButton();
    disablePassTurnButton();

    addNewMessage(currentPlayer + " it's your turn, please roll the dice");

    setTimeout(() => {
        rollDice();
        let hasToRollAgain = willHaveToRollAgain(latestDiceValue);      
        let validPiecesToMove = getRedValidPiecesToMove();

        // se o AI não tiver nenhuma jogada possível (peças que se possam mover)
        // verificamos se pode lançar os dados outra vez ou não 
        if (validPiecesToMove.length == 0) {
            setTimeout(() => {
                resetDice();

                if (hasToRollAgain) {
                    aiMove();
                } else {
                    latestDiceValue = 0;
                    console.log("User's Turn");
                    addNewMessage(currentPlayer + " passed their turn");
                    currentPlayer = "Blue";
                    addNewMessage(currentPlayer + " it's your turn, please roll the dice");
                    enableRollDiceButton();
                    enableForfeitButton();
                    disablePassTurnButton();
                }
            }, 2000);

            return;
        }

        let randomPieceIndex = Math.floor(Math.random() * validPiecesToMove.length);
        let randomSelectedPiece = validPiecesToMove[randomPieceIndex];

        let selectedPiecePossibleMoves = getRedPieceTargetPositions(randomSelectedPiece);
        let randomMoveIndex = Math.floor(Math.random() * selectedPiecePossibleMoves.length);
        let randomChosenTarget = selectedPiecePossibleMoves[randomMoveIndex];

        console.log("AI Move: (" + latestDiceValue + " " + hasToRollAgain + ") ", randomSelectedPiece.getPosition() + " -> " + randomChosenTarget + " ", selectedPiecePossibleMoves);

        setTimeout(() => {
            game.makeMove(randomSelectedPiece.getPosition(), randomChosenTarget);
            latestDiceValue = 0;

            resetDice();

            if (game.isGameFinished()) {
                return;
            }
        
            if (hasToRollAgain) {
                aiMove();
            } else {
                console.log("User's Turn");
                currentPlayer = "Blue";
                addNewMessage(currentPlayer + " it's your turn, please roll the dice");
                enableRollDiceButton();
                enableForfeitButton();
                disablePassTurnButton();
            }
        }, 2000);
    }, 2000);
}

function getRedPiecesOnBoard() {
    let redPiecesList = [];

    for (let i = 0; i < game.getBoard().size(); i++) {
        let piece = game.getBoard().getPieceOnPosition(i); 
        if (piece?.owner == "Red") {
            redPiecesList.push(piece);
        }
    }

    return redPiecesList;
}   

function getRedValidPiecesToMove() {
    // retorna uma lista de peças do jogador vermelho que podem ser movidas com base no estado
    // do jogo e no valor do latestDiceValue
    let redPiecesOnBoardList = getRedPiecesOnBoard();
    let redValidPiecesToMoveList = [];

    for (let piece of redPiecesOnBoardList) {
        let pieceTargetPositions = getRedPieceTargetPositions(piece);

        if (pieceTargetPositions.length > 0) {
            redValidPiecesToMoveList.push(piece);
        }
    }
    return redValidPiecesToMoveList;
}

function getRedPieceTargetPositions(piece) {

    let targetPositions = [];

    let currentRow = Math.floor(piece.getPosition() / boardColumns) + 1;

    let targetPosition = piece.getPosition() + latestDiceValue;

    let targetRow = Math.floor(targetPosition / boardColumns) + 1;


    // uma peça que esteja na última fila (4a do POV do AI, 1a fila do POV do utilizador) 
    // só pode ser movida se o AI não tiver peças suas (da mesma cor) na fila inicial (1a fila do POV 
    // do AI 4a do POV do utilizador) 
    if (currentRow == 1) {
        for (let i = 3 * boardColumns; i < 4 * boardColumns; i++) {
            if (game.getBoard().getPieceOnPosition(i)?.getOwner() == "Red") {
                return targetPositions;
            }
        }
    }

    // se a linha em que a peça está coincidir com a fila na qual poderá calhar se o AI a jogar (não tem que mudar/saltar filas)
    if (currentRow == targetRow) { 
        // verificamos se essa posição não está ocupada por uma peça do próprio AI
        // e verificamos o estado da peça (não pode mover-se se o estado é "neverMoved" e o valor do dado for diferente de 1)
        if (game.getBoard().isPositionFree(targetPosition) || game.getBoard().getPieceOnPosition(targetPosition).getOwner() != currentPlayer) {
            if (piece.getState() == "neverMoved" && latestDiceValue == 1 || (piece.getState() != "neverMoved")) {
                targetPositions.push(targetPosition);
            }
        }
    // caso contrário, a linha da peça não coincide com a fila na qual poderá calhar (tem que mudar / saltar de fila)
    } else { 
        // se a fila em que a peça se encontra for diferente de 1 (1a fila / incial do POV do utilizador
        // 4a / última fila do POV do AI), a peça tem a oportunidade de saltar para a fila de cima (para
        // baixo do POV do utilzador).
        if (currentRow != 1) {
            let rowEndPosition = (currentRow) * boardColumns - 1;
            let stepsToReachRowEnd = rowEndPosition - piece.getPosition();
            let secondTargetPosition = rowEndPosition - (2*boardColumns - 1) + (latestDiceValue - (stepsToReachRowEnd + 1)); 
            
            // verificamos se essa posição não está ocupada por uma peça do próprio utilizador
            // e verificamos o estado da peça (não pode mover-se se o estado é "neverMoved" e o valor do dado for diferente de 1 ou
            // se o seu estado é "hasBeenInFourthRow" e a peça está na 3a fila (do POV do utilizador))
            if (game.getBoard().isPositionFree(secondTargetPosition) || game.getBoard().getPieceOnPosition(secondTargetPosition).getOwner() != currentPlayer) {
                if (!(piece.getState() == "hasBeenInFourthRow" && currentRow == 2)) {
                    if (piece.getState() == "neverMoved" && latestDiceValue == 1 || (piece.getState() != "neverMoved")) {
                        targetPositions.push(secondTargetPosition);
                    }
                }
            }
        }

        // se a fila em que a peça se encontra for menor do que 3 do POV do utilizador (1a e 2a do POV do AI), 
        // a peça tem oportunidade de saltar para a fila de baixo do POV do AI (cima do POV do utilizador)
        if (currentRow < 3) {

            // verificamos se essa posição não está ocupada por uma peça do próprio utilizador
            if (game.getBoard().isPositionFree(targetPosition) || game.getBoard().getPieceOnPosition(targetPosition).getOwner() != currentPlayer) {
                targetPositions.push(targetPosition);
            }
        }
    }

    return targetPositions;
}

function show(elementId) {
    // troca o ecrã / painél transitório visível
    const screenToShow = document.getElementById(elementId);
    currentVisibleScreen.style.display = "none";
    screenToShow.style.display = "flex";
    currentVisibleScreen = screenToShow;
}

function rollDice() {
    if (opponent == "Player2") {
        rollDiceVsPlayer2();
    } else {
        rollDiceVsAI();
    }
}   

function rollDiceVsPlayer2() {
    serverRoll();
    disableRollDiceButton();
}

function rollDiceVsAI() {
    let value = 0;
    let stickResults = [];

    disableRollDiceButton(); // previne que o jogador lance os dados novamente

    for (let i = 1; i <= 4; i++) {
        let random = Math.floor(Math.random() * 2);
        value += random;
        stickResults.push(random); // Guarda o resultado para desenhar
    }
    
    drawCanvasDice(stickResults); // Para desenhar os paus com Canva API

    if (value == 0) { value = 6; }

    const updateValueDisplay = document.getElementById("diceCombinationValueDisplay");
    updateValueDisplay.textContent = value;
    const updatePlayName = document.getElementById("diceCombinationValueName");
    updatePlayName.textContent = diceValueName(value);
    
    latestDiceValue = value;

    addNewMessage(diceValueName(latestDiceValue) + " " + currentPlayer + " rolled a " + latestDiceValue);

    // se for o turno do utilizador, verificamos se este tem jogadas disponiveis ou se pode repetir o lançamento dos
    // dados. Este segmento serve para ativar os butões PassTurn e Roll Dices consoante as opções do utilizador.
    if (currentPlayer == "Blue") { 
        let userValidPiecesToMoveList = getBlueValidPiecesToMove();

        if (userValidPiecesToMoveList.length > 0) {
            disablePassTurnButton();
        } else {
            if (latestDiceValue == 4 || latestDiceValue == 6) {
                console.log("User can roll dice again");
                addNewMessage(currentPlayer + " it's your turn, please roll the dice");
                disablePassTurnButton();

                setTimeout(() => {
                    resetDice();
                    enableRollDiceButton();
                }, 1000);
            } else {
                console.log("User has no available moves, enabling PassTurn button")
                addNewMessage(currentPlayer + " you have no moves possible, please pass your turn");
                enablePassTurnButton();
            }
        }
    }
}

function diceValueName(value) {
    switch (value) {
        case 1: return "Tâb!";
        case 2: return "Itneyn!";
        case 3: return "Teláteh!";
        case 4: return "Arba'ah!";
        default: return "Sitteh!";
    }
}

function willHaveToRollAgain(value) {
    switch (value) {
        case 1:
        case 4:
        case 6:
            return true;
        default: 
            return false;
    }
}

function resetDice() {
    document.getElementById("diceCombinationValueDisplay").textContent = "";
    document.getElementById("diceCombinationValueName").textContent = "";
    
    drawCanvasDice([0, 0, 0, 0]);
}

function forfeit() {
    console.log("Forfeit");

    if (opponent == "Player2") {
        serverLeave();
    } else {
        addNewMessage(currentPlayer + " has forfeited");
        game.processWin(true);
    }
}

function passTurn() {
    console.log("Turn Passed");
    resetDice();

    if (opponent == "Player2") {
        serverPass();
    } else {
        currentPlayer = "Red";
        aiMove();
    } 
}

function saveSettings() {
    boardColumns = document.getElementById("columnSelector").value;
    opponent = document.querySelector('input[name = "vs"]:checked').value;
    whoRollsDiceFirst = document.querySelector('input[name = "whoFirst"]:checked').value;
    document.getElementById("currentOpponentDisplay").textContent = "Playing Against: " + opponent;

    clearMessages();
    storageHasToBeUpdated = true;
    game = new Game();

    showStartGameButton();

    resetDice();
    show("playScreen"); 

    console.clear();
    console.log("\n\n--------------------------------- SETTINGS UPDATED ----------------------------------\n")
    console.log(game);
    console.log("Playing against: " + opponent);
    console.log("Rolls dice first: " + whoRollsDiceFirst);
    console.log("------------------------------------------------------------\n\n")
}

function addNewMessage(message, color = null) {
    // adicionar mensagem à secção de mensagens do lado esquerdo
    const list = document.getElementById("messagesList");
    const li = document.createElement("li");
    li.textContent = message;
    li.classList.add("new-message");

    if (opponent == "Player2") {
        if (color != null) {
            li.classList.add(color.toLowerCase());
        } else {
            li.classList.add(currentPlayer.toLowerCase());
        }
    } else {
        li.classList.add(currentPlayer.toLowerCase());
    }

    list.insertBefore(li, list.firstChild);

    setTimeout(() => {
        li.classList.remove("new-message")
    }, 2000);
}

function clearMessages() {
    // limpa secção de mensagens
    const list = document.getElementById("messagesList");
    list.innerHTML = "";
}

function toggleNumbers() {
    // faz aparecer no tabuleiro o número das posições
    numbersToggled = !numbersToggled;
    game.toggleNumbersOnUI();
}

function startGame() {
    console.log("Start Game! button pressed");
    disableSaveSettingsButton();
    disableSignInButton();

    if (opponent == "Player2") {
        startGameVsPlayer2();
    } else {
        startGameVsAI();
    }
}

function startGameVsAI() {
    hideStartGameButton();
    
    game = new Game();
    clearMessages();

    enableRollDiceButton();
    disablePassTurnButton();
    enableForfeitButton();

    currentPlayer = whoRollsDiceFirst;

    if (whoRollsDiceFirst == "Red") {
        aiMove();
    } else {
        addNewMessage(currentPlayer + " it's your turn, please roll the dice");
    }
}

function startGameVsPlayer2() {
    if (nick == undefined || password == undefined) {
            alert("You must register first in order to start a game against a second player.");
    } else {
        hideStartGameButton();
        clearMessages();
        disablePassTurnButton();
        enableForfeitButton();
        addNewMessage("Searching for opponent...", "yellow");
        serverJoin();
    }
}

/*
=========================================================================================================================
=========================================================================================================================
================================================    Server Connection    ================================================
=========================================================================================================================
=========================================================================================================================
*/

function getPlayerColor(nick) {
    if (nick == bluePlayerNick) {
        return "Blue";
    }
    return "Red";
}

function getPlayerNick(color) {
    if (color == "Blue") {
        return bluePlayerNick;
    }
    return redPlayerNick;
}

function setUpGame(players, turn) {
    gameIsSetUp = true;
    latestDiceValue = 0;
    opponentNick = Object.keys(players).find(key => key != nick);

    if (players[nick] == "Blue") {
        bluePlayerNick = nick;
        redPlayerNick = opponentNick;
    } else {
        bluePlayerNick = opponentNick;
        redPlayerNick = nick;    
    }   
    
    enableForfeitButton();

    if (turn == nick) {
        enableRollDiceButton();
    } else {
        disableRollDiceButton();
    }

    currentPlayer = "Blue";

    game = new Game();
    
    clearMessages();
    document.getElementById("currentOpponentDisplay").textContent = "Playing Against: " + opponentNick;
    addNewMessage("Opponent found: " + opponentNick, "yellow")
    addNewMessage("Connection established!", "yellow");
    addNewMessage("Hello " + nick + "! You will play as " + getPlayerColor(nick), getPlayerColor(nick));
    addNewMessage(getPlayerNick(currentPlayer) + " it's your turn, please roll the dice");
}

function resetGame() {
    setTimeout(() => {
        clearMessages();
        game = new Game();
    }, 2000);

    gameIsSetUp = false;
    latestDiceValue = 0;
    resetDice();
    disablePassTurnButton();
    disableRollDiceButton();
    enableSaveSettingsButton();
    enableSignInButton();
    showStartGameButton();
    document.getElementById("currentOpponentDisplay").textContent = "Playing Against: " + opponent;
}

function handleServerRollDice(stickValues, value, keepPlaying) {
    latestDiceValue = value;
    document.getElementById("diceCombinationValueDisplay").textContent = value;
    document.getElementById("diceCombinationValueName").textContent = diceValueName(value);
    addNewMessage(diceValueName(value) + " " + getPlayerNick(currentPlayer) + " rolled a " + value);

    drawCanvasDice(stickValues);

    if (currentPlayer == getPlayerColor(nick)) {
        let validPiecesToMove = [];

        if (currentPlayer == "Blue") {
            validPiecesToMove = getBlueValidPiecesToMove();
        } else {
            validPiecesToMove = getRedValidPiecesToMove();
        }

        if (validPiecesToMove.length != 0) {
            disableRollDiceButton();
        } else if (keepPlaying) {
            addNewMessage("You have no moves available, but you can roll again", "yellow")
            setTimeout( () => {
                resetDice();
                enableRollDiceButton();
            }, 1500);
            latestDiceValue = 0;
        } else {
            addNewMessage("You have no moves available, please pass your turn", "yellow");
            enablePassTurnButton();
            disableRollDiceButton();
        }
    }
}

function handleServerPassTurn(turn) {
    resetDice();
    disablePassTurnButton();
    currentPlayer = getPlayerColor(turn);
    latestDiceValue = 0;
    addNewMessage(getPlayerNick(currentPlayer) + " it's your turn, please roll the dice");

    if (currentPlayer != getPlayerColor(nick)) {
        disableRollDiceButton();
    } else {
        enableRollDiceButton();
    }
}

function handleServerWinner(winner) {
    if (winner != null) {
        storageHasToBeUpdated = true;

        if (game.bluePiecesLeft != 0 && game.redPiecesLeft != 0) {
            // One of the players has forfeit
            if (winner == nick) {
                addNewMessage(opponentNick + " has forfeit and left the match", getPlayerColor(opponentNick));
                addNewMessage(nick + " won!", getPlayerColor(nick));
            } else {
                addNewMessage(nick + " has forfeit and left the match", getPlayerColor(nick));
                addNewMessage(opponentNick + " won!", getPlayerColor(opponentNick));
            }
        } else {
            // One of the players has no remaining pieces (lost)
            if (winner == nick) {
                addNewMessage(opponentNick + " has no remaining pieces left", getPlayerColor(opponentNick));
                addNewMessage(nick + " won!", getPlayerColor(nick));
            } else {
                addNewMessage(nick + "  has no remaining pieces left", getPlayerColor(nick));
                addNewMessage(opponentNick + " won!", getPlayerColor(opponentNick));
            }
        }
    } else {
        // User left waiting queue. Make Start Game button reappear
        clearMessages();
        addNewMessage("You are no longer in queue", "yellow");
    }

    resetGame();
}

function buildServerURL(path) {
    return server + path;
}

async function register() {
    if (usernameField.value == "" || passwordField.value == "") {
        alert("Nick or Password fields empty");
    } else {
        nick = usernameField.value;
        password = passwordField.value;
        
        usernameField.value = "";
        passwordField.value = "";

        const success = await serverRegister();

        if (success) {
            show("playScreen");
        } else {
            alert("Error during registration");
        }
    }
}

async function serverRegister() {
    try {
        const response = await fetch(buildServerURL("/register"), {
            method: 'POST',
            body: JSON.stringify({
                nick: nick,
                password: password
            })
        });

        const json = await response.json();

        if (response.ok) {
            console.clear();
            console.log("Registering:\n • Nick: " + nick + "\n • Password: " + password + "\n • ", json);
            return true;
        } else {
            console.log("Registering response not OK: ", json);
            return false;
        }

    } catch (error) {
        console.log("Error during register: ", error);
        return false;
    }
}

async function serverJoin() {
    try {
        const response = await fetch(buildServerURL("/join"), {
            method: 'POST',
            body: JSON.stringify({
                group: 40,
                nick: nick,
                password: password,
                size: boardColumns
            })
        });

        const json = await response.json();

        if (response.ok) {
            gameID = json.game;
            console.log("Joining:\n • Nick: " + nick + "\n • Password: " + password + "\n • ", json);
            serverUpdate();
        } else {
            console.log("Joining response not OK:", json);
        }

    } catch (error) {
        console.log("Error during join: ", error);
    }
}

async function serverLeave() {
    try {
    const response = await fetch(buildServerURL("/leave"), {
        method: 'POST',
        body: JSON.stringify({
            nick: nick,
            password: password,
            game: gameID
        })
    });

    const json = await response.json();

    if (response.ok) {
        console.log("Leaving:\n • Nick: " + nick + "\n • Password: " + password + "\n • ", json);
    } else {
        console.log("Leaving response not OK:", json);
    }

    } catch (error) {
        console.log("Error during leave: ", error);
    }
}

function serverUpdate() {
    console.log("Created EventSource for update endpoint");
    const eventSource = new EventSource(buildServerURL("/update?nick=" + nick + "&game=" + gameID));
    eventSource.addEventListener("message", (message) => {       
        let json = JSON.parse(message.data);
        console.log("Received /update message:\n", json);
        console.log("");

        if (!gameIsSetUp && "players" in json) {
            setUpGame(json.players, json.turn);
        }

        if ("step" in json && "selected" in json) {
            if (json.step == "from") {
                latestDiceValue = 0;

                if (json.selected.length == 2) {
                    game.makeMove(json.selected[0], json.selected[1]);
                } else {
                    game.makeMove(cellWith2Choices, json.selected[0]);
                    cellWith2Choices = null;
                }
            } else {
                cellWith2Choices = json.cell;
            }
        }

        if ("dice" in json) {
            if (json.dice != null) {
                handleServerRollDice(json.dice.stickValues, json.dice.value, json.dice.keepPlaying);
            } else {
                handleServerPassTurn(json.turn, json.mustPass);
            }
        }

        if ("winner" in json) {
            handleServerWinner(json.winner);
            eventSource.close();
        }     
    });
}

async function serverRoll() {
    try {
        const response = await fetch(buildServerURL("/roll"), {
            method: 'POST',
            body: JSON.stringify({
                nick: nick,
                password: password,
                game: gameID
            })
        });

        const json = await response.json();

        if (!response.ok) {
            console.log("Rolling response not OK:", json);
        } 

    } catch (error) {
        console.log("Error during roll: ", error);
    }
}

async function serverPass() {
    try {
        const response = await fetch(buildServerURL("/pass"), {
            method: 'POST',
            body: JSON.stringify({
                nick: nick,
                password: password,
                game: gameID
            })
        });

        const json = await response.json();

        if (!response.ok) {
            console.log("Passing response not OK:", json);
        }

    } catch (error) {
        console.log("Error during pass: ", error);
    }
}

async function serverNotify(selectedCell) {
    try {
        const response = await fetch(buildServerURL("/notify"), {
            method: 'POST',
            body: JSON.stringify({
                nick: nick,
                password: password,
                game: gameID,
                cell: selectedCell
            })
        });

        const json = await response.json();

        if (!response.ok) {
            console.log("Notify response not OK:", json);
        }

    } catch (error) {
        console.log("Error during notify: ", error);
    }
}

async function serverRanking(size) {
    try {
        const response = await fetch(buildServerURL("/ranking"), {
            method: 'POST',
            body: JSON.stringify({
                group: 40,
                size: size,
            })
        });

        const json = await response.json();

        if (response.ok) {
            console.log("Ranking:\n", json);
            return json;
        } else {
            console.log("Rolling response not OK:", json);
        }

    } catch (error) {
        console.log("Error during ranking: ", error);
    }
}

async function renderRankings() {
    const rankingRows = document.getElementById("rankingsRows");
    rankingRows.innerHTML = "";

    if (opponent == "Player2") {

        if (localStorage.length == 0 || storageHasToBeUpdated) {
            const json = await serverRanking(boardColumns);
            console.log("Fetching Server Rankings: ", json);
            localStorage.setItem("data", JSON.stringify(json));
            storageHasToBeUpdated = false;
        }

        const localStorageData = JSON.parse(localStorage.getItem("data"));

        for (let data of localStorageData.ranking) {
            rankingRows.appendChild(addRankRow(data.nick, data.victories, data.games));
        }

    } else {
        rankingRows.appendChild(addRankRow("Player 1", player1Wins, aiWins + player1Wins));
        rankingRows.appendChild(addRankRow("AI", aiWins, aiWins + player1Wins));
    }
}

function addRankRow(nick, wins, totalGames) {
    const p = document.createElement("p");
    p.textContent = nick;
    
    const outerSpan = document.createElement("span");
    outerSpan.classList.add("floatTextRightRankings");

    const innerSpan = document.createElement("span");
    innerSpan.textContent = wins + " / " + totalGames;

    outerSpan.appendChild(innerSpan);
    p.appendChild(outerSpan);

    return p;
}
/* === IMPLEMENTAÇÃO CANVAS API === 
   Desenha os 4 paus baseados num array de valores (0 ou 1)
*/

function drawCanvasDice(stickValues) {
    const canvas = document.getElementById('diceCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const stickWidth = 40;
    const stickHeight = 10;
    const gap = 15;
    const startX = (canvas.width - (4 * stickWidth + 3 * gap)) / 2;
    const startY = (canvas.height - 100) / 2; 

    stickValues.forEach((val, index) => {
        const x = startX + index * (stickWidth + gap);
        const y = 20; 
        
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        drawRoundedRect(ctx, x + 2, y + 2, stickWidth, 80, 5);

        if (val === 1 || val === true) {
            ctx.fillStyle = "rgb(224, 167, 105)"; 
            ctx.strokeStyle = "#5d4037";
        } else {
            ctx.fillStyle = "rgb(49, 26, 2)"; 
            ctx.strokeStyle = "#000";
        }

        drawRoundedRect(ctx, x, y, stickWidth, 80, 5);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.stroke();

        if (val === 1 || val === true) {
            ctx.beginPath();
            ctx.moveTo(x + 10, y + 10);
            ctx.lineTo(x + 10, y + 70);
            ctx.strokeStyle = "rgba(255,255,255,0.4)";
            ctx.stroke();
        }
    });
}

function drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}
