import { config } from "dotenv"
import * as Discord from 'discord.js'
import * as fs from 'fs';
import { TextChannel } from "discord.js";
const bot = new Discord.Client();
config();
const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const SAVE_GAME_DIR = `${process.env.HOME}/.dominions5/savedgames`
const games = ['bot_test'];

const columns = {
    BOT_OR_NOT: 3, 
    STATUS: 5,
    NATION: 7
}

const statuses = ['not started', 'not finished', 'finished'];

bot.login(TOKEN);

const getChannel = async () => {
    const channel = <TextChannel> await bot.channels.fetch(CHANNEL_ID);
    return channel;
}

bot.on('ready', async () => {
  console.info(`Logged in as ${bot.user.tag}!`);
  const channel = await getChannel();
  channel.send("**I live to serve the Ul.**");

  games.forEach(game => {
    console.log(game);
    const filePath = `${SAVE_GAME_DIR}/${game}`;
    fs.watch(filePath, (event, filename) => {
        if (filename === 'statusdump.txt' && event === 'change') {
            fs.readFile(`${filePath}/${filename}`, 'utf8', (err, data) => {
                console.log(data)
                if (data) {
                    const lines = data.split('\n');
                    const turn = parseInt(lines[1].split(" ")[1]);
                    if (turn > 0) {
                        let msg = `__Game__: ${game} __Turn__: ${turn}\n`;
                        const bots: Array<string> = [];
                        const dead: Array<string> = [];
                        msg = addNationMsg(lines, msg, bots, dead);
                        msg = addBotMsg(msg, bots, dead);
                        sendWithTimeout(msg, 500);
                    }
                }
            });
        }
    });
  });
});

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
    msg += "\n🤖 AI: ";
    for (let i = 0; i < bots.length; i++) {
        msg += bots[i];
        if (i !== bots.length - 1) {
            msg += ", ";
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

const sendWithTimeout = async (message: string, timeout: number) => {
    sendTimeout = setTimeout(async () => {
        clearTimeout(sendTimeout);
        const channel = await getChannel();
        channel.send(message);
    }, timeout)
}

