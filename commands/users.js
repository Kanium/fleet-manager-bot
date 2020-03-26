const Discord = require('discord.js');
const BaseCommand = require('./../lib/command');
const request = require('./../lib/requests');

class Command extends BaseCommand {

    constructor() {
        super();
        this.name = 'users';
        this.description = 'Show the users of the org that are registered with fleet manager';
        this.requireRole = 'admin';
    }

    execute(message) {
        let _guild = this.guild;
        request.get('users/' + _guild.id, (json) => {
            const embed = new Discord.MessageEmbed();
            embed.setTitle('Current users registered in ' + _guild.name);
            let ships = 0;
            json.users.forEach((user, i) => {
                embed.addField((i + 1) + ': ' + user.settings.userName, user.numberOfShips + ' ships', true);
                ships += user.numberOfShips;
            });
            embed.setFooter('Total ships in org fleet: ' + ships);
            message.author.send(embed);
        }, undefined, (err) => {
            message.reply('sorry, but the deregistration failed to complete.');
        });
    }
};

module.exports = new Command();
