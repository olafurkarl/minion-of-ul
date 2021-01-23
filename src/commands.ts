import * as Discord from 'discord.js'
import { hostGame } from './host';
import { getFormattedTimeAtZone } from './timePong'

interface Commands {
    [key: string]: Function
}

const isServerGuild = (message: Discord.Message): boolean => {
    return !!message.guild && message.guild.id === process.env.SERVER_ID
}

const isPM = (message: Discord.Message): boolean => {
    return !message.guild;
}

const sendIfServerGuildOrPM = (message: Discord.Message, stringToSend: string) => {
    if (isServerGuild(message) || isPM(message)) {
        message.channel.send(stringToSend)
    }
}

const getRandomInt = (max: number) => {
    return Math.floor(Math.random() * Math.floor(max));
  }

export const commands: Commands = {
    ping: (message: Discord.Message) => {
        message.channel.send('Pong.');
    },
    test: (message: Discord.Message) => {
        hostGame();
        message.channel.send('Boop.');
    },
    ooltime: (message: Discord.Message) => {
        sendIfServerGuildOrPM(message, getFormattedTimeAtZone('Australia/Sydney'));
    },
    ultime: (message: Discord.Message) => {
        sendIfServerGuildOrPM(message, getFormattedTimeAtZone('Australia/Sydney'));
    },
    svenktime: (message: Discord.Message) => {
        sendIfServerGuildOrPM(message, getFormattedTimeAtZone('Europe/Stockholm'));
    },
    bjanktime: (message: Discord.Message) => {
        sendIfServerGuildOrPM(message, getFormattedTimeAtZone('Europe/Copenhagen'));
    },
    kuftime: (message: Discord.Message) => {
        sendIfServerGuildOrPM(message, getFormattedTimeAtZone('Atlantic/Reykjavik'));
    },
    ovtime: (message: Discord.Message) => {
        sendIfServerGuildOrPM(message, getFormattedTimeAtZone('Atlantic/Reykjavik'));
    },
    perhaps: (message: Discord.Message) => {
        const eChars = getRandomInt(5);
        const aChars = getRandomInt(5);
        message.channel.send(`Pe${new Array(eChars).join('e')}rha${new Array(aChars).join('a')}ps.`);
    }
}