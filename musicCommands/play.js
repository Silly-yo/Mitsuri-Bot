
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  StreamType,
  AudioPlayerStatus,
  entersState,
  VoiceConnectionStatus,
  voiceConnection,
} = require('@discordjs/voice');
const ytdl = require('ytdl-core');
ytdl.YTDL_NO_UPDATE = true;
const YouTubeSearch = require('youtube-search');
const { EmbedBuilder } = require('discord.js');
const { updateHistory } = require('./historyUtils');
const config = require('../config.json');
const youtubeAPIKey = config.youtubeAPIKey;
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { InteractionCollector } = require('discord.js');

let isPaused = false;
const youtubeSearchOptions = {
  maxResults: 1,
  key: youtubeAPIKey,
};

const queue = [];
let player;
let currentConnection; 
let currentMessage; 
function createPlayer() {
  if (!player) {
    player = createAudioPlayer();
    player.on(AudioPlayerStatus.Idle, async () => {
      await playNextSong(currentConnection, currentMessage);
    });
  }
}


function enqueue(song) {
  queue.push(song);
}


function dequeue() {
  return queue.shift();
}
async function displayQueue(message) {
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
      iconURL: 'https://cdn.discordapp.com/attachments/1175488636033175602/1175488721001398333/queue.png?ex=656b6a2e&is=6558f52e&hm=7b4492b1c7573613cbb8dcac83ba5d5fc55ca607cf535dd11918d619aa6fd7ad&',
      url: 'https://discord.gg/FUEHs7RCqz'
    })
    .setDescription(queue.map((song, index) => `**${index + 1}.** ${song.searchQuery}`).join('\n'));

  message.reply({ embeds: [embed] });
}


async function playNextSong(connection, message) {
  if (queue.length > 0) {
    const nextSong = dequeue();
    await playSong(connection, nextSong.searchQuery, nextSong.message);
  } else {
    if (!connection.destroyed) {
      connection.destroy();
    }
   const embed = new EmbedBuilder()
 .setAuthor({
          name: 'Queue Empty',
          iconURL: 'https://cdn.discordapp.com/attachments/1223544847047065662/1224631831178248347/4381-anouncements-animated.gif?ex=661e3245&is=660bbd45&hm=25f3b77985241a4612a8f4946a4631f8add618d9f36a0d9157fb4821aa6d2a0e&',
          url: 'https://discord.gg/FUEHs7RCqz'
        })
     .setDescription('**Oops! The queue is empty. Our bot is taking a break. See you later!**')

      .setColor('#ffcc00');
    message.reply({ embeds: [embed] });
  }
}

async function playSong(connection, searchQuery, message) {
  createPlayer(); 

  player.pause();

  let searchResult;
  try {
    searchResult = await YouTubeSearch(searchQuery, youtubeSearchOptions);
  } catch (error) {
    console.error(error);
    return message.reply('❌ There was an error searching for the song.');
  }

  if (!searchResult || !searchResult.results.length) {
    return message.reply('❌ No search results found for the provided query.');
  }

  const video = searchResult.results[0];
  const youtubeLink = `https://www.youtube.com/watch?v=${video.id}`;

  const stream = ytdl(youtubeLink, {filter: 'audioonly'});
  const resource = createAudioResource(stream, {
    inputType: StreamType.Arbitrary,
    inlineVolume: true,
  });

  player.play(resource);
  connection.subscribe(player);

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
    await entersState(player, AudioPlayerStatus.Playing, 20_000);

    const embed = new EmbedBuilder()
      .setAuthor({
        name: 'Currently playing a Track',
        iconURL: 'https://cdn.discordapp.com/attachments/1140841446228897932/1144671132948103208/giphy.gif', 
        url: 'https://discord.gg/FUEHs7RCqz'
      })
      .setDescription(`\n ‎ \n▶️ **Details :** [${video.title}](${youtubeLink})\n▶️ **Enjoy the Ultimate YouTube Music Experience ** \n▶️ **If link breaks playback try to give query**`)
      .setImage(video.thumbnails.high.url) 
      .setColor('#2b71ec')
      .setFooter({ text: 'More info - Use Help command Default : ?help' });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('pause')
          .setLabel('Pause')
          .setEmoji('⏸️')
           .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('resume')
          .setLabel('Resume')
        .setEmoji('▶️')
           .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('skip')
          .setLabel('Skip')
         .setEmoji('⏭️')
           .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()  
        .setCustomId('display_queue')
        .setLabel('Queue')
        .setEmoji('📄')
        .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()  
        .setLabel('Link')
         .setURL(youtubeLink)
        .setStyle(ButtonStyle.Link)      
      );

    const replyMessage = await message.reply({ embeds: [embed], components: [row] });

    updateHistory({ title: video.title, link: youtubeLink });

 
    const collector = new InteractionCollector(message.client, {
      filter: interaction => interaction.isButton() && interaction.message.id === replyMessage.id,
      time: 180000, 
    });
    

    collector.on('collect', async interaction => {
      const { member } = interaction;

      switch (interaction.customId) {
        case 'pause':
          pausePlayback();
          await interaction.deferUpdate();
          break;
        case 'resume':
            resumePlayback();
          await interaction.deferUpdate();
          break;
        case 'skip':
          if (member.voice.channel && queue.length > 0) {
            playNextSong(currentConnection, currentMessage);
             const embed = new EmbedBuilder()
           .setColor('#2b71ec')
     .setAuthor({
          name: 'Skipped Song!',
          iconURL: 'https://cdn.discordapp.com/attachments/1175488636033175602/1175488721253052426/right-chevron-.png?ex=656b6a2e&is=6558f52e&hm=50647a73aa51cb35f25eba52055c7b4a1b56bbf3a6d13adc15b52dc533236956&',
          url: 'https://discord.gg/FUEHs7RCqz'
        })
          .setDescription('**Let\'s move on to the next beat...**');
            interaction.reply({ embeds: [embed] });
          } else {
            interaction.deferUpdate();
          }
          break;
        case 'display_queue':
          displayQueue(message);
          await interaction.deferUpdate();
          break;
        default:
          interaction.reply('❌ Invalid interaction.');
      }
    });
    setTimeout(() => {
        row.components.forEach(button => button.setDisabled(true));
        replyMessage.edit({ components: [row] });
    }, 180000);
    collector.on('end', () => console.log('Button interaction collector ended.'));
  } catch (error) {
    console.error(error);
    if (voiceConnection && !voiceConnection.destroyed) {
    voiceConnection.destroy();
    } 
    message.reply('🔴 There was an error playing the music.');
  }
}



function pausePlayback() {
  if (player && player.state.status === AudioPlayerStatus.Playing) {
    player.pause();
    isPaused = true;

    const embed = new EmbedBuilder()
      .setAuthor({
          name: 'Playback Paused!',
          iconURL: 'https://cdn.discordapp.com/attachments/1175488636033175602/1175488720519049337/pause.png?ex=656b6a2e&is=6558f52e&hm=6695d8141e37330b5426f146ec6705243f497f95f08916a40c1db582c6e07d7e&',
          url: 'https://discord.gg/FUEHs7RCqz'
        })
      .setDescription('**Halt the beats! Music taking a break..**')
      .setColor('#2b71ec');

    currentMessage.reply({ embeds: [embed] });
  } else {
    const embed = new EmbedBuilder()
 .setAuthor({
          name: 'Attention',
          iconURL: 'https://cdn.discordapp.com/attachments/1223544847047065662/1224631171766292500/9596-wrong.gif?ex=661e31a7&is=660bbca7&hm=016645a3d582d6b93c8447a02cd7b1e7923b3162127336fdc0b23b96b5e8ab4b&',
          url: 'https://discord.gg/FUEHs7RCqz'
        })
      .setDescription('**The bot is not currently playing any song.**')
      .setColor('#ff0000');
    currentMessage.reply({ embeds: [embed] });
  }
}

function resumePlayback() {
  if (player && player.state.status === AudioPlayerStatus.Paused) {
    player.unpause();
    isPaused = false;

    const embed = new EmbedBuilder()
       .setAuthor({
          name: 'Playback Resumed!',
          iconURL: 'https://cdn.discordapp.com/attachments/1175488636033175602/1175488720762310757/play.png?ex=656b6a2e&is=6558f52e&hm=ae4f01060fe8ae93f062d6574ef064ca0f6b4cf40b172f1bd54d8d405809c7df&',
          url: 'https://discord.gg/FUEHs7RCqz'
        })
      .setDescription('**Back in action! Let the beats roll..**')
      .setColor('#2b71ec');
    currentMessage.reply({ embeds: [embed] });
  } else {
    const embed = new EmbedBuilder()
      .setAuthor({
          name: 'Attention',
          iconURL: 'https://cdn.discordapp.com/attachments/1223544847047065662/1224631171766292500/9596-wrong.gif?ex=661e31a7&is=660bbca7&hm=6645a3d582d6b93c8447a02cd7b1e7923b316212017336fdc0b23b96b5e8ab4b&',
          url: 'https://discord.gg/FUEHs7RCqz'
        })
      .setDescription('**The bot is not currently paused.**')
      .setColor('#ff0000');

    currentMessage.reply({ embeds: [embed] });
  }
}


module.exports = {
  name: 'play',
  description: 'Play music from YouTube',
  execute: async (message, args) => {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.reply('**⚠️ You need to be in a voice channel!**');
    }

    const searchQuery = args.join(' ');
    if (!searchQuery) {
      return message.reply('**▶️ Please provide a search query!**');
    }

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

    currentConnection = connection; 
    currentMessage = message; 

    if (connection.state.status === VoiceConnectionStatus.Ready) {
      enqueue({ searchQuery, message });
      createPlayer();
      const embed = new EmbedBuilder()
        .setAuthor({
        name: 'Added To Queue',
        iconURL: 'https://cdn.discordapp.com/attachments/1156866389819281418/1157218651179597884/1213-verified.gif?ex=6517cf5a&is=65167dda&hm=cf7bc8fb4414cb412587ade0af285b77569d2568214d6baab8702ddeb6c38ad5&', 
        url: 'https://discord.gg/FUEHs7RCqz'
    })
        .setDescription(`**Your song has been queued up and is ready to play!**`)
        .setColor('#14bdff')
        .setFooter({ text: 'Use ?queue for more Information' });
      return message.reply({ embeds: [embed] });
    }

    const listener = async (oldState, newState) => {
      if (newState.member.user.bot) {
        return;
      }

      if (oldState.channel && !newState.channel) {
        const membersInChannel = oldState.channel.members.size;
        if (membersInChannel === 1) {
          message.client.removeListener('voiceStateUpdate', listener);

          if (!connection.destroyed) {
            connection.destroy();
          }
        }
      }
    };

    message.client.on('voiceStateUpdate', listener);

    await playSong(connection, searchQuery, message);
  },
  queue,
  dequeue,
  playNextSong,
  playSong,
  pause: () => {
    pausePlayback();
  },
  resume: () => {
    resumePlayback();
  },
  getPlayer: () => player,
  getCurrentConnection: () => currentConnection, 
};
