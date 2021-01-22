import { config } from "dotenv"
import * as Discord from 'discord.js'
import * as fs from 'fs';
import { TextChannel } from "discord.js";
import { hostGame } from './host';
const bot = new Discord.Client();
config();
const TOKEN = process.env.TOKEN;
const SERVER_ID = process.env.SERVER_ID;
const SAVE_GAME_DIR = `${process.env.HOME}/.dominions5/savedgames`
const games = ['test_omni'];

const columns = {
    BOT_OR_NOT: 3, 
    STATUS: 5,
    NATION: 7
}

enum TurnStatus { 'not started', 'not finished', 'finished' };

bot.login(TOKEN);

const getChannel = async (name: string) => {
    const server = await bot.guilds.fetch(SERVER_ID);
    const channel = <TextChannel> server.channels.cache.find(channel => channel.name === name)
    return channel;
}

interface GameData {
    [key: string]: {
        statusDump: string
        gamePin: Discord.Message
        turnStatusPost: Discord.Message;
        currentTurn: number
    }
}

const gameData: GameData = {}

bot.on('message', message => {
    const prefix = "!";
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'ping') {
        message.channel.send('Pong.');
    } else if (command === 'test') {
        hostGame();
        message.channel.send('Boop.');
    } else if (command === 'ooltime') {
        let options = {
            timeZone: 'Australia/Sydney',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
          },
        formatter = new Intl.DateTimeFormat([], options);
        message.channel.send(formatter.format(new Date()));
    }
    // other commands...
});

bot.on('ready', async () => {
  console.info(`Logged in as ${bot.user.tag}!`);

  games.forEach(async (game) => {
    const channel = await getChannel(game);
    channel.send("**I live to serve the Ul.**");

    // load initial game data from file system and discord

    const pins = await channel.messages.fetchPinned();
    let gamePin: Discord.Message;
    pins.forEach((pin) => {
        if (pin.content.includes(`__Game__: ${game}`)) {
            gamePin = pin;
        }
    })

    gameData[game] = {
        statusDump: '',
        gamePin,
        turnStatusPost: undefined,
        currentTurn: -1
    }
  });

  games.forEach(async (game) => {
    const channel = await getChannel(game);

    const filePath = `${SAVE_GAME_DIR}/${game}`;
    fs.watch(filePath, async (event, filename) => {
        if (filename === 'statusdump.txt' && event === 'change') {
            const statusDump: string = await readFile(`${filePath}/${filename}`);
            
            // no new information, return
            if (gameData[game] && gameData[game].statusDump === statusDump) {
                return;
            }

            console.log('statusDump', statusDump);
            if (statusDump) {
                // set statusDump
                gameData[game].statusDump = statusDump;
                
                const lines = statusDump.split('\n');
                const turn = parseInt(lines[1].split(" ")[1]);
                if (turn > 0) {

                    const nationStatus = getNationStatus(lines);
                    console.log(nationStatus);
                    let msg = createTurnStatusString(nationStatus, game, turn);

                    let { turnStatusPost, gamePin } = gameData[game];

                    if (gameData[game].currentTurn != turn) {
                        gameData[game].currentTurn = turn;
                        if (turnStatusPost) {
                            turnStatusPost = undefined;
                        }
                    }

                    if (!turnStatusPost) {
                        turnStatusPost = await sendWithTimeout(msg, 500, channel);

                        // update latest status message
                        gameData[game].turnStatusPost = turnStatusPost;
                    } else {
                        turnStatusPost.edit(msg);
                    }

                    // update pin
                    if (gamePin) {
                        gamePin.edit(msg);
                    } else {
                        // if we don't have a pin, try to make one
                        if (turnStatusPost && turnStatusPost.pinnable) {
                            turnStatusPost.pin();
                            gameData[game].gamePin = turnStatusPost;
                        }
                    }

                    // start game if all players except Omniscience have finished
                    if (nationStatus.hasOmniscience && nationStatus.allDone) {
                        startNextTurn(game);
                    }
                }
            }
        }
    });
  });
});

const startNextTurn = (game: string) => {
    const domCmdPath = `${SAVE_GAME_DIR}/${game}/domcmd`;
    fs.writeFile(domCmdPath, 'settimeleft 5', (err) => {
        if (err) return console.log(err);
        console.log(domCmdPath);
    });
}

const readFile = (dir: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        fs.readFile(dir, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            }
            resolve(data);
        });
    });
}

interface Player {
    nation: string,
    status: TurnStatus,
}

interface NationStatus {
    players: Array<Player>,
    bots: Array<string>,
    dead: Array<string>,
    allDone: boolean,
    hasOmniscience: boolean,
}

const getNationStatus = (lines: Array<string>): NationStatus => {
    const nationStatus: NationStatus = {
        players: [],
        bots: [],
        dead: [],
        allDone: false,
        hasOmniscience: false,
    }

    let done = 0;
    lines.forEach(line => {
        const cols = line.split('\t');

        if (cols.length < 9) { // skip header
            return;
        }

        const isDead = parseInt(cols[columns.BOT_OR_NOT]) === -1;
        const isBot = parseInt(cols[columns.BOT_OR_NOT]) === 2;

        const nation = cols[columns.NATION];

        const isOmni = nation === 'Omniscience';

        if (isOmni) {
            nationStatus.hasOmniscience = true;
            return;
        }
        if (isDead) {
            nationStatus.dead.push(nation);
            return;
        }
        if (isBot) {
            nationStatus.bots.push(nation);
            return;
        }
        // we have a player!
        const status = parseInt(cols[columns.STATUS]);
        if (status === TurnStatus.finished) {
            done += 1;
        }
        nationStatus.players.push({
            nation,
            status,
        })
    })
    if (done === nationStatus.players.length) {
        nationStatus.allDone = true;
    }
    return nationStatus;
}

const createTurnStatusString = (nationStatus: NationStatus, game: string, turn: number): string => {
    let msg = `__Game__: ${game} __Turn__: ${turn}`;
    nationStatus.players.forEach(player => {
        msg += "\n";
        const { nation, status } = player;
        if (status === TurnStatus.finished) {
            msg += "✅ ";
        } else {
            msg += "❌ "
        }
        msg += `${nation} has ${TurnStatus[status]} their turn`;
    });
    if (nationStatus.bots.length > 0) {
        msg += "\n🤖 AI: ";
        for (let i = 0; i < nationStatus.bots.length; i++) {
            msg += nationStatus.bots[i];
            if (i !== nationStatus.bots.length - 1) {
                msg += ", ";
            }
        }
    }
    if (nationStatus.dead.length > 0) {
        msg += "\n💀 Dead: ";
        for (let i = 0; i < nationStatus.dead.length; i++) {
            msg += nationStatus.dead[i];
            if (i !== nationStatus.dead.length - 1) {
                msg += ", ";
            }
        }
    }
    if (nationStatus.hasOmniscience) {
        msg += "\n🧿 This game is being watched carefully"
    }
    return msg;
}

let sendTimeout: NodeJS.Timeout;

const sendWithTimeout = async (message: string, timeout: number, channel: TextChannel): Promise<Discord.Message> => {
    let finalMessage: Discord.Message;
    return new Promise<Discord.Message>((resolve, reject) => {
        sendTimeout = setTimeout(async () => {
            clearTimeout(sendTimeout);
            finalMessage = await channel.send(message);
            resolve(finalMessage);
        }, timeout)
    })
}

