import { ActivePlayers, IGameArgs, IGameCtx } from 'boardgame.io/core';
import { words } from './constants';
import { Card, CardColor, IG, Phases, TeamColor } from './definitions';
import {
  chooseCard,
  clueGiven,
  getActivePlayersWithoutSpymaster,
  getCurrentTeam,
  getOtherTeam,
  getPlayerTeam,
  makeCard,
  makeSpymaster,
  makeTeam,
  pass,
  startGame,
  switchTeam,
} from './util';

const GameConfig: IGameArgs = {
  name: 'secretcodes',

  setup: (ctx): IG => {
    const teams = new Array(2).fill(0).map((_, i) => makeTeam(i === 0 ? TeamColor.Blue : TeamColor.Red));
    if (ctx.numPlayers === 2) {
      teams[0].playersID = ['0'];
      teams[0].spymasterID = '0';
      teams[1].playersID = ['1'];
      teams[1].spymasterID = '1';
    }
    const cards = ctx.random
      .Shuffle(words)
      .slice(0, 25)
      .map((word) => makeCard(word));
    return {
      teams,
      cards,
    };
  },

  playerView: (G: IG, ctx: IGameCtx, playerID: string): any => {
    if (playerID === null) return G;
    if (ctx.phase !== Phases.giveClue && ctx.phase !== Phases.guess) return G;
    if (playerID == G.teams[0].spymasterID || playerID == G.teams[1].spymasterID) return G;

    const { cards } = G;
    return {
      ...G,
      cards: cards.map((card: Card) => {
        let c = {
          word: card.word,
          revealed: card.revealed,
        };
        // @ts-ignore
        if (c.revealed) c.color = card.color;
        return c;
      }),
    };
  },

  phases: {
    [Phases.lobby]: {
      start: true,
      moves: {
        switchTeam,
        makeSpymaster,
        startGame,
      },

      next: Phases.giveClue,

      turn: {
        activePlayers: ActivePlayers.ALL,
      },
    },

    [Phases.giveClue]: {
      next: Phases.guess,
      turn: {
        order: {
          first: () => 0,
          next: () => 0,
          playOrder: (G: IG): string[] => [getCurrentTeam(G).spymasterID],
        },
      },
      moves: {
        clueGiven,
      },
    },

    [Phases.guess]: {
      next: Phases.giveClue,
      turn: {
        order: {
          first: () => 0,
          next: () => 0,
          playOrder: (G: IG, ctx: IGameCtx): string[] => getActivePlayersWithoutSpymaster(getCurrentTeam(G), ctx),
        },
      },
      moves: {
        chooseCard: {
          // @ts-ignore
          move: chooseCard,
          client: false,
        },
        pass: {
          // @ts-ignore
          move: pass,
          client: false,
        },
      },
    },
  },

  endIf: (G: IG, ctx: IGameCtx) => {
    // turn 1 is used to setup the game so we only check from turn 2 and up
    if (ctx.turn >= 2) {
      const assassin = G.cards.find((card) => card.color === CardColor.assassin);
      const blue = G.cards.filter((card) => card.color === CardColor.blue && !card.revealed);
      const red = G.cards.filter((card) => card.color === CardColor.red && !card.revealed);

      if (assassin.revealed) {
        return {
          winner: getOtherTeam(G, getPlayerTeam(G, ctx.currentPlayer)),
        };
      }
      if (blue.length === 0)
        return {
          winner: G.teams.find((team) => team.color === TeamColor.Blue),
        };
      if (red.length === 0)
        return {
          winner: G.teams.find((team) => team.color === TeamColor.Red),
        };
    }
  },
};

export const SecretcodesGame = GameConfig;