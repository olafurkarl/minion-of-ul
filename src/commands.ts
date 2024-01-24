import * as Discord from "discord.js";
import { hostGame, startNextTurn } from "./host";
import { getFormattedTimeAtZone } from "./timePong";
import * as fs from "fs";
import { EXTERNAL_IP, SAVE_GAME_DIR } from "./env";
import { games, updateLocalStorage } from "./games";
import { readFile } from "./util";
import { createLobbyStatusString, getSubmitStatus } from "./game-status";
import { allNations, getClosestNation, NationKey } from "./nations";

interface Commands {
  [key: string]: Function;
}

const isServerGuild = (message: Discord.Message): boolean => {
  return !!message.guild && message.guild.id === process.env.SERVER_ID;
};

const isPM = (message: Discord.Message): boolean => {
  return !message.guild;
};

const sendIfServerGuildOrPM = (
  message: Discord.Message,
  stringToSend: string
) => {
  if (isServerGuild(message) || isPM(message)) {
    message.channel.send(stringToSend);
  }
};

const getRandomInt = (max: number) => {
  const rand = Math.random();
  return Math.floor(rand * max);
};

const getGoblinMessage = (): string => {
  const typesOfSkveh = ["skvEH", "sqwEH", "squEH", "skwEH"];
  let totalSkveh = "";
  const skvehCount = getRandomInt(8) + 1;
  for (let i = 0; i < skvehCount; i++) {
    const skvehType = getRandomInt(3);
    let skveh = typesOfSkveh[skvehType];
    const eCount = getRandomInt(5) + 2; // 1 for minimum, 1 for js quirk
    const hCount = getRandomInt(3) + 2; // 1 for minimum, 1 for js quirk
    skveh = skveh.replace("H", new Array(hCount).join("h"));
    skveh = skveh.replace("E", new Array(eCount).join("e"));

    const capsSkveh = getRandomInt(3) === 1;
    if (capsSkveh) {
      skveh = skveh.toUpperCase();
    }
    totalSkveh += skveh + " ";
  }
  return totalSkveh;
};

export const authCommands: Commands = {
  host: (message: Discord.Message) => {
    const name = (message.channel as Discord.TextChannel).name;

    const port =
      Math.max(...[...Object.values(games)].map((game) => game.port)) + 1;
    hostGame(name, port);
    message.channel.send(
      `"Praise be to the Ul, hosting game ${name} on ip ${EXTERNAL_IP} port ${port}."`
    );
  },
  start: (message: Discord.Message) => {
    const name = (message.channel as Discord.TextChannel).name;

    startNextTurn(name);

    message.channel.send(`Starting next turn for game: ${name}.`);
  },
  delete: (message: Discord.Message) => {
    const name = (message.channel as Discord.TextChannel).name;
    const filePath = `${SAVE_GAME_DIR}/${name}`;
    fs.rmSync(filePath, { recursive: true, force: true });

    message.channel.send(`Removed game: ${name}.`);
  },
};

const getOrCreateRole = async (name: string, message: Discord.Message) => {
  const role = message.guild.roles.cache.find((role) => role.name === name);

  if (role) {
    return role;
  }
  const randomColor = `#${Math.floor(Math.random() * 16777215).toString(
    16
  )}` as Discord.HexColorString;
  const newRole = await message.guild.roles.create({
    name,
    color: randomColor,
  });

  return newRole;
};

export const commands: Commands = {
  showclaims: async (message: Discord.Message) => {
    const name = (message.channel as Discord.TextChannel).name;
    const game = games[name];
    if (!game || !game.data) {
      message.channel.send(`No game found with name ${name}.`);
      return;
    }

    let msg = "";

    console.log(game.data.players);

    for (const [k, v] of Object.entries(game.data.players)) {
      const user = message.guild.members.cache.get(v.id);
      msg += `${user} has claimed ${k}.\n`;
    }

    if (msg !== "") {
      message.channel.send(msg);
    }
  },
  claim: async (message: Discord.Message) => {
    const name = (message.channel as Discord.TextChannel).name;
    const game = games[name];
    if (!game || !game.data) {
      message.channel.send(`No game found with name ${name}.`);
      return;
    }
    const user = message.author;

    const nationString = message.content.split(" ")[1] as NationKey;

    if (!nationString) {
      message.channel.send(`Please specify a nation to claim.`);
    }
    const { best, closest } = getClosestNation(nationString);

    if (closest > 5) {
      message.channel.send(`No such nation.`);
      return;
    }

    if (!game.data.players) {
      game.data.players = {};
    }

    if (game.data.players[best]) {
      message.channel.send(`Nation has already been claimed.`);
      return;
    }

    const existingNation = Object.entries(game.data.players)
      .find(([, user]) => user.tag === message.author.tag);
    if (existingNation) {
      const prevNation = existingNation[0] as NationKey;
      delete game.data.players[prevNation];
      message.channel.send(`${prevNation} is now up for grabs.`)
    }
    game.data.players[best] = user;

    message.channel.send(`${message.author} has claimed ${best}.`);

    updateLocalStorage();
  },
  lobbystatus: async (message: Discord.Message) => {
    const name = (message.channel as Discord.TextChannel).name;
    const filePath = `${SAVE_GAME_DIR}/${name}`;

    const statusDump: string = await readFile(`${filePath}/statusdump.txt`);

    const lines = statusDump.split("\n");
    const turn = parseInt(lines[1].split(" ")[1]);
    if (turn === -1) {
      const nationStatus = getSubmitStatus(lines);
      const game = games[name];
      if (!game) {
        return;
      }
      let msg = createLobbyStatusString(nationStatus, game);
      message.channel.send(msg);
    }
  },
  subscribe: async (message: Discord.Message) => {
    const name = (message.channel as Discord.TextChannel).name;

    const role = await getOrCreateRole(name, message);
    message.member.guild.members.addRole({
      role,
      user: message.author,
    });

    message.channel.send(
      `Added role ${name} to ${message.author}, you will be notified of new turns.`
    );
  },
  unsubscribe: async (message: Discord.Message) => {
    const name = (message.channel as Discord.TextChannel).name;
    const role = message.guild.roles.cache.find((role) => role.name === name);

    message.member.guild.members.removeRole({
      role,
      user: message.author,
    });

    message.channel.send(`Removed role ${name} from ${message.author}.`);
  },
  mention: (message: Discord.Message) => {
    const role = message.member.roles.cache.find(
      (role) => role.name === (message.channel as Discord.TextChannel).name
    );

    if (role) {
      message.channel.send(role.toString());
    }
  },
  ping: (message: Discord.Message) => {
    message.channel.send("Pong.");
  },
  ooltime: (message: Discord.Message) => {
    sendIfServerGuildOrPM(message, getFormattedTimeAtZone("Australia/Sydney"));
  },
  ultime: (message: Discord.Message) => {
    sendIfServerGuildOrPM(message, getFormattedTimeAtZone("Australia/Sydney"));
  },
  svenktime: (message: Discord.Message) => {
    sendIfServerGuildOrPM(message, getFormattedTimeAtZone("Europe/Stockholm"));
  },
  bjanktime: (message: Discord.Message) => {
    sendIfServerGuildOrPM(message, getFormattedTimeAtZone("Europe/Copenhagen"));
  },
  kuftime: (message: Discord.Message) => {
    sendIfServerGuildOrPM(
      message,
      getFormattedTimeAtZone("Atlantic/Reykjavik")
    );
  },
  ovtime: (message: Discord.Message) => {
    sendIfServerGuildOrPM(
      message,
      getFormattedTimeAtZone("Atlantic/Reykjavik")
    );
  },
  perhaps: (message: Discord.Message) => {
    const eChars = getRandomInt(5);
    const aChars = getRandomInt(5);
    const capsPerhaps = getRandomInt(2) === 1;
    let perhaps = `Pe${new Array(eChars).join("e")}rha${new Array(aChars).join(
      "a"
    )}ps.`;
    if (capsPerhaps) {
      perhaps = perhaps.toUpperCase();
    }
    message.channel.send(perhaps);
  },
  hat: (message: Discord.Message) => {
    const hatCount = getRandomInt(7) + 1;
    let hat = "";
    for (let i = 0; i < hatCount; i++) {
      const capsHat = getRandomInt(2) === 1;
      const hatChars = getRandomInt(5);
      let extraHat = `ha${new Array(hatChars).join("a")}t`;

      if (capsHat) {
        extraHat = extraHat.toUpperCase();
      }

      hat += extraHat + " ";
    }
    message.channel.send(hat);
  },
  perbe: (message: Discord.Message) => {
    message.channel.send("https://imgflip.com/i/4v7hox");
  },
  goblin: (message: Discord.Message) => {
    message.channel.send(getGoblinMessage());
  },
  skveh: (message: Discord.Message) => {
    message.channel.send(getGoblinMessage());
  },
  sqwee: (message: Discord.Message) => {
    message.channel.send(getGoblinMessage());
  },
  noh: (message: Discord.Message) => {
    const howManyNoh = getRandomInt(4) + 1;
    let totalNoh = "";
    for (let i = 0; i < howManyNoh; i++) {
      const oChars = getRandomInt(8) + 1;
      const hChars = getRandomInt(8) + 1;
      let noh = `no${new Array(oChars).join("o")}${new Array(hChars).join(
        "h"
      )}h`;

      totalNoh += noh + " ";
    }
    message.channel.send(totalNoh);
  },
  fuk: (message: Discord.Message) => {
    const something = [
      "wai fuk nohh",
      "fuk fuk fuk",
      "maybe fuk?",
      "FUK FUK FUK.",
      "fuk ... perhaaps",
      "yes, fuk.",
      "fük",
    ];
    message.channel.send(something[getRandomInt(something.length)]);
  },
  random: (message: Discord.Message, args: string[]) => {
    const numString = args[0];
    if (numString && !isNaN(parseInt(numString))) {
      const number = parseInt(numString);
      const randomNum = getRandomInt(number) + 1;
      message.channel.send(`Perhaps... ${randomNum}`);
    }
  },
};
