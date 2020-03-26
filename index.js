require('dotenv').config();

global.Discord = require('discord.js');
global.client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });
global.fetch = require('node-fetch');
global.fs = require('fs');
global.request = require('./lib/requests');

const Command = require('./lib/command');

// Load commands from files in commands
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    command.client = client;
    client.commands.set(command.name, command);
}

// Load configuration from environment
const token = process.env.DISCORD_TOKEN;
const servers_guild = process.env.DISCORD_SERVER_ID;
request.prefix = process.env.FLEET_MANAGER_API_URI;

client.on('ready', () => {
    console.log('Bot is now connected!\nVersion:', process.env.VERSION);
});

client.on('messageReactionAdd', Command.handleReactionAdd);
client.on('messageReactionRemove', Command.handleReactionRemove);

client.on('message', (_message) => {
    // If this is a guild message and does not have prefix, or is from a bot then ignore it
    if ((_message.channel.type === 'text' && !_message.mentions.users.has(client.user.id)) || _message.author.bot) return;

    _message.channel.messages.fetch({ limit: 10 })
        .then(messages => {
            let command = null;
            let commandName = '';
            try {
                let i = 1;
                messages.forEach((m) => {
                    // Was this my message?
                    if (m.author.id === client.user.id) {
                        console.log('I said: ', m.embeds ? m.embeds[0].title : m.content);
                        if (m.embeds.length) {
                            const data = Command.decodeFooter(m);
                            if (data.command) {
                                commandName = data.command
                                command = client.commands.get(data.command);
                                args = data.args;
                            }
                        }
                    }
                    else {
                        console.log('User said:', m.content);
                        var args = String(m.content).match(/(?:[^\s"]+|"[^"]*")+/g).map(v => v.match(/(")*(.+)\1/)[2]);
                        console.log('Args in content', args);
                        // if this is a direct message, then remove the @user part
                        if (m.channel.type === 'text') {
                            args.shift();
                        }
                        commandName = args.shift().toLowerCase();
                        command = client.commands.get(commandName)
                            || client.commands.find(c => c.aliases && c.aliases.includes(commandName));
                    }
                    if (command) {
                        command.setNameUsed(commandName);
                        console.log('Found command in message '+i, command.name);
                        throw [command, args, i > 1 ? m : null];
                    }
                    i++;
                });
            }
            catch (c) {
                command = c[0];
                args = c[1];
                message = c[2];
            }
            if (!command) throw `I am sorry but I do not understand you!`;
            return { command: command, args: args, message: message };
        })
        .then(dataset => {
            const command = dataset.command;
            const args = dataset.args;
            const dataMessage = dataset.message;
            command.validate(_message, args)
                .then((success) => {
                    if (typeof success === 'object') {
                        command.member = success.member;
                        command.requiredRole = success.requiredRole;
                        command.guild = success.guild;
                        success = success.message;
                    }
                    console.log(command.usedName + ': ' + success);
                    try {
                        command.execute(_message, args, dataMessage);
                    } catch (error) {
                        console.error(error);
                        throw 'there was an error trying to execute that command!';
                    }
                })
                .catch((error) => {
                    console.log('ERROR: ' + command.usedName + ' :: ' + error);
                    _message.reply(error);
                });
        })
        .catch(e => {
            _message.reply(e);
        });
});

client.login(token);
