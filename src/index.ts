import { config } from "dotenv"
import * as Discord from 'discord.js'
import * as fs from 'fs';
import { TextChannel } from "discord.js";
const bot = new Discord.Client();
config();
const TOKEN = process.env.TOKEN;
const SERVER_ID = process.env.SERVER_ID;
const SAVE_GAME_DIR = `${process.env.HOME}/.dominions5/savedgames`
const games = ['test_bot'];

const columns = {
    BOT_OR_NOT: 3, 
    STATUS: 5,
    NATION: 7
}

const statuses = ['not started', 'not finished', 'finished'];

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
        turnStatusMessage: Discord.Message;
        currentTurn: number
    }
}

const gameData: GameData = {}

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
        turnStatusMessage: undefined,
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

            if (statusDump) {
                // set statusDump
                gameData[game].statusDump = statusDump;
                
                const lines = statusDump.split('\n');
                const turn = parseInt(lines[1].split(" ")[1]);
                if (turn > 0) {
                    let msg = `__Game__: ${game} __Turn__: ${turn}`;

                    const bots: Array<string> = [];
                    const dead: Array<string> = [];
                    msg = addNationMsg(lines, msg, bots, dead);
                    msg = addBotMsg(msg, bots, dead);

                    let { turnStatusMessage, gamePin } = gameData[game];

                    if (gameData[game].currentTurn != turn) {
                        gameData[game].currentTurn = turn;
                        if (turnStatusMessage) {
                            turnStatusMessage = undefined;
                        }
                    }

                    if (!turnStatusMessage) {
                        turnStatusMessage = await sendWithTimeout(msg, 500, channel);

                        // update latest status message
                        gameData[game].turnStatusMessage = turnStatusMessage;
                    } else {
                        turnStatusMessage.edit(msg);
                    }

                    // update pin
                    if (gamePin) {
                        gamePin.edit(msg);
                    } else {
                        // if we don't have a pin, try to make one
                        if (turnStatusMessage && turnStatusMessage.pinnable) {
                            turnStatusMessage.pin();
                        }
                    }
                }
            }
        }
    });
  });
});

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

const addNationMsg = (lines: Array<string>, msg: string, bots: Array<string>, dead: Array<string>): string => {
    lines.forEach(line => {
        const cols = line.split('\t');

        if (cols.length < 9) {
            return;
        }

        const isDead = parseInt(cols[columns.BOT_OR_NOT]) === -1;
        const isBot = parseInt(cols[columns.BOT_OR_NOT]) === 2;

        const nation = cols[columns.NATION];
        if (isDead) {
            dead.push(nation);
        } else if (isBot) {
            bots.push(nation);
        } else {
            const status = parseInt(cols[columns.STATUS]);
            msg += "\n";
            if (status === 2) { // 2 means finished
                msg += "✅ ";
            } else {
                msg += "❌ "
            }
            msg += `${nation} has ${statuses[status]} their turn`;
        }
    })
    return msg;
}

const addBotMsg = (msg: string, bots: Array<string>, dead: Array<string>): string => {
    if (bots.length > 0) {
        msg += "\n🤖 AI: ";
        for (let i = 0; i < bots.length; i++) {
            msg += bots[i];
            if (i !== bots.length - 1) {
                msg += ", ";
            }
        }
    }

    if (dead.length > 0) {
        msg += "\n💀 Dead: ";
        for (let i = 0; i < dead.length; i++) {
            msg += dead[i];
            if (i !== dead.length - 1) {
                msg += ", ";
            }
        }
    }

    return msg;
}

let sendTimeout: NodeJS.Timeout;

const sendWithTimeout = async (message: string, timeout: number, channel: TextChannel): Promise<Discord.Message> => {
    let finalMessage: Discord.Message;
    return new Promise<Discord.Message>((resolve, reject) => {
        sendTimeout = setTimeout(async () => {
            clearTimeout(sendTimeout);
            console.log("sending")
            finalMessage = await channel.send(message);
            resolve(finalMessage);
        }, timeout)
    })
}

