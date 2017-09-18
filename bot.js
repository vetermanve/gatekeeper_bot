const TelegramBot = require('node-telegram-bot-api');
const Redis = require('redis');

// replace the value below with the Telegram token you receive from @BotFather
const token = '418533362:AAEC-trxHTvrcaHcMHrvKm4L9kv2uY0SF4s';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

class FrazeStorage {
}

FrazeStorage.hello = 'Мы рады видесть Вас, {username} в этом чате.\nПожалуйста преставьтесь и поздоровайтесь с сообществом.\n' +
    'Это сообщество очень трепетно относится к составу и вежливости участников.\nВ случае если я не увижу привествия с ваше стороны я буду ' +
    'вынужден удалить вас из чата через 10 минут.\nСпасибо что присоединились!';

class CheckTable {
    
    constructor () {
        this.checks = {};
    }
    
    addCheck (chatId, userId, fake) {
        let self = this;
        let key = chatId + ':' + userId;
        
        if (this.checks[key]) {
            console.log(key + ' already watched');
            return ;
        }
        
        let timeout = setTimeout(() => {
            self.kick(key) 
        }, 60000);
        
        this.checks[key] = {
            userId : userId,
            chatId : chatId,
            timeout : timeout,
            fake : fake || false
        };
    }
    
    approve (chatId, userId, messageId) {
        let key = chatId + ':' + userId;

        if (!this.checks[key]) {
            return;
        }
        
        delete this.checks[key];
        console.log(key + ' was approved');
        bot.sendMessage(chatId, "Спасибо!" , {
            reply_to_message_id: messageId,
            reply_markup: {
                force_reply: true,
                selective: true
            }
        }).then(() => {
            console.log("Approve sent");
        })
    }
    
    kick (checkKey) {
        let check = this.checks[checkKey];
        if (!check) {
            console.log(checkKey + ' check not found for kicking');
            return ;
        }
        
        delete this.checks[checkKey];
        
        if (check.fake) {
            bot.sendMessage(check.chatId, "А вас " + check.fake + ' я бы сейчас выкинул');
            return;
        }
        
        bot.kickChatMember(check.chatId, check.userId).then(function () {
            console.log(check.userId + ' was kicked from ' + check.chatId);
            bot.unbanChatMember(check.chatId, check.userId);
        }).catch(function () {
            console.warn('Error on kicking ' + check.userId + ' from ' + check.chatId);
        });
    }
}

let table = new CheckTable();

// Matches "/echo [whatever]"
bot.onText(/\/checkme(.*)/, (msg, match) => {
    const chatId = msg.chat.id;
    console.log(match);
    let param = match[1].trim();
    table.addCheck(chatId, msg.from.id, '@' + msg.from.username);
    bot.sendMessage(chatId, 'Сейчас пробуем!');
});

// Listen for any kind of message. There are different kinds of
// messages.
bot.on('new_chat_members', (msg) => {
    const chatId = msg.chat.id;
    console.log(msg);

    let members = msg.new_chat_members || [];
    // let members = msg.new_chat_members || [msg.from] || [];
    for (let id in members) {
        let member = members[id];
        // if (member.is_bot === true) {
        //     continue;
        // }

        bot.unbanChatMember(chatId, member.id);
        
        let name = member.username ?  '@' + member.username : (member.first_name + ' ' + (member.last_name || '')).trim();
        let greet =  FrazeStorage.hello.replace('{username}', name);
        table.addCheck(chatId, member.id);
        
        bot.sendMessage(chatId, greet);    
    }
});

bot.on('text', (msg) => {
    console.log('Has text', [msg.chat.id, msg.from.id, msg.message_id]);
    table.approve(msg.chat.id, msg.from.id, msg.message_id);
});