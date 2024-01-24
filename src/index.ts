import { config } from "dotenv";
import { Client, Message, GatewayIntentBits } from "discord.js";
import * as fs from "fs";
import { TextChannel } from "discord.js";
import { authCommands, commands } from "./commands";
import { TOKEN, SAVE_GAME_DIR } from "./env";
import { startNextTurn } from "./host";
import { games, updateLocalStorage } from "./games";
import { readFile } from "./util";
import { createTurnStatusString, getNationStatus } from "./game-status";
const bot = new Client({
  intents: [
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.Guilds,
  ],
});
config();

bot.login(TOKEN);

const getChannel = async (name: string) => {
  const guilds = await bot.guilds.fetch();

  for (const [key, guild] of guilds) {
    const server = await guild.fetch();
    const channelList = await server.channels.fetch();
    const channel = <TextChannel | undefined>(
      channelList.find((channel) => channel.name === name)
    );
    if (channel) {
      return channel;
    }
  }
  return;
};

bot.on("messageCreate", (message: Message) => {
  const prefix = "!";
  if (!message.content.startsWith(prefix) || message.author.bot) {
    return;
  }

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  console.log("command received", command);
  if (commands[command]) {
    console.log("command recognized");
    commands[command](message, args);
  }

  if (message.author.tag == "olik") {
    if (authCommands[command]) {
      authCommands[command](message, args);
    }
  } else if (authCommands[command]) {
    message.channel.send("Restricted command, sry!");
  }
});

bot.on("ready", async () => {
  console.info(`Logged in as ${bot.user.tag}!`);

  Object.values(games).forEach(async (game) => {
    const channel: TextChannel = await getChannel(game.name);

    if (!channel) {
      return;
    }

    // load initial game data from file system and discord

    const pins = await channel.messages.fetchPinned();
    let gamePin: Message;
    pins.forEach((pin) => {
      if (pin.content.includes(`__Game__: ${game.name}`)) {
        gamePin = pin;
      }
    });

    if (!games[game.name].data) {
      games[game.name].data = {
        gamePin,
        currentTurn: -1,
        players: {},
        statusDump: "",
        turnStatusPost: undefined,
      };
    }
  });

  console.log("games.length", Object.keys(games).length);

  Object.values(games).forEach(async (game) => {
    const channel = await getChannel(game.name);

    if (!channel) {
      console.log("channel undefined");
      return;
    }

    const filePath = `${SAVE_GAME_DIR}/${game.name}`;
    console.log("watching filePath", filePath);

    fs.watch(filePath, async (event, filename) => {
      console.log("watch triggered");
      if (!(filename === "statusdump.txt" && event === "change")) {
        return;
      }
      const statusDump: string = await readFile(`${filePath}/${filename}`);

      // statusDump empty/undefined, return
      if (!statusDump) {
        console.log("no statusdump");
        return;
      }

      console.log("statusDump", statusDump);
      const data = game.data;
      // no new information, return
      if (data && data.statusDump === statusDump) {
        console.log("statusDump unchanged");
        return;
      }

      // set statusDump
      data.statusDump = statusDump;

      const lines = statusDump.split("\n");
      const turn = parseInt(lines[1].split(" ")[1]);

      // -1 can mean lobby or in-between turns, do nothing
      if (turn <= 0) {
        console.log("turn is -1");
        return;
      }

      const nationStatus = getNationStatus(lines);

      // Received invalid nation status, return
      if (!nationStatus) {
        console.log("invalid nation status");
        return;
      }
      let msg = createTurnStatusString(nationStatus, game, turn);

      let { turnStatusPost, gamePin } = data;

      if (data.currentTurn != turn) {
        const role = channel.guild.roles.cache.find(
          (role) => role.name === channel.name
        );

        if (role) {
          channel.send(`Turn ${turn} has started! ${role.toString()}`);
        }

        turnStatusPost = undefined;

        data.currentTurn = turn;
      }

      if (!turnStatusPost) {
        turnStatusPost = await sendWithTimeout(msg, 500, channel);

        // update latest status message
        data.turnStatusPost = turnStatusPost;
      } else {
        if (!turnStatusPost.edit) {
          turnStatusPost = await channel.messages.fetch(turnStatusPost.id);
        }
        turnStatusPost.edit(msg);
      }

      // update pin
      if (gamePin) {
        if (!gamePin.edit) {
          gamePin = await channel.messages.fetch(gamePin.id)
        }
        gamePin.edit(msg);
      } else {
        // if we don't have a pin, try to make one
        if (turnStatusPost && turnStatusPost.pinnable) {
          turnStatusPost.pin();
          data.gamePin = turnStatusPost;
        }
      }

      // start game if all players except Omniscience have finished
      if (nationStatus.hasOmniscience && nationStatus.allDone) {
        startNextTurn(game.name);
      }

      updateLocalStorage();
    });
  });
});

let sendTimeout: NodeJS.Timeout;

const sendWithTimeout = async (
  message: string,
  timeout: number,
  channel: TextChannel
): Promise<Message> => {
  let finalMessage: Message;
  return new Promise<Message>((resolve, reject) => {
    sendTimeout = setTimeout(async () => {
      clearTimeout(sendTimeout);
      finalMessage = await channel.send(message);
      resolve(finalMessage);
    }, timeout);
  });
};
