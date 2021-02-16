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
    const rand = Math.random();
    return Math.floor(rand * max);
}

const getGoblinMessage = (): string => {
    const typesOfSkveh = [
        'skvEH',
        'sqwEH',
        'squEH',
        'skwEH',
    ]
    let totalSkveh = '';
    const skvehCount = getRandomInt(8) + 1;
    for (let i = 0; i < skvehCount; i++) {
        const skvehType = getRandomInt(3);
        let skveh = typesOfSkveh[skvehType];
        const eCount = getRandomInt(5) + 2; // 1 for minimum, 1 for js quirk
        const hCount = getRandomInt(3) + 2; // 1 for minimum, 1 for js quirk
        skveh = skveh.replace('H', new Array(hCount).join('h'))
        skveh = skveh.replace('E', new Array(eCount).join('e'))

        const capsSkveh = getRandomInt(3) === 1;
        if (capsSkveh) {
            skveh = skveh.toUpperCase();
        }
        totalSkveh += skveh + ' ';
    }
    return totalSkveh;
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
        const capsPerhaps = getRandomInt(2) === 1;
        let perhaps = `Pe${new Array(eChars).join('e')}rha${new Array(aChars).join('a')}ps.`;
        if (capsPerhaps) {
            perhaps = perhaps.toUpperCase();
        }
        message.channel.send(perhaps);
    },
    hat: (message: Discord.Message) => {
        const hatCount = getRandomInt(7) + 1;
        let hat = '';
        for (let i = 0; i < hatCount; i++) {
            const capsHat = getRandomInt(2) === 1;
            const hatChars = getRandomInt(5);
            let extraHat = `ha${new Array(hatChars).join('a')}t`

            if (capsHat) {
                extraHat = extraHat.toUpperCase();
            }

            hat += extraHat + ' '
        }
        message.channel.send(hat);
    },
    perbe: (message: Discord.Message) => {
        message.channel.send('https://imgflip.com/i/4v7hox');
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
        let totalNoh = '';
        for (let i = 0; i < howManyNoh; i++) {
            const oChars = getRandomInt(8) + 1;
            const hChars = getRandomInt(8) + 1;
            let noh = `no${new Array(oChars).join('o')}${new Array(hChars).join('h')}h`

            totalNoh += noh + ' '
        }
        message.channel.send(totalNoh);
    }, 
    fuk: (message: Discord.Message) => {
        const something = [
            'wai fuk nohh',
            'fuk fuk fuk',
            'maybe fuk?',
            'FUK FUK FUK.',
            'fuk ... perhaaps',
            'yes, fuk.',
            'fük'
        ]
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
}