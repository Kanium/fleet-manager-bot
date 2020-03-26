const Discord = require('discord.js');
const BaseCommand = require('../lib/command');

class Command extends BaseCommand {

    constructor() {
        super();
        this.name = 'servers';
        this.description = 'Show what servers the bot is connected to.';
        this.onlyGuildId = process.env.GUILD,  // The guild for SC Fleet Manager
        this.requireRole = 'admin';
    }

	execute(message) {
		const embed = new Discord.MessageEmbed()
            .setTitle('Fleet manager connected servers')
            .setColor(0x223213)
            .setFooter('I am version '+process.env.VERSION);
        this.client.guilds.cache.forEach(guild => {
            embed.addField(guild.name, 'ID: '+guild.id+'\nMembers: '+guild.memberCount);
        });
        message.channel.send(embed);
	}
};

module.exports = new Command();
