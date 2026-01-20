import { expect } from "chai";
import hre from "hardhat";
import { TicTacToe } from "../src/types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const { ethers } = hre;

describe("TicTacToe", function () {
  let ticTacToe: TicTacToe;
  let player1: HardhatEthersSigner;
  let player2: HardhatEthersSigner;
  let player3: HardhatEthersSigner;

  // Game states enum
  const GameState = {
    WaitingForPlayer: 0,
    InProgress: 1,
    Finished: 2,
    Draw: 3,
  };

  // Cell states enum
  const CellState = {
    Empty: 0,
    X: 1,
    O: 2,
  };

  beforeEach(async function () {
    [player1, player2, player3] = await ethers.getSigners();

    const TicTacToeFactory = await ethers.getContractFactory("TicTacToe");
    ticTacToe = await TicTacToeFactory.deploy();
    await ticTacToe.waitForDeployment();
  });

  describe("Game Creation", function () {
    it("Should create a new game with correct initial state", async function () {
      await ticTacToe.connect(player1).createGame();

      const game = await ticTacToe.getGame(0);

      expect(game.player1).to.equal(player1.address);
      expect(game.player2).to.equal(ethers.ZeroAddress);
      expect(game.currentTurn).to.equal(player1.address);
      expect(game.winner).to.equal(ethers.ZeroAddress);
      expect(Number(game.state)).to.equal(GameState.WaitingForPlayer);
    });

    it("Should increment game counter", async function () {
      await ticTacToe.connect(player1).createGame();
      await ticTacToe.connect(player2).createGame();

      expect(await ticTacToe.gameCounter()).to.equal(2);
    });

    it("Should emit GameCreated event", async function () {
      await expect(ticTacToe.connect(player1).createGame())
        .to.emit(ticTacToe, "GameCreated")
        .withArgs(0, player1.address);
    });
  });

  describe("Joining Game", function () {
    beforeEach(async function () {
      await ticTacToe.connect(player1).createGame();
    });

    it("Should allow player2 to join a game", async function () {
      await ticTacToe.connect(player2).joinGame(0);

      const game = await ticTacToe.getGame(0);

      expect(game.player2).to.equal(player2.address);
      expect(Number(game.state)).to.equal(GameState.InProgress);
    });

    it("Should emit GameJoined event", async function () {
      await expect(ticTacToe.connect(player2).joinGame(0))
        .to.emit(ticTacToe, "GameJoined")
        .withArgs(0, player2.address);
    });

    it("Should not allow player1 to join their own game", async function () {
      await expect(
        ticTacToe.connect(player1).joinGame(0),
      ).to.be.revertedWithCustomError(ticTacToe, "CannotJoinOwnGame");
    });

    it("Should not allow joining a game that already started", async function () {
      await ticTacToe.connect(player2).joinGame(0);

      await expect(
        ticTacToe.connect(player3).joinGame(0),
      ).to.be.revertedWithCustomError(ticTacToe, "GameNotWaitingForPlayer");
    });
  });

  describe("Making Moves", function () {
    beforeEach(async function () {
      await ticTacToe.connect(player1).createGame();
      await ticTacToe.connect(player2).joinGame(0);
    });

    it("Should allow player1 to make the first move", async function () {
      await ticTacToe.connect(player1).makeMove(0, 4); // Center

      const board = await ticTacToe.getBoard(0);
      expect(Number(board[4])).to.equal(CellState.X);
    });

    it("Should switch turns after a move", async function () {
      await ticTacToe.connect(player1).makeMove(0, 4);

      const game = await ticTacToe.getGame(0);
      expect(game.currentTurn).to.equal(player2.address);
    });

    it("Should emit MoveMade event", async function () {
      await expect(ticTacToe.connect(player1).makeMove(0, 4))
        .to.emit(ticTacToe, "MoveMade")
        .withArgs(0, player1.address, 4);
    });

    it("Should not allow move when not your turn", async function () {
      await expect(
        ticTacToe.connect(player2).makeMove(0, 4),
      ).to.be.revertedWithCustomError(ticTacToe, "NotYourTurn");
    });

    it("Should not allow move on occupied cell", async function () {
      await ticTacToe.connect(player1).makeMove(0, 4);
      await ticTacToe.connect(player2).makeMove(0, 0);

      await expect(
        ticTacToe.connect(player1).makeMove(0, 4),
      ).to.be.revertedWithCustomError(ticTacToe, "CellNotEmpty");
    });

    it("Should not allow move with invalid position", async function () {
      await expect(
        ticTacToe.connect(player1).makeMove(0, 9),
      ).to.be.revertedWithCustomError(ticTacToe, "InvalidPosition");
    });

    it("Should not allow non-player to make a move", async function () {
      await expect(
        ticTacToe.connect(player3).makeMove(0, 4),
      ).to.be.revertedWithCustomError(ticTacToe, "NotAPlayer");
    });
  });

  describe("Winning Conditions", function () {
    beforeEach(async function () {
      await ticTacToe.connect(player1).createGame();
      await ticTacToe.connect(player2).joinGame(0);
    });

    it("Should detect horizontal win (top row)", async function () {
      // X X X
      // O O -
      // - - -
      await ticTacToe.connect(player1).makeMove(0, 0);
      await ticTacToe.connect(player2).makeMove(0, 3);
      await ticTacToe.connect(player1).makeMove(0, 1);
      await ticTacToe.connect(player2).makeMove(0, 4);
      await ticTacToe.connect(player1).makeMove(0, 2);

      const game = await ticTacToe.getGame(0);
      expect(game.winner).to.equal(player1.address);
      expect(Number(game.state)).to.equal(GameState.Finished);
    });

    it("Should detect vertical win (left column)", async function () {
      // X O -
      // X O -
      // X - -
      await ticTacToe.connect(player1).makeMove(0, 0);
      await ticTacToe.connect(player2).makeMove(0, 1);
      await ticTacToe.connect(player1).makeMove(0, 3);
      await ticTacToe.connect(player2).makeMove(0, 4);
      await ticTacToe.connect(player1).makeMove(0, 6);

      const game = await ticTacToe.getGame(0);
      expect(game.winner).to.equal(player1.address);
    });

    it("Should detect diagonal win", async function () {
      // X O -
      // O X -
      // - - X
      await ticTacToe.connect(player1).makeMove(0, 0);
      await ticTacToe.connect(player2).makeMove(0, 1);
      await ticTacToe.connect(player1).makeMove(0, 4);
      await ticTacToe.connect(player2).makeMove(0, 3);
      await ticTacToe.connect(player1).makeMove(0, 8);

      const game = await ticTacToe.getGame(0);
      expect(game.winner).to.equal(player1.address);
    });

    it("Should emit GameWon event", async function () {
      await ticTacToe.connect(player1).makeMove(0, 0);
      await ticTacToe.connect(player2).makeMove(0, 3);
      await ticTacToe.connect(player1).makeMove(0, 1);
      await ticTacToe.connect(player2).makeMove(0, 4);

      await expect(ticTacToe.connect(player1).makeMove(0, 2))
        .to.emit(ticTacToe, "GameWon")
        .withArgs(0, player1.address);
    });

    it("Should mint NFT to winner", async function () {
      await ticTacToe.connect(player1).makeMove(0, 0);
      await ticTacToe.connect(player2).makeMove(0, 3);
      await ticTacToe.connect(player1).makeMove(0, 1);
      await ticTacToe.connect(player2).makeMove(0, 4);
      await ticTacToe.connect(player1).makeMove(0, 2);

      expect(await ticTacToe.balanceOf(player1.address)).to.equal(1);
    });

    it("Should update player wins", async function () {
      await ticTacToe.connect(player1).makeMove(0, 0);
      await ticTacToe.connect(player2).makeMove(0, 3);
      await ticTacToe.connect(player1).makeMove(0, 1);
      await ticTacToe.connect(player2).makeMove(0, 4);
      await ticTacToe.connect(player1).makeMove(0, 2);

      const [wins] = await ticTacToe.getPlayerStats(player1.address);
      expect(wins).to.equal(1);
    });
  });

  describe("Draw Condition", function () {
    it("Should detect draw when board is full with no winner", async function () {
      await ticTacToe.connect(player1).createGame();
      await ticTacToe.connect(player2).joinGame(0);

      // X O X
      // X X O
      // O X O
      await ticTacToe.connect(player1).makeMove(0, 0); // X
      await ticTacToe.connect(player2).makeMove(0, 1); // O
      await ticTacToe.connect(player1).makeMove(0, 2); // X
      await ticTacToe.connect(player2).makeMove(0, 5); // O
      await ticTacToe.connect(player1).makeMove(0, 3); // X
      await ticTacToe.connect(player2).makeMove(0, 6); // O
      await ticTacToe.connect(player1).makeMove(0, 4); // X
      await ticTacToe.connect(player2).makeMove(0, 8); // O
      await ticTacToe.connect(player1).makeMove(0, 7); // X

      const game = await ticTacToe.getGame(0);
      expect(Number(game.state)).to.equal(GameState.Draw);
    });

    it("Should emit GameDraw event", async function () {
      await ticTacToe.connect(player1).createGame();
      await ticTacToe.connect(player2).joinGame(0);

      await ticTacToe.connect(player1).makeMove(0, 0);
      await ticTacToe.connect(player2).makeMove(0, 1);
      await ticTacToe.connect(player1).makeMove(0, 2);
      await ticTacToe.connect(player2).makeMove(0, 5);
      await ticTacToe.connect(player1).makeMove(0, 3);
      await ticTacToe.connect(player2).makeMove(0, 6);
      await ticTacToe.connect(player1).makeMove(0, 4);
      await ticTacToe.connect(player2).makeMove(0, 8);

      await expect(ticTacToe.connect(player1).makeMove(0, 7))
        .to.emit(ticTacToe, "GameDraw")
        .withArgs(0);
    });
  });

  describe("View Functions", function () {
    it("Should return open games", async function () {
      await ticTacToe.connect(player1).createGame();
      await ticTacToe.connect(player2).createGame();
      await ticTacToe.connect(player3).joinGame(0);

      const openGames = await ticTacToe.getOpenGames();
      expect(openGames.length).to.equal(1);
      expect(openGames[0]).to.equal(1);
    });

    it("Should return player games", async function () {
      await ticTacToe.connect(player1).createGame();
      await ticTacToe.connect(player1).createGame();

      const playerGames = await ticTacToe.getPlayerGames(player1.address);
      expect(playerGames.length).to.equal(2);
    });

    it("Should return player stats", async function () {
      await ticTacToe.connect(player1).createGame();
      await ticTacToe.connect(player2).joinGame(0);

      // Quick win for player1
      await ticTacToe.connect(player1).makeMove(0, 0);
      await ticTacToe.connect(player2).makeMove(0, 3);
      await ticTacToe.connect(player1).makeMove(0, 1);
      await ticTacToe.connect(player2).makeMove(0, 4);
      await ticTacToe.connect(player1).makeMove(0, 2);

      const [wins, totalGames] = await ticTacToe.getPlayerStats(
        player1.address,
      );
      expect(wins).to.equal(1);
      expect(totalGames).to.equal(1);
    });
  });

  describe("NFT Functionality", function () {
    it("Should have correct NFT name and symbol", async function () {
      expect(await ticTacToe.name()).to.equal("TicTacToe Winner");
      expect(await ticTacToe.symbol()).to.equal("TTT");
    });

    it("Should return valid tokenURI", async function () {
      await ticTacToe.connect(player1).createGame();
      await ticTacToe.connect(player2).joinGame(0);

      // Win game to mint NFT
      await ticTacToe.connect(player1).makeMove(0, 0);
      await ticTacToe.connect(player2).makeMove(0, 3);
      await ticTacToe.connect(player1).makeMove(0, 1);
      await ticTacToe.connect(player2).makeMove(0, 4);
      await ticTacToe.connect(player1).makeMove(0, 2);

      const tokenURI = await ticTacToe.tokenURI(0);
      expect(tokenURI).to.include("data:application/json;base64,");
    });
  });
});
