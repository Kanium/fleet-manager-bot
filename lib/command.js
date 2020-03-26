const request = require('./requests');
const zlib = require('zlib');

module.exports = class Command {
    name = '';
    aliases = [];
    args = [];
    usage = '';

    // The command name that was actually used, in case of there being aliases
    usedName = '';
    // The discord client
    client = null;

    // Filter for only use command in DM's
    dmOnly = false;
    // Filter for only use command outside DM's
    guildOnly = false;
    // Filter to only use outside DM's in a specific guild/server
    onlyGuildId = null;

    // Filter to require the registered user to have a specific role
    requireRole = '';
    // Filter if the role exists in the guild, then require the registered user to have a specific role
    ifRoleExists = '';

    // Store the guild, guild roles and the member user of the guild, used internally
    guild;
    roles;
    member;

    setNameUsed(name) {
        this.usedName = name;
    }

    validate(message, args = []) {
        let _cmd = this;
        return new Promise((resolve, reject) => {
            if (_cmd.dmOnly && message.channel.type === 'text') {
                return reject(`I am sorry but I can only do that in DM, not in a server.`);
            }
            if (_cmd.guildOnly && message.channel.type !== 'text') {
                return reject(`I am sorry but I can only do that in a server, not in DM.`);
            }

            if (_cmd.onlyGuildId && (!message.guild || Number(message.guild.id) !== Number(_cmd.onlyGuildId))) {
                return reject(`I am not allowed to do that here!`);
            }

            if (args.length < _cmd.args.length) {
                return reject(`I am sorry but I require more information!\nUsage: ` + _cmd.usage);
            }

            if (_cmd.requireRole !== '') {
                request.get('user/' + message.author.id,
                    (json) => {
                        const guild = client.guilds.cache.find(g => g.id === json.user.orgId);
                        const requiredRole = guild.roles.cache.find(r => r.name === _cmd.requireRole);
                        if (!requiredRole) {
                            return reject('sorry I can not do that. Your server does not have an admin role!');
                        }
                        const member = guild.members.cache.find(u => u.id === message.author.id);
                        if (member.roles.cache.has(requiredRole.id)) {
                            return resolve({
                                message: 'message command validated, member has required role',
                                guild: guild,
                                requiredRole: requiredRole,
                                member: member
                            });
                        }
                        else {
                            return reject('sorry, but you are not an admin in your organization!');
                        }
                    },
                    (json) => {
                        return reject('sorry but you do not seem to be registered!');
                    },
                    (err) => {
                        return reject('sorry, but the deregistration failed to complete.');
                    }
                );
            }
            else {
                return resolve('message command validated');
            }
        });
    }

    execute(message, args) {
        console.log('You need to implement what your command "' + this.name + '" needs to do!');
    }

    handleConversation(message, args, dataMessage) {
        let data = {};
        if (!dataMessage) {
            // We are showing the first question in the conversation, initialize the data object.
            data = {
                guild: message.guild ? message.guild.id : null,
                command: this.name,
                args: args,
                next: Object.keys(this.conversations[args[0]])[0],
                values: {},
            };
        }
        else {
            data = Command.decodeFooter(dataMessage);
        }

        // If question is multiple choice, fetch the chosen next question
        if (typeof data.next === 'object') {
            const answer = String(message.content).toLowerCase();
            if (!data.next[answer]) {
                return this.sendNextQuestion(message,
                    'You have to answer "yes" or "no"!',
                    'Please look at the question again and give me a correct answer.', data, 'RED');
            }
            data.next = data.next[answer];
        }
        if (data.next === '#save#') {
            throw { state: 'save', data: data };
        }
        if (data.next === '#cancel#') {
            throw { state: 'cancel', data: data };
        }
        let currentQuestion = data.next;
        let preStep = this.conversations[args[0]][data.prev];
        let curStep = this.conversations[args[0]][currentQuestion];

        // --- Handle answer
        // if we have asked a question by seeing the value store is initialized, then save the answer
        if (data.values[data.prev] !== undefined) {
            // Validation of answer
            if (Array.isArray(data.validation) && !data.validation.includes(Number(message.content))) {
                console.log('Answer is not a valid value', message.content, data.validation);
                return this.sendNextQuestion(message,
                    'You did not give a valid answer!',
                    'Please look at the question again and give me a correct answer.', data, 'RED');
            }
            else if (typeof data.validation === 'string' && !RegExp(data.validation).test(message.content)) {
                return this.sendNextQuestion(message,
                    'You did not give a valid answer!',
                    'Please look at the question again and give me a correct answer.', data, 'RED');
            }

            if (typeof data.values[data.prev] === 'object') {
                if (Array.isArray(data.values[data.prev])) {
                    data.values[data.prev].push(message.content);
                }
                else {
                    if (message.attachments.array().length !== 1) {
                        return this.sendNextQuestion(message,
                            'I reuire you to attach an image!',
                            'Please send me an image attached to your reply.', data, 'RED');
                    }
                    data.values[data.prev].uri = message.attachments.first().url;
                }
            }
            else {
                data.values[data.prev] = message.content;
            }
        }

        // initialize the values element for this questioon
        if (data.values[currentQuestion] === undefined) {
            if (curStep.answerThumbnail) {
                data.values[currentQuestion] = { uri: '' };
            } else if (curStep.pushToArray) {
                data.values[currentQuestion] = [];
            } else {
                data.values[currentQuestion] = '';
            }
        }

        data.validation = curStep.validation;

        // --- Prepare next question
        let options = {};
        let desc = '';
        let prevValue = data.values[data.prev];
        if (curStep.help) {
            desc += curStep.help + '\n';
        }
        if (curStep.choices) {
            desc += 'Please choose one of the following values, by writting the number for the value in your message to me:\n```\n';
            const ret = this.getChoicesFromQuestion(curStep, prevValue);
            prevValue = ret[1]; // Convert the indexed previus value to a nice string

            // Add choices to description
            data.validation = [];
            ret[0].forEach((choice, i) => {
                desc += (i + 1) + ') ' + choice + '\n';
                data.validation.push(i + 1);
            });
            desc += '```\n';
        }

        if (curStep.showAnswers) {
            let step = {};
            Object.keys(data.values).forEach(k => {
                let v = data.values[k];
                step = this.conversations[args[0]][k];
                if (step.answerThumbnail) {
                    options.image = v.uri;
                }
                else if (step.answer) {
                    desc += '**' + step.answer + ':** ';
                    if (typeof step.choices === 'string') {
                        const ret = this.getChoiceFileData(step.choices);
                        if (Array.isArray(v)) {
                            desc += '\n';
                            ret.json.forEach(m => {
                                m[ret.choices[1]].forEach(e => {
                                    if (v.includes(String(e.id))) {
                                        desc += '- ' + m[ret.choices[0]] + ', ' + e.name + '\n';
                                    }
                                });
                            });
                        }
                    }
                    else if (Array.isArray(step.choices)) {
                        desc += step.choices[v-1] + '\n';
                    }
                    else {
                        desc += v + '\n';
                    }
                }
            });
        }
        data.prev = data.next;
        data.next = curStep.next;
        this.sendNextQuestion(message, String(curStep.question).replace(':prevValue', prevValue), desc, data, options);
    }

    sendNextQuestion(message, title, desc, data, options) {
        const embed = new Discord.MessageEmbed();
        embed.setTitle(title);
        embed.setDescription(desc);
        Command.encodeFooter(embed, data);
        if (options) {
            if (options.color) embed.setColor(options.color);
            if (options.image) embed.setImage(options.image);
            if (options.thumbnail) embed.setThumbnail(options.thumbnail);
        }
        message.author.send(embed);
    }

    getChoicesFromQuestion(step, prevValue) {
        let stepChoices = step.choices;
        if (typeof stepChoices === 'string') {
            const file = this.getChoiceFileData(step.choices);
            // This is a first level question, so get values from the key
            stepChoices = file.json.map(m => { return m[file.choices[0]] });
            if (file.choices.length === 2) {
                // This is a second level question, so use first answer to get values
                prevValue = stepChoices[prevValue - 1];
                stepChoices = [];
                file.json.find(m => m[file.choices[0]] === prevValue)[file.choices[1]].forEach(v => {
                    stepChoices[v.id - 1] = v.name;   // subtract index with 1 becuase 1 is added when displaying it.
                });
            }
        }
        return [stepChoices, prevValue];
    }

    getChoiceFileData(choices) {
        console.log(251, choices);
        choices = String(choices).split(/\|/g);
        console.log(253, choices);
        const filename = choices.shift();
        console.log(255, choices, filename);
        const json = require(filename);
        return { choices: choices, json: json };
    }

    static decodeFooter(message) {
        if (message.embeds.length) {
            //return JSON.parse(zlib.inflateSync(Buffer.from(message.embeds[0].footer.text, 'base64')));
            return JSON.parse(message.embeds[0].footer.text);
        }
        else {
            return false;
        }
    }

    static encodeFooter(embed, data) {
        //embed.setFooter(zlib.deflateSync(JSON.stringify(data)).toString('base64'));
        embed.setFooter(JSON.stringify(data));
    }

    static handleReactionAdd(reaction, user) {
        Command.handleReaction('add', reaction, user);
    }

    static handleReactionRemove(reaction, user) {
        Command.handleReaction('remove', reaction, user);
    }

    static async handleReaction(event, reaction, user) {
        if (reaction.bot) {
            return;
        }
        console.log('handling reaction', event, reaction.emoji.name, user.username);
        // When we receive a reaction we check if the reaction is partial or not
        if (reaction.partial) {
            // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
            try {
                await reaction.fetch();
            } catch (error) {
                console.log('Something went wrong when fetching the message: ', error);
                // Return as `reaction.message.author` may be undefined/null
                return;
            }
        }
        if (reaction.message.author.id !== client.user.id || user.id === client.user.id) {
            return; // Not our message so do not care
        }
    
        var data = Command.decodeFooter(reaction.message);
        if (data && data.command !== undefined) {
            var command = client.commands.get(data.command);
            if (command && command.executeReaction) {
                command.setNameUsed(data.command);
                command.executeReaction(event, reaction, user, data);
            }
        }
    }
}
