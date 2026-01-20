// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TicTacToe
 * @dev A decentralized Tic-Tac-Toe game with NFT rewards for winners
 * @notice Players can create games, join games, and make moves on the blockchain
 */
contract TicTacToe is ERC721, Ownable {
    // ============ Enums ============
    
    /// @notice Represents the state of a cell on the board
    enum CellState { Empty, X, O }
    
    /// @notice Represents the current state of a game
    enum GameState { WaitingForPlayer, InProgress, Finished, Draw }

    // ============ Structs ============
    
    /// @notice Represents a single game instance
    struct Game {
        address player1;        // Player X (game creator)
        address player2;        // Player O (joiner)
        CellState[9] board;     // 3x3 board represented as 1D array
        address currentTurn;    // Address of player whose turn it is
        address winner;         // Address of the winner (address(0) if no winner yet)
        GameState state;        // Current state of the game
        uint256 createdAt;      // Timestamp when game was created
        uint256 lastMoveAt;     // Timestamp of last move
    }

    // ============ State Variables ============
    
    /// @notice Counter for game IDs
    uint256 public gameCounter;
    
    /// @notice Counter for NFT token IDs
    uint256 private _tokenIdCounter;
    
    /// @notice Mapping from game ID to Game struct
    mapping(uint256 => Game) public games;
    
    /// @notice Mapping from player address to their active game IDs
    mapping(address => uint256[]) public playerGames;
    
    /// @notice Mapping from player address to their win count
    mapping(address => uint256) public playerWins;
    
    /// @notice Mapping from player address to their total games played
    mapping(address => uint256) public playerGamesPlayed;

    // ============ Events ============
    
    /// @notice Emitted when a new game is created
    event GameCreated(uint256 indexed gameId, address indexed player1);
    
    /// @notice Emitted when a player joins a game
    event GameJoined(uint256 indexed gameId, address indexed player2);
    
    /// @notice Emitted when a move is made
    event MoveMade(uint256 indexed gameId, address indexed player, uint8 position);
    
    /// @notice Emitted when a game ends with a winner
    event GameWon(uint256 indexed gameId, address indexed winner);
    
    /// @notice Emitted when a game ends in a draw
    event GameDraw(uint256 indexed gameId);
    
    /// @notice Emitted when a winner NFT is minted
    event WinnerNFTMinted(uint256 indexed tokenId, address indexed winner, uint256 indexed gameId);

    // ============ Errors ============
    
    error GameNotFound();
    error GameNotWaitingForPlayer();
    error GameNotInProgress();
    error CannotJoinOwnGame();
    error NotYourTurn();
    error InvalidPosition();
    error CellNotEmpty();
    error NotAPlayer();
    error GameAlreadyFinished();

    // ============ Constructor ============
    
    constructor() ERC721("TicTacToe Winner", "TTT") Ownable(msg.sender) {
        gameCounter = 0;
        _tokenIdCounter = 0;
    }

    // ============ External Functions ============
    
    /**
     * @notice Create a new game
     * @return gameId The ID of the newly created game
     */
    function createGame() external returns (uint256) {
        uint256 gameId = gameCounter++;
        
        Game storage newGame = games[gameId];
        newGame.player1 = msg.sender;
        newGame.player2 = address(0);
        newGame.currentTurn = msg.sender; // Player 1 (X) goes first
        newGame.winner = address(0);
        newGame.state = GameState.WaitingForPlayer;
        newGame.createdAt = block.timestamp;
        newGame.lastMoveAt = block.timestamp;
        
        // Initialize empty board
        for (uint8 i = 0; i < 9; i++) {
            newGame.board[i] = CellState.Empty;
        }
        
        playerGames[msg.sender].push(gameId);
        
        emit GameCreated(gameId, msg.sender);
        
        return gameId;
    }
    
    /**
     * @notice Join an existing game as player 2
     * @param gameId The ID of the game to join
     */
    function joinGame(uint256 gameId) external {
        Game storage game = games[gameId];
        
        if (game.player1 == address(0)) revert GameNotFound();
        if (game.state != GameState.WaitingForPlayer) revert GameNotWaitingForPlayer();
        if (game.player1 == msg.sender) revert CannotJoinOwnGame();
        
        game.player2 = msg.sender;
        game.state = GameState.InProgress;
        game.lastMoveAt = block.timestamp;
        
        playerGames[msg.sender].push(gameId);
        playerGamesPlayed[game.player1]++;
        playerGamesPlayed[msg.sender]++;
        
        emit GameJoined(gameId, msg.sender);
    }
    
    /**
     * @notice Make a move in a game
     * @param gameId The ID of the game
     * @param position The position to place the mark (0-8, where 0-2 is top row, 3-5 is middle, 6-8 is bottom)
     */
    function makeMove(uint256 gameId, uint8 position) external {
        Game storage game = games[gameId];
        
        if (game.player1 == address(0)) revert GameNotFound();
        if (game.state != GameState.InProgress) revert GameNotInProgress();
        if (game.state == GameState.Finished) revert GameAlreadyFinished();
        if (msg.sender != game.player1 && msg.sender != game.player2) revert NotAPlayer();
        if (msg.sender != game.currentTurn) revert NotYourTurn();
        if (position >= 9) revert InvalidPosition();
        if (game.board[position] != CellState.Empty) revert CellNotEmpty();
        
        // Place the mark
        CellState mark = (msg.sender == game.player1) ? CellState.X : CellState.O;
        game.board[position] = mark;
        game.lastMoveAt = block.timestamp;
        
        emit MoveMade(gameId, msg.sender, position);
        
        // Check for winner
        if (_checkWinner(game.board, mark)) {
            game.winner = msg.sender;
            game.state = GameState.Finished;
            playerWins[msg.sender]++;
            
            // Mint NFT for winner
            _mintWinnerNFT(msg.sender, gameId);
            
            emit GameWon(gameId, msg.sender);
        } 
        // Check for draw
        else if (_isBoardFull(game.board)) {
            game.state = GameState.Draw;
            emit GameDraw(gameId);
        } 
        // Switch turn
        else {
            game.currentTurn = (msg.sender == game.player1) ? game.player2 : game.player1;
        }
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get the full game details
     * @param gameId The ID of the game
     * @return player1 Address of player 1 (X)
     * @return player2 Address of player 2 (O)
     * @return board The current board state
     * @return currentTurn Address of the player whose turn it is
     * @return winner Address of the winner (or address(0))
     * @return state The current game state
     */
    function getGame(uint256 gameId) external view returns (
        address player1,
        address player2,
        CellState[9] memory board,
        address currentTurn,
        address winner,
        GameState state
    ) {
        Game storage game = games[gameId];
        return (
            game.player1,
            game.player2,
            game.board,
            game.currentTurn,
            game.winner,
            game.state
        );
    }
    
    /**
     * @notice Get just the board state for a game
     * @param gameId The ID of the game
     * @return The board as an array of CellStates
     */
    function getBoard(uint256 gameId) external view returns (CellState[9] memory) {
        return games[gameId].board;
    }
    
    /**
     * @notice Get all games for a player
     * @param player The player's address
     * @return Array of game IDs
     */
    function getPlayerGames(address player) external view returns (uint256[] memory) {
        return playerGames[player];
    }
    
    /**
     * @notice Get all open games waiting for a player
     * @return Array of game IDs
     */
    function getOpenGames() external view returns (uint256[] memory) {
        uint256 count = 0;
        
        // First, count open games
        for (uint256 i = 0; i < gameCounter; i++) {
            if (games[i].state == GameState.WaitingForPlayer) {
                count++;
            }
        }
        
        // Then, collect them
        uint256[] memory openGames = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < gameCounter; i++) {
            if (games[i].state == GameState.WaitingForPlayer) {
                openGames[index++] = i;
            }
        }
        
        return openGames;
    }
    
    /**
     * @notice Get player statistics
     * @param player The player's address
     * @return wins Number of wins
     * @return totalGames Total games played
     */
    function getPlayerStats(address player) external view returns (uint256 wins, uint256 totalGames) {
        return (playerWins[player], playerGamesPlayed[player]);
    }

    // ============ Internal Functions ============
    
    /**
     * @dev Check if the given mark has won
     * @param board The current board state
     * @param mark The mark to check for (X or O)
     * @return True if the mark has won
     */
    function _checkWinner(CellState[9] memory board, CellState mark) internal pure returns (bool) {
        // Winning combinations: rows, columns, diagonals
        // Board layout:
        // 0 | 1 | 2
        // ---------
        // 3 | 4 | 5
        // ---------
        // 6 | 7 | 8
        
        // Check rows
        if (board[0] == mark && board[1] == mark && board[2] == mark) return true;
        if (board[3] == mark && board[4] == mark && board[5] == mark) return true;
        if (board[6] == mark && board[7] == mark && board[8] == mark) return true;
        
        // Check columns
        if (board[0] == mark && board[3] == mark && board[6] == mark) return true;
        if (board[1] == mark && board[4] == mark && board[7] == mark) return true;
        if (board[2] == mark && board[5] == mark && board[8] == mark) return true;
        
        // Check diagonals
        if (board[0] == mark && board[4] == mark && board[8] == mark) return true;
        if (board[2] == mark && board[4] == mark && board[6] == mark) return true;
        
        return false;
    }
    
    /**
     * @dev Check if the board is full (draw condition)
     * @param board The current board state
     * @return True if the board is full
     */
    function _isBoardFull(CellState[9] memory board) internal pure returns (bool) {
        for (uint8 i = 0; i < 9; i++) {
            if (board[i] == CellState.Empty) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * @dev Mint an NFT for the winner
     * @param winner The winner's address
     * @param gameId The game ID
     */
    function _mintWinnerNFT(address winner, uint256 gameId) internal {
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(winner, tokenId);
        emit WinnerNFTMinted(tokenId, winner, gameId);
    }
    
    /**
     * @dev Override tokenURI to return basic metadata
     * @param tokenId The token ID
     * @return The token URI (basic data URI)
     */
    function tokenURI(uint256 tokenId) public pure override returns (string memory) {
        return string(abi.encodePacked(
            "data:application/json;base64,",
            _base64Encode(bytes(string(abi.encodePacked(
                '{"name":"TicTacToe Winner #',
                _toString(tokenId),
                '","description":"This NFT proves you won a game of TicTacToe on the blockchain!","image":"data:image/svg+xml;base64,',
                _base64Encode(bytes(_generateSVG(tokenId))),
                '"}'
            ))))
        ));
    }
    
    /**
     * @dev Generate an SVG for the NFT
     */
    function _generateSVG(uint256 tokenId) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="350" height="350">',
            '<rect width="100%" height="100%" fill="#1a1a2e"/>',
            '<text x="175" y="100" text-anchor="middle" fill="#00d9ff" font-size="24" font-family="Arial">TicTacToe</text>',
            '<text x="175" y="140" text-anchor="middle" fill="#00d9ff" font-size="20" font-family="Arial">WINNER</text>',
            '<text x="175" y="200" text-anchor="middle" fill="#ffd700" font-size="60" font-family="Arial">#',
            _toString(tokenId),
            '</text>',
            '<text x="175" y="280" text-anchor="middle" fill="#888" font-size="14" font-family="Arial">On-Chain Victory</text>',
            '</svg>'
        ));
    }
    
    /**
     * @dev Convert uint to string
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    /**
     * @dev Base64 encode bytes
     */
    function _base64Encode(bytes memory data) internal pure returns (string memory) {
        bytes memory TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        
        uint256 len = data.length;
        if (len == 0) return "";
        
        uint256 encodedLen = 4 * ((len + 2) / 3);
        bytes memory result = new bytes(encodedLen);
        
        uint256 i = 0;
        uint256 j = 0;
        
        while (i < len) {
            uint256 a = uint256(uint8(data[i++]));
            uint256 b = i < len ? uint256(uint8(data[i++])) : 0;
            uint256 c = i < len ? uint256(uint8(data[i++])) : 0;
            
            uint256 triple = (a << 16) + (b << 8) + c;
            
            result[j++] = TABLE[(triple >> 18) & 0x3F];
            result[j++] = TABLE[(triple >> 12) & 0x3F];
            result[j++] = TABLE[(triple >> 6) & 0x3F];
            result[j++] = TABLE[triple & 0x3F];
        }
        
        // Padding
        uint256 mod = len % 3;
        if (mod > 0) {
            result[encodedLen - 1] = "=";
            if (mod == 1) {
                result[encodedLen - 2] = "=";
            }
        }
        
        return string(result);
    }
}
