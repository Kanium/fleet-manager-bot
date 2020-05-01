const Discord = require('discord.js');
const BaseCommand = require('../lib/command');

class Command extends BaseCommand {

    constructor() {
        super();
        this.name = 'servers';
        this.description = 'Show what servers the bot is connected to.';
        this.onlyGuildId = process.env.DISCORD_SERVER_ID,  // The management guild for handling the bot
        this.requireRole = 'admin';
    }

    execute(message) {
        const embed = new Discord.MessageEmbed()
            .setTitle('Fleet manager connected servers')
            .setColor(0x223213)
            .setFooter('I am version ' + process.env.VERSION);
        this.client.guilds.cache.forEach(guild => {
            embed.addField(guild.name, 'ID: ' + guild.id + '\nMembers: ' + guild.memberCount);
        });
        if (embed.description === undefined) {
            embed.description = '';
        }
        embed.description = 'Memory usage of the bot:\n';
        const used = process.memoryUsage();
        for (let key in used) {
            embed.description += `${key} ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB\n`;
        }
        message.channel.send(embed);
    }
};

module.exports = new Command();
