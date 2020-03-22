const Discord = require('discord.js');
const BaseCommand = require('../lib/command');
const request = require('../lib/requests');
var chrono = require('chrono-node');

class Command extends BaseCommand {

    REACTION_YES = {
        emoji: '✅',
        name: 'Deltager',
        crew: 0,
    };
    REACTION_NO = {
        emoji: '❌',
        name: 'Deltager ikke',
        crew: 0,
    };
    REACTION_MAYBE = {
        emoji: '❔',
        name: 'Deltager måske',
        crew: 0,
    };

    constructor() {
        super();
        this.name = 'event';
        this.description = 'Opret en begivenhed med simpel tilbagemelding eller med roller, hvis du ikke angiver parametre så spørger jeg dig om dem.';
        this.usage = 'event [title] [time]\n'+
                     '> Opret en simpel event med en titel og tidspunkt. Angiv :time som dato med tid, eller på engelsk som "friday 20:00".\n'+
                     '> Eksempel: event "Inside Star Citizen" Thursday 21:00\n'+
                     'event roles [roles] [title] [time]\n'+
                     '> Opret event med definerede roller. Flere roller kan defineres ved at adskille med komma, antal efter ":", {rolle1:2,rolle2:4}.\n'+
                     '> Eksempel: event roles Traders:2,Gunners:4,Fighters:3 "Cargo run to Arial" Wednesday 20:00';
        
        this.conversations = {
            default: {
                title: {
                    question: 'Hvad er titlen på begivenheden?',
                    answer: 'Titel',
                    next: 'time'
                },
                time: {
                    question: 'Hvad tidspunkt er begivenheden?',
                    answer: 'Tid',
                    next: 'confirm',
                },
                confirm: {
                    question: 'Er du sikker på jeg skal oprette begivenheden (yes/no)?',
                    help: 'Hvis du ønsker at ændre noget skal du bare starte forfra, ved at sende en "event" kommando til mig.',
                    showAnswers: true,
                    next: {
                        yes: '#save#',
                        no: '#cancel#',
                    }
                }
            },
            roles: {
                roles: {
                    question: 'Hvad er navnet på rollen og hvor mange skal du bruge?',
                    help: 'Skriv en titel eller navn på rollen, efterfuldt af antallet du skal bruge.',
                    answer: 'Rolle(r)',
                    next: 'more',
                    validation: '^(.+) (\\d+)$',
                    pushToArray: true,
                },
                more: {
                    question: 'Skal du oprette en rolle mere?',
                    next: {
                        yes: 'roles',
                        no: 'title',
                    }
                },
                title: {
                    question: 'Hvad er titlen på begivenheden?',
                    answer: 'Titel',
                    next: 'time'
                },
                time: {
                    question: 'Hvad tidspunkt er begivenheden?',
                    answer: 'Tid',
                    next: 'confirm',
                },
                confirm: {
                    question: 'Er du sikker på jeg skal oprette begivenheden (yes/no)?',
                    help: 'Hvis du ønsker at ændre noget skal du bare starte forfra, ved at sende en "event roles" kommando til mig.',
                    showAnswers: true,
                    next: {
                        yes: '#save#',
                        no: '#cancel#',
                    }
                }
            }
        };
    }

    execute(message, args, dataMessage) {
        if (args.length === 0) {
            // They did not give any instructions on what to do, start default conversation
            args.push('default');
            this.handleConversation(message, args, dataMessage)
        }
        else {
            switch (args[0]) {
                case 'default':
                    try {
                        this.handleConversation(message, args, dataMessage)
                    }
                    catch (e) {
                        if (e.state) {
                            if (e.state === 'save') {
                                this.createEvent(message,
                                    e.data.guild,
                                    e.data.values.title, 
                                    new Date(chrono.parseDate(e.data.values.time + ' CET', Date.now(), { forwardDate: true }))
                                );
                            }
                        }
                    }
                    break;
                case 'roles':
                    if (args.length === 1) {
                        // They want a roles based event, but did not give the info on command, start conversation
                        try {
                            this.handleConversation(message, args, dataMessage)
                        }
                        catch (e) {
                            if (e.state) {
                                if (e.state === 'save') {
                                    var roles = e.data.values.roles.map(r => {
                                        var r2 = r.match(/^(.+) (\d)$/);
                                        return [r2[1], r2[2]];
                                    });
                                    this.createEvent(message,
                                        e.data.guild,
                                        e.data.values.title, 
                                        new Date(chrono.parseDate(e.data.values.time + ' CET', Date.now(), { forwardDate: true })), 
                                        roles);
                                }
                            }
                        }
                    }
                    else {
                        let subcmd = args.shift();  // first is sub command = roles
                        let roles = args.shift();   // second is the roles definition
                        let title = args.shift();   // third is title of the event
                        let time = args.join(' ');  // any following is the time of event
                        roles = roles.split(/,/).map(v => v.split(/:/));
                        time = new Date(chrono.parseDate(time + ' CET', Date.now(), { forwardDate: true }));
                        this.createEvent(message, message.guild.id, title, time, roles);
                    }
                    break;
                default:
                    let title = args.shift();   // third is title of the event
                    let time = args.join(' ');  // any following is the time of event
                    time = new Date(chrono.parseDate(time + ' CET', Date.now(), { forwardDate: true }));
                    this.createEvent(message, message.guild.id, title, time);
                    break;
            }
        }
    }

    createEvent(message, guildId, title, time, roles = []) {
        const embed = new Discord.MessageEmbed();
        embed.setTitle('🗓 '+title);
        embed.setDescription('Begivneheden starter ' + time.toLocaleString('da', {
            timeZone: 'Europe/Copenhagen',
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZoneName: 'short', hour: '2-digit', minute: '2-digit'
        }));
        roles.forEach((r,i) => {
            embed.addField(String.fromCharCode(0x0031+i, 0xFE0F, 0x20E3) + ` ${r[0]} (0/${r[1]})`, '-', true);
        });
        embed.addField(this.REACTION_YES.emoji + ' ' + this.REACTION_YES.name, '-', true);
        embed.addField(this.REACTION_MAYBE.emoji + ' ' + this.REACTION_MAYBE.name, '-', true);
        embed.addField(this.REACTION_NO.emoji + ' ' + this.REACTION_NO.name, '-', true);
        embed.addField('Der er endnu ingen tilmeldinger', 'Giv besked ved at trykke på en reaktion under beskeden.');
        BaseCommand.encodeFooter(embed, {
            command: 'event',
            time: time,
            roles: roles,
        });
        this.client.guilds.cache.find(g => g.id === guildId)
            .channels.cache.find(c => c.name === 'events').send(embed)
            .then(async m => {
                roles.forEach(async (r,i) => {
                    await m.react(String.fromCharCode(0x0031+i, 0xFE0F, 0x20E3));
                });
                await m.react(this.REACTION_YES.emoji);
                await m.react(this.REACTION_MAYBE.emoji);
                await m.react(this.REACTION_NO.emoji);
            })
            .catch(e => console.log(e));
    }

    executeReaction(event, reaction, user, data) {
        // Remove old default reactions
        reaction.message.reactions.cache.filter(r => ['🙋', '🤷', '🙅'].includes(r.emoji.name)).each(async r => {
            console.log('Cleaning up old reaction', r.emoji.name);
            await r.remove();
        });
        
        var embed = reaction.message.embeds.pop();

        var reactionList = [];
        data.roles.forEach((r, i) => {
            reactionList.push({
                emoji: String.fromCharCode(0x0031+i, 0xFE0F, 0x20E3),
                name: r[0],
                crew: r[1],
            });
        });
        reactionList.push(this.REACTION_YES);
        reactionList.push(this.REACTION_MAYBE);
        reactionList.push(this.REACTION_NO);
        
        var mr = null;
        var total = 0;
        var count = 0;
        let userFetches = [];
        // We need to fetch the users of all reactions to build the fields
        reaction.message.reactions.cache.each(r => {
            userFetches.push(r.users.fetch());
        });
        Promise.all(userFetches).then(() => {
            let excludeUsers = null;
            reactionList.forEach((r, i) => {
                // Make sure the bot is excluded from attendance lists
                excludeUsers = [this.client.user.id];
                mr = reaction.message.reactions.cache.find(re => re.emoji.name === r.emoji);
                if (mr) {
                    // if this is not a remove event, then check if the user is on another reaction, and the bot should not remove it own reactions
                    if (event !== 'remove' && mr.emoji.name !== reaction.emoji.name && mr.users.cache.has(user.id) && this.client.user.id != user.id) {
                        // exclude the user and remove the user async from the reaction
                        excludeUsers.push(user.id);
                        mr.users.remove(user.id);
                    }
                    // Build a list of users except the 
                    embed.fields[i].value = mr.users.cache.filter(u => !excludeUsers.includes(u.id)).map(u => '> <@' + u.id + '>').join('\n');
                    count = mr.users.cache.size-1;
                }
                if (embed.fields[i].value === '') {
                    embed.fields[i].value = '-';
                    count = 0;
                }
                embed.fields[i].name = `${r.emoji} ${r.name}` + (r.crew ? ` (${count}/${r.crew})` : ` (${count})`);
                total += count;
            });
            embed.fields[reactionList.length].name = `Der er ${total} bruger(e) som har givet besked`;
            reaction.message.edit(embed)
            .then(async m => {
                reactionList.forEach(async (r,i) => {
                    if (!m.reactions.cache.has(r.emoji)) {
                        await m.react(r.emoji);
                    }
                });
                console.log('done', event, reaction.emoji.name, user.username);
            })
            .catch(e => console.log(e));
        });
    }

    add(message, args, dataMessage) {
        try {
            this.handleConversation(message, args, dataMessage)
        }
        catch (e) {
            if (e.state) {
                if (e.state === 'save') {
                    const p = e.data.values.boughtPrice.split(/ /);
                    const data = {
                        title: e.data.values.title,
                        purchased: {
                            price: p[0],
                            currency: p[1],
                            datetime: e.data.values.boughtDate
                        },
                        insurance: this.conversations.add.insurance.choices[e.data.values.insurance-1],
                        type: this.conversations.add.type.choices[e.data.values.type-1],
                        contains: e.data.values.shipType,
                        imageUri: e.data.values.image,
                    };
                    console.log(data);
                    request.post('gear-groups', data, d => {
                        message.reply('your gear group was succesfully saved!');
                    }, e => {
                        message.reply('an error occured while saving your gear group. I am very sorry but please try again later.');
                    });
                }
                else {
                    message.reply('i did not save your gear group. You can start over with "fleet add".');
                }
            }
        }
    }
};

module.exports = new Command();
