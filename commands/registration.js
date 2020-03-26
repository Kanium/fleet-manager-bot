const Discord = require('discord.js');
const BaseCommand = require('../lib/command');
const request = require('./../lib/requests');

class Command extends BaseCommand {

    constructor() {
        super();
        this.name = 'register';
        this.description = '';
        this.usage = 'Handle your registration in the fleet manager:\n' +
            'register __Register in the fleet manager__\n' +
            'deregister __Deregister from the fleet manager and delete all your data__';
        this.aliases = ['deregister'];
        this.guildOnly = true;
    }

    execute(message, args) {
        switch (this.usedName) {
            case 'register':
                let data = {
                    userId: message.author.id,
                    guildId: message.guild.id,
                    public: args[0] === 'private' ? "no" : "yes",
                    username: message.author.username,
                    guildName: message.guild.name,
                };
                request.post('user', data,
                    (json) => {
                        message.author.send('So happy to have you onboard! Just write "help" here to see what I can do for you.');
                        message.reply('welcome aboard, I have sent a DM to you with some information to get started.');
                    },
                    (json) => {
                        message.reply('sorry but we could not register you.\n*Computer says: ' + json.error + '*');
                    },
                    (err) => {
                        message.reply('sorry, but the registration failed.');
                    }
                );
                break;
            case 'deregister':
                request.delete('user/' + message.author.id,
                    (json) => {
                        message.reply('goodbye! Just mention me again with the "register" command, to join the cool kids again later.');
                    },
                    (json) => {
                        message.reply('sorry but we could not deregister you.\n*Computer says: ' + json.error + '*');
                    },
                    (err) => {
                        message.reply('sorry, but the deregistration failed to complete.');
                    }
                );
                break;
        }
    }
};

module.exports = new Command();