
const { EmbedBuilder } = require('discord.js'); 
const { queue } = require('./play');

module.exports = {
  name: 'queue',
  description: 'Show the songs in the queue.',
  execute(message) {
    if (queue.length === 0) {
      const embed = new EmbedBuilder()
      .setAuthor({
          name: 'Attention',
          iconURL: 'https://cdn.discordapp.com/attachments/1223544847047065662/1224631171766292500/9596-wrong.gif?ex=661e31a7&is=660bbca7&hm=0176645a3d582d6b93c8447a02cd7b1e7923b316212336fdc0b23b96b5e8ab4b&',
          url: 'https://discord.gg/FUEHs7RCqz'
        })
      .setDescription('**The Queue is currently empty consider adding songs.**')
      .setColor('#ff0000');
    return message.reply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
      .setColor('#2b71ec')
     .setAuthor({
          name: 'Queue',
          iconURL: 'https://cdn.discordapp.com/attachments/1175488636033175602/1175488721001398333/queue.png?ex=656b6a2e&is=6558f52e&hm=7573613cbb8dcac83ba5d5fc55ca607cf535dd117b4492b1c918d619aa6fd7ad&',
          url: 'https://discord.gg/FUEHs7RCqz'
        })
      .setDescription(queue.map((song, index) => `**${index + 1}.** ${song.searchQuery}`).join('\n'));

    message.reply({ embeds: [embed] });
  },
};
