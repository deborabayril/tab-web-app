const http = require("http");
const fs = require("fs");
const crypto = require("crypto");
const url = require('url');

const PORT = 8140;
const USERS_FILE = "users.json";
const RANKINGS_FILE = "rankings.json";
const onGoingGamesMap = new Map();
const pendingGamesMap = new Map();

// Ensure the users file exists
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({}, null, 2));
}

// Ensure the rankings file exists
if (!fs.existsSync(RANKINGS_FILE)) {
    fs.writeFileSync(RANKINGS_FILE, JSON.stringify({}, null, 2));
}

class Game {
    constructor(group, size, player1Nick) {
        this.player1Nick = player1Nick;
        this.player2Nick = null;
        this.group = group;
        this.size = size;
        this.winner = null;
        this.board = [
	        new Array(size).fill(1), 
            new Array(size).fill(0), 
            new Array(size).fill(0), 
            new Array(size).fill(2)
];      
        this.createdAt = new Date();
        this.gameID = this.generateGameID();
        this.turn = player1Nick;

	    this.lastRoll = null; 
        this.waitingForMove = false; 

        this.listeners = [];
    }

    generateGameID() {
        const hashInput = JSON.stringify({
            group: this.group,
            size: this.size,
            createdAt: this.createdAt
        });

        return crypto.createHash('md5').update(hashInput).digest('hex');
    }   
    
    notifyListeners() {
        const data = JSON.stringify({
            winner: this.winner,
            board: this.board,
            turn: this.turn,
            lastRoll: this.lastRoll
        });
        this.listeners.forEach(res => res.write(`data: ${data}\n\n`));
    }
    
    addPlayer(nick) {
        this.player2Nick = nick;
        this.notifyListeners();
    }

}

const server = http.createServer((request, response) => {
    const parsedUrl = url.parse(request.url, true);
    const pathname = parsedUrl.pathname;
    
    response.setHeader("Access-Control-Allow-Origin", "*");

    if (pathname === '/notify') {
        response.setHeader("Content-Type", "text/event-stream");
        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("Connection", "keep-alive");
    } else {
        response.setHeader("Content-Type", "application/json");
    }

    switch (pathname) {
        case "/register":
            console.log("Handling Register");
            handleRegister(request, response);
            break;
        
        case "/join":
            console.log("Handling Join");
            handleJoin(request, response);
            break;
        
        case "/leave":
            console.log("Handling Leave");
            handleLeave(request, response);
            break;

        case "/ranking":
            handleRanking(request, response);
            break;
        
        case "/roll":
            console.log("Handling Roll");
            handleRoll(request, response);
            break;

        case "/pass":
            console.log("Handling Pass");
            handlePass(request, response);
            break;

        case "/update":
            handleUpdate(request, response, parsedUrl.query);
            break;

        case "/notify":
            handleNotify(request, response, parsedUrl.query);
            break;

        default:
            response.statusCode = 404;
            response.end(JSON.stringify({ error: "Unknown request" }));
    }
});

server.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});

function handleRegister(request, response) {
    let body = "";

    request.on("data", chunk => (body += chunk));
    request.on("end", () => {
        let data;
        try {
            data = JSON.parse(body);
        } catch {
            response.statusCode = 400;
            return response.end(JSON.stringify({ error: "Invalid JSON" }));
        }

        const nick = data.nick;
        const password = data.password;

        if (nick == null) {
            response.statusCode = 400;
            return response.end(JSON.stringify({ error: "nick is undefined" }));
        } 

        if (!isString(nick)) {
            response.statusCode = 400;
            return response.end(JSON.stringify({ error: "nick is not a valid string" }));
        }

        if (password == null) {
            response.statusCode = 400;
            return response.end(JSON.stringify({ error: "password is undefined" }));
        }

        if (!isString(password)) {
            response.statusCode = 400;
            return response.end(JSON.stringify({ error: "password is not a valid string" }));
        }

        const hashedPassword = hashPassword(password);

        // Load users file
        const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));

        // Check existing user
        if (users[nick]) {
            if (users[nick] !== hashedPassword) {
                response.statusCode = 400;
                return response.end(JSON.stringify({ error: "User registered with a different password" }));
            }
        } else {
            // Save new user
            console.log("New User: " + nick + ": " + password);
            users[nick] = hashedPassword;
            fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        }
    
        response.end(JSON.stringify({}));
    });
}

function handleRanking(request, response) {
    let body = "";

    request.on("data", chunk => (body += chunk));
    request.on("end", () => {
        let data;
        try {
            data = JSON.parse(body);
        } catch {
            response.statusCode = 400;
            return response.end(JSON.stringify({ error: "Invalid JSON" }));
        }

        const group = data.group;
        const size = data.size;

        if (group == null) {
            response.statusCode = 400;
            return response.end(JSON.stringify({ error: "undefined group" }));
        } 

        if (!isInteger(group)) {
            response.statusCode = 400;
            return response.end(JSON.stringify({ error: "invalid group '" + group + "'" }));
        }

        if (size == null) {
            response.statusCode = 400;
            return response.end(JSON.stringify({ error: "undefined size" }));
        }

        if (!isInteger(size)) {
            response.statusCode = 400;
            return response.end(JSON.stringify({ error: "invalid size '" + size + "'" }));
        }

        // Load rankings
        const rankings = JSON.parse(fs.readFileSync(RANKINGS_FILE, "utf8"));

        // Get the ranking array for the group/size, or an empty array if it doesn't exist
        const rankingArray = (rankings[group] && rankings[group][size]) ? rankings[group][size] : [];

        // Respond with desired format
        response.end(JSON.stringify({ ranking: rankingArray }));
    });
}

function handleJoin(request, response) {
    let body = "";

    request.on("data", chunk => (body += chunk));
    request.on("end", () => {
        let data;
        try {
            data = JSON.parse(body);
        } catch {
            response.statusCode = 400;
            return response.end(JSON.stringify({ error: "Invalid JSON" }));
        }

        const group = data.group;
        const nick = data.nick;
        const password = data.password;
        const size = data.size;

        const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));

        if (group == null) {
            response.statusCode = 400;
            return response.end(JSON.stringify({ error: "group is undefined" }));
        }

        if (!isInteger(group)) {
            response.statusCode = 400;
            return response.end(JSON.stringify({ error: "invalid group" }));
        }

        if (nick == null) {
            response.statusCode = 400;
            return response.end(JSON.stringify({ error: "nick is undefined" }));
        } 

        if (!isString(nick)) {
            response.statusCode = 400;
            return response.end(JSON.stringify({ error: "nick is not a valid string" }));
        }

        if (password == null) {
            response.statusCode = 400;
            return response.end(JSON.stringify({ error: "password is undefined" }));
        }

        if (!isString(password)) {
            response.statusCode = 400;
            return response.end(JSON.stringify({ error: "password is not a valid string" }));
        }
        
        if (size == null) {
            response.statusCode = 400;
            return response.end(JSON.stringify({ error: "size is undefined" }));
        }

        if (!isInteger(size) || size % 2 == 0) {
            response.statusCode = 400;
            return response.end(JSON.stringify({ error: "invalid size" }));
        }
        
        if (!users[nick]) {
            response.statusCode = 400;
            return response.end(JSON.stringify({ error: "User is not registered" }));
        }

        if (users[nick] != hashPassword(password)) {
            response.statusCode = 401;
            return response.end(JSON.stringify({ error: "User registered with a different password" }));
        }

        let key = group + ":" + size;
        let gameID;

        if (!pendingGamesMap.has(key)) {
            let newPendingGame = new Game(group, size, nick);
            gameID = newPendingGame.gameID;
            pendingGamesMap.set(key, newPendingGame); 
            console.log("Creating game and adding to pending list: " + JSON.stringify(newPendingGame))
        } else {
            let game = pendingGamesMap.get(key);
            gameID = game.gameID;

            if (game.player1Nick != nick) {
                console.log("Matching game found: " + JSON.stringify(game));
                // Initialize game board for /update
                onGoingGamesMap.set(gameID, game);
                pendingGamesMap.delete(key);
                game.addPlayer(nick);
            } else {
                response.statusCode = 400;
                return response.end(JSON.stringify({ error: nick + " is already in queue" }));
            }
        }

        return response.end(JSON.stringify({ game: gameID }));
    });
}

function handleLeave(request, response) {
    let body = "";

    request.on("data", chunk => (body += chunk));
    request.on("end", () => {
        let data;
        try {
            data = JSON.parse(body);
        } catch {
            response.statusCode = 400;
            return response.end(JSON.stringify({ error: "Invalid JSON" }));
        }
        const nick = data.nick;
        const password = data.password;
        const game = data.game;  

        const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));

        if (nick == null) {
            response.statusCode = 400;
            return response.end(JSON.stringify({ error: "nick is undefined" }));
        } 

        if (!isString(nick)) {
            response.statusCode = 400;
            return response.end(JSON.stringify({ error: "nick is not a valid string" }));
        }

        if (password == null) {
            response.statusCode = 400;
            return response.end(JSON.stringify({ error: "password is undefined" }));
        }

        if (!isString(password)) {
            response.statusCode = 400;
            return response.end(JSON.stringify({ error: "password is not a valid string" }));
        }

        if (game == null) {
            response.statusCode = 400;
            return response.end(JSON.stringify({ error: "game is undefined" }));
        }

        if (!isString(game)) {
            response.statusCode = 400;
            return response.end(JSON.stringify({ error: "game is not a valid string" }));
        }

        if (!users[nick]) {
            response.statusCode = 400;
            return response.end(JSON.stringify({ error: "User is not registered" }));
        }

        if (users[nick] != hashPassword(password)) {
            response.statusCode = 401;
            return response.end(JSON.stringify({ error: "User registered with a different password" }));
        }

        console.log("Pending Queue: " + pendingGamesMap.size);
        console.log("OnGoing Games: " + onGoingGamesMap.size);

        if (onGoingGamesMap.has(game)) {
            let onGoingGame = onGoingGamesMap.get(game);
            onGoingGame.winner = nick == onGoingGame.player1Nick ? onGoingGame.player2Nick : onGoingGame.player1Nick;
            onGoingGamesMap.delete(game);
            console.log("The Game was ongoing and the user: " + nick + " has forfeit. Winner is " + onGoingGame.winner);
            // /update needs to send winner: onGoingGame.winner
            return response.end(JSON.stringify({}));
        }

        for (const key of pendingGamesMap.keys()) {
            let pendingGame = pendingGamesMap.get(key);

            if (pendingGame.player1Nick == nick && pendingGame.gameID == game) {
                pendingGamesMap.delete(key);
                pendingGame.winner = null;
                console.log("The user: " + nick + " has left the queue. Winner is " + pendingGame.winner);
                // /update needs to send winner: null
                return response.end(JSON.stringify({}));
            }
        }       

        response.statusCode = 400;
        return response.end(JSON.stringify({ error: "Invalid Game: " + game }));
    });
}


function isString(v) {
  return typeof v === "string" || v instanceof String;
}

function isInteger(v) {
  return typeof v === "number" && Number.isInteger(v);
}

// Simple SHA-256 hashing
function hashPassword(password) {
    return crypto.createHash("sha256").update(password).digest("hex");
}

function handleNotify(request, response, query) {
    const nick = query.nick;
    const password = query.password;
    const gameID = query.game;

    if (!gameID) {
        response.statusCode = 400;
        return response.end(JSON.stringify({ error: "Missing gameID" }));
    }

    let game = onGoingGamesMap.get(gameID);
    
    if (!game) {
        for (const g of pendingGamesMap.values()) {
            if (g.gameID === gameID) { game = g; break; }
        }
    }

    if (!game) {
        response.statusCode = 404;
        return response.end(JSON.stringify({ error: "Game not found" }));
    }

    response.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    game.listeners.push(response);

    request.on('close', () => {
        game.listeners = game.listeners.filter(res => res !== response);
    });
}

function handleUpdate(request, response, query) {
    const gameID = query.game;
    const nick = query.nick;

    if (!gameID) {
        response.statusCode = 400;
        return response.end(JSON.stringify({ error: "Game ID missing" }));
    }

    const game = onGoingGamesMap.get(gameID);
    if (!game) {
        response.statusCode = 404;
        return response.end(JSON.stringify({ error: "Game not active" }));
    }

    response.end(JSON.stringify({
        board: game.board,
        turn: game.turn,
        winner: game.winner,
        lastRoll: game.lastRoll
    }));
}

function handleRoll(request, response) {
    let body = "";
    request.on("data", chunk => (body += chunk));
    request.on("end", () => {
        let data;
        try { data = JSON.parse(body); } catch { return response.end(JSON.stringify({ error: "Invalid JSON" })); }

        const { nick, password, game: gameID } = data;
        const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));

        if (!users[nick] || users[nick] !== hashPassword(password)) {
            response.statusCode = 401;
            return response.end(JSON.stringify({ error: "Unauthorized" }));
        }

        const game = onGoingGamesMap.get(gameID);
        if (!game) {
            response.statusCode = 404;
            return response.end(JSON.stringify({ error: "Game not found" }));
        }

        if (game.turn !== nick) {
            response.statusCode = 400;
            return response.end(JSON.stringify({ error: "Not your turn" }));
        }

        let sticks = 0;
        for(let i=0; i<4; i++) {
            if (Math.random() > 0.5) sticks++; 
        }

        let rollValue = 0;
        switch (sticks) {
            case 0: rollValue = 6; break; 
            case 1: rollValue = 1; break; 
            case 2: rollValue = 2; break; 
            case 3: rollValue = 3; break; 
            case 4: rollValue = 4; break; 
        }

        game.lastRoll = { player: nick, sticks: sticks, value: rollValue };
                
        game.notifyListeners(); 

        response.end(JSON.stringify({ value: rollValue }));
    });
}

function handlePass(request, response) {
    let body = "";
    request.on("data", chunk => (body += chunk));
    request.on("end", () => {
        let data;
        try { data = JSON.parse(body); } catch { return response.end(JSON.stringify({ error: "Invalid JSON" })); }

        const { nick, password, game: gameID } = data;
        const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));

        if (!users[nick] || users[nick] !== hashPassword(password)) {
            response.statusCode = 401;
            return response.end(JSON.stringify({ error: "Unauthorized" }));
        }

        const game = onGoingGamesMap.get(gameID);
        if (!game || game.turn !== nick) {
            response.statusCode = 400;
            return response.end(JSON.stringify({ error: "Error passing turn" }));
        }

        game.turn = (game.turn === game.player1Nick) ? game.player2Nick : game.player1Nick;
        game.lastRoll = null;
        
        game.notifyListeners();

        response.end(JSON.stringify({ message: "Turn passed" }));
    });
}

