const TelegramBot = require('node-telegram-bot-api');

const token =  process.env.BOT_TOKEN || '';
const waitTime =  process.env.KICK_WAIT || 1800000; // default 30m

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

class FrazeStorage {
}

FrazeStorage.hello = 'Мы рады видесть Вас, {username} в этом чате.\nПожалуйста преставьтесь и поздоровайтесь с сообществом.\n' +
    'Это сообщество очень трепетно относится к составу и вежливости участников.\nВ случае если я не увижу привествия с ваше стороны я буду ' +
    'вынужден удалить вас из чата через 10 минут.\nСпасибо что присоединились!';

FrazeStorage.success = "Спасибо! Вы приняты в сообщество!"; 

class CheckTable {
    
    constructor () {
        this.checks = {};
    }
    
    addCheck (chatId, userId, name, fake, customTimeout) {
        let self = this;
        let key = chatId + ':' + userId;
        let kickAfter = customTimeout || waitTime;
        
        if (this.checks[key]) {
            console.log(key + ' already watched');
            return ;
        }
        
        setTimeout(() => {
            self.kick(key) 
        }, kickAfter);
        
        this.checks[key] = {
            userId : userId,
            chatId : chatId,
            name : name || userId, 
            timeout : kickAfter,
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
        bot.sendMessage(chatId, FrazeStorage.success , {
            reply_to_message_id: messageId
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
            bot.sendMessage(check.chatId, "А вас " + check.name + ' я бы сейчас выкинул');
            return;
        }
        
        bot.kickChatMember(check.chatId, check.userId).then(function () {
            console.log(check.userId + ' was kicked from ' + check.chatId);
            bot.unbanChatMember(check.chatId, check.userId).catch(function () {
                console.error('Error unbanning ' + check.userId + ' from ' + check.chatId);
            });
        }).catch(function () {
            bot.sendMessage(check.chatId, "Ай не получилось выкинуть " + check.name + ' за дверь!\nСделайте меня уже админом!');
            console.warn('Error on kicking ' + check.userId + ' from ' + check.chatId);
        });
    }
}

let table = new CheckTable();


bot.on('text', (msg) => {
    console.log('Has text', [msg.chat.id, msg.from.id, msg.message_id]);
    table.approve(msg.chat.id, msg.from.id, msg.message_id);
});

// Matches "/echo [whatever]"
bot.onText(/\/checkme (\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    console.log(match);
    let customTimeout = parseInt(match[1].trim());
    table.addCheck(chatId, msg.from.id, '@' + msg.from.username, true, customTimeout);
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
        if (member.is_bot === true) {
            continue;
        }

        bot.unbanChatMember(chatId, member.id).catch(function () {});
        
        let name = member.username ?  '@' + member.username : (member.first_name + ' ' + (member.last_name || '')).trim();
        let greet =  FrazeStorage.hello.replace('{username}', name);
        table.addCheck(chatId, member.id, name);
        
        bot.sendMessage(chatId, greet);    
    }
});