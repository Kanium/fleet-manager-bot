const Discord = require('discord.js');
const BaseCommand = require('../lib/command');
const request = require('../lib/requests');

class Command extends BaseCommand {

    constructor() {
        super();
        this.name = 'fleet';
        this.description = 'Manage your fleet. You can add, list and remove hangar gear groups (containing vehicles and ships).\n*Soon you will be able to sell the gear groups as well.*';
        this.usage = 'fleet add        Add a gear group of ships and vehicles to your fleet.\n'+
                     'fleet list       List your gear groups, with the number for each group.\n'+
                     'fleet del [:num] Remove a group from your fleet. You can use the list number to do it quickly, without seeing the list first.';
        this.args = ['list/add/del'];
        this.dmOnly = true;

        this.conversations = {
            add: {
                type: {
                    question: 'What type of hangar gear is this?',
                    answer: 'Type',
                    choices: [
                        'Game package (includes game access)',
                        'Standalone ship',
                        'CCU upgraded standalone',
                        'CCU upgraded game package',
                    ],
                    next: 'title',
                },
                title: {
                    question: 'Give me a heading for this group of vehicles',
                    answer: 'Title',
                    help: 'A good tip is to make groups of vehicles the same as what you have in the hangar gears section on the RSI website.\n'+
                        'By grouping your ships this way, you will be able to put the group up for sale later.\n'+
                        'Do not worry that it will make your fleet look messy. I will generate a fleet status message for you showing the entire fleet nicely ordered by manufacturer and vehicle name, across all your gear.',
                    next: 'boughtPrice'
                },
                boughtPrice: {
                    question: 'What was the price of the group, when you bought it?',
                    answer: 'Purchase price',
                    help: 'Please write the price followed by the currency like: 350 USD',
                    next: 'boughtVat',
                    validation: '^\\d+[,\\.]{0,1}\\d{0,2} \\w{3}$',
                },
                boughtVat: {
                    question: 'Is this group price including VAT?',
                    answer: 'Incl. VAT',
                    next: {
                        yes: 'percentageVAT',
                        no: 'boughtDate',
                    }
                },
                percentageVAT: {
                    question: 'What is your VAT percentage?',
                    help: 'Just give me the percentage in a single number, like: 25, or 19.',
                    answer: 'VAT %',
                    validation: '^\\d+$',
                    next: 'boughtDate',
                },
                boughtDate: {
                    question: 'When did you buy this gear group?',
                    answer: 'Purchase date',
                    help: 'Please write the data in the following format: YYYY-MM-DD',
                    validation: '^\\d{4}-\\d{2}-\\d{2}$',
                    next: 'insurance',
                },
                insurance: {
                    question: 'What insurance does this gear group come with?',
                    answer: 'Insurance',
                    choices: [
                        '3 months',
                        '6 months',
                        '5 years',
                        '10 years (IAE)',
                        'Life time (LTI)'
                    ],
                    next: 'shipMake'
                },
                shipMake: {
                    question: 'What manufacturer is the vehicle?',
                    choices: './../ships.json|manufacturer',
                    next: 'shipType'
                },
                shipType: {
                    question: 'What :prevValue vehicle is it?',
                    answer: 'Ship(s)',
                    choices: './../ships.json|manufacturer|vehicles',
                    next: 'moreShips',
                    pushToArray: true,
                },
                moreShips: {
                    question: 'Does the gear group contain more vehicles (yes/no)?',
                    next: {
                        yes: 'shipMake',
                        no: 'image',
                    }
                },
                image: {
                    question: 'Please send me a screenshot of the gear group from your hangar on CIG website',
                    help: 'Tip: press "windows key" and write "snip" to get a snippet tool to crap the ',
                    answerThumbnail: true,
                    next: 'confirm',
                },
                confirm: {
                    question: 'Do you want to save this gear group (yes/no)?',
                    help: 'If you want to change something, you will have to start over.',
                    showAnswers: true,
                    next: {
                        yes: '#save#',
                        no: '#cancel#',
                    }
                }
            },
            del: {
                which: {
                    question: 'What gear group do you want to delete?',
                    answer: 'gear group number',
                    help: 'The gear group you specify will be deleted immediately without further confirmation!',
                    next: '#save#'
                },
            }
        };
    }

    execute(message, args, dataMessage) {
        if (this.args[0].split('/').indexOf(args[0]) < 0) {
            return message.reply('sorry, but you did not give me a correct argument. Use either "fleet ' + this.args[0] + '".');
        }
        switch (args[0]) {
            case 'list':
                if (['mine', 'org'].indexOf(args[1]) < 0) {
                    return message.reply('sorry, but you did not give me a correct argument. Use either "fleet list mine" or "fleet list org".');
                }
                if (args[2] && args[2] !== 'sale') {
                    return message.reply('sorry, but you did not give me a correct argument. Use only "show ' + args[0] + ' sale".');
                }
                this.list(message, args);
                break;
            case 'add':
                this.add(message, args, dataMessage);
                break;
            case 'del':
                this.del(message, args);
                break;
        }
    }

    list(message, args) {
        request.get('gear-groups/' + args[1] + (args[2] === 'sale' ? '/sale' : ''),
            (json) => {
                console.log(json);
                const embed = new Discord.MessageEmbed()
                    .setTitle((args[1] === 'mine' ? 'Your' : 'Organization') + ' fleet overview')
                    .setColor(0xFF0000)
                    .setDescription(json.message);
                message.channel.send(embed);
            },
            (json) => {
                message.reply('sorry but we could not find your fleet!\n*Computer says: ' + json.error + '*');
            }
        );
    }

    del(message, args) {

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
