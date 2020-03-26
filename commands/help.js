const BaseCommand = require('./../lib/command');

class Command extends BaseCommand {

	constructor() {
        super();
		this.name = 'help';
		this.description ='Show what the bot can do here.';
		this.usage = '';
	}

    execute(message, args) {
        const data = [];
        const { commands } = message.client;

        if (!args.length) {
			data.push('Here\'s a list of all my commands:');
            data.push(commands
                .filter(c => !c.guildOnly && (!c.onlyAdmins || c.onlyAdmins === message.authorIsAdmin))
                .map(c => c.name)
                .join(', ')
            );
			data.push(`\nYou can send \`help [command name]\` to get info on a specific command!`);

			return message.author.send(data, { split: true })
				.then(() => {
					if (message.channel.type === 'dm') return;
					message.reply('I\'ve sent you a DM with all my commands!');
				})
				.catch(error => {
					console.error(`Could not send help DM to ${message.author.tag}.\n`, error);
					message.reply('it seems like I can\'t DM you!');
				});
		}

		const name = args[0].toLowerCase();
		const command = commands.get(name) || commands.find(c => c.aliases && c.aliases.includes(name));

		if (!command) {
			return message.reply('that\'s not a valid command!');
		}

		data.push(`**Name:** ${command.name}`);

		if (command.aliases.length) data.push(`**Aliases:** ${command.aliases.join(', ')}`);
		if (command.description) data.push(command.description);
		if (command.usage) data.push('```'+command.usage+'```');

		message.channel.send(data, { split: true });
    }
};

module.exports = new Command();