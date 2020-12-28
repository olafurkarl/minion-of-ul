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
    STATUS: 4,
    NATION: 7
}

const statuses = ['not started', 'not finished', 'finished'];

bot.login(TOKEN);

bot.on('ready', async () => {
  console.info(`Logged in as ${bot.user.tag}!`);
  const channel = <TextChannel> await bot.channels.fetch(CHANNEL_ID);
  channel.send("Hello world");

  games.forEach(game => {
    console.log(game);
    const filePath = `${SAVE_GAME_DIR}/${game}/statusdump.txt`;
    fs.watch(filePath, (event, filename) => {
        console.log(event);
        if (event === 'change') {
            fs.readFile(filePath, 'utf8', (err, data) => {
                console.log(data)
                const lines = data.split('\n');
                console.log(lines.length)
                let msg = "```Game Update:\n";
                lines.forEach(line => {
                    const cols = line.split('\t');
                    console.log(cols.length)
                    console.log(cols)
                    if (cols.length < 9) {
                        return;
                    }
                    const nation = cols[columns.NATION];
                    const status = parseInt(cols[columns.STATUS]);
                    let statusMsg = "";
                    console.log(`status: ${status}`)
                    msg += `\n${nation} has ${statuses[status]} their turn`;
                })
                msg += "\n```";
                channel.send(msg);
            });
        }
    });
  });

});

