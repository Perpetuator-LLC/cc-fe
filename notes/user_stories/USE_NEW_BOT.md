# Use New Bot in a Telegram group

## Telegram User: Create Bot

### Adding a Telegram Bot to a Group - Overview

1. Create a new bot using the BotFather.
2. Add the bot to the group.
3. Give the bot admin permissions.
4. Get the chat ID of the group.
5. Use the chat ID to send messages to the group.
6. Use the bot to send messages to the group.

### Creating a Bot

Go to Telegram and search for the `BotFather`. Type `/newbot` to create a new bot.

Follow the instructions to create a new bot and get the bot token.

```
/newbot

> Alright, a new bot. How are we going to call it? Please choose a name for your bot.

Chain Reaction - Crypto News

> Good. Now let's choose a username for your bot. It must end in `bot`. Like this, for example: TetrisBot or tetris_bot.

chain_reaction_crypto_news_bot

> Done! Congratulations on your new bot. You will find it at t.me/chain_reaction_crypto_news_bot. You can now add a 
description, about section and profile picture for your bot, see /help for a list of commands. By the way, when you've 
finished creating your cool bot, ping our Bot Support if you want a better username for it. Just make sure the bot is 
fully operational before you do this.

Use this token to access the HTTP API:
1111111111:AAAAAAAAAAAAAAAAAA-2222222222222222
Keep your token secure and store it safely, it can be used by anyone to control your bot.

For a description of the Bot API, see this page: https://core.telegram.org/bots/api
```

### Create a new Channel (if needed)

Create a channel in Telegram where the bot can post messages. Otherwise, select an existing channel.

### Adding the Bot to the Channel

Add the bot to the channel and give it admin permissions.

To do this, go to the channel and click on the channel name. Click on the `Admins` button and then click on `Add Admin`.

Search for the bot and add it as an admin. Use the name entered when creating the bot.

### Getting the Chat ID

Visit: https://web.telegram.org/k/

Select the channel you want to post in and notice the URL:

- https://web.telegram.org/k/#-2123456789

The chat ID is `2123456789`

The next step is to add the Capital Copilot Bot to the group:
- In the Telegram group, click on the group name
  - Click on 'Edit'
  - Click on 'Admins'
  - Click on 'Add Admin'
  - Search for 'Capital Copilot'
  - Click on 'Capital Copilot': @capital_copilot_crypto_news_bot
  - Disable all permissions except 'Post Messages'
  - Click on 'Done'

## Capital Copilot User: Add Team

### Bot Token

In the Bot Token section above you will have received a Bot Token. This must be added to the Capital Copilot team.

Many times the Capital Copilot team may create and manage the Team and in this case they will add the Bot Token as they are already owners of the Team since they created it.

### Getting the Chat ID

Visit: https://web.telegram.org/k/

Select the channel you want to post in and notice the URL:

- https://web.telegram.org/k/#-2123456789

The chat ID is `-2123456789`. Set the TELGRAM_CHAT_ID environment variable to: -1002123456789

### Creating the Team

The first step is for the group to be created:
- Visit https://copilot.perpetuator.com
- Click on 'Teams'
  - Click on 'Create Team'
  - Enter the name of the team
  - Click 'Save'
- You will be added as the 'owner' of the team
- Update the Team settings, including:
  - Intro
  - Prompt
  - Outro
  - Bot Token
  - Chat ID
- Save this for now

- Click on 'Add Members'
  - Enter the Telegram username of the person you want to invite
  - Click 'Invite'
