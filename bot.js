const TelegramBot = require('node-telegram-bot-api');
const urlRegex = require('url-regex');

const token =  process.env.BOT_TOKEN || '';
const waitTime =  process.env.KICK_WAIT || 1800000; // default 30m

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

class FrazeStorage {
}

FrazeStorage.hello = 'Мы рады видеть Вас, {username}, в этом чате.\n' +
'Пожалуйста, представьтесь и поздоровайтесь с сообществом.\n' +
'Это сообщество очень трепетно относится к составу и вежливости участников.\n' +
'В случае, если я не увижу приветствия с вашей стороны, я буду вынужден удалить вас из чата через 30 минут.\n\n' +
'Любые ссылки в приветственном сообщении будут расценены как спам и неуважение к сообществу.\n\n' +
'Спасибо, что присоединились!';

FrazeStorage.success = "Спасибо! Вы приняты в сообщество!"; 

class CheckTable {
    
    constructor () {
        this.checks = {};
    }
    
    addCheck (chatId, userId, name, fake, customTimeout) {
        let self = this;
        let key = this.getCheckKey(chatId, userId);
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

    getCheckKey (chatId, userId) {
        return chatId + ':' + userId
    }

    checkFirstMessage (chatId, userId, messageId, text) {
        let key = this.getCheckKey(chatId, userId);
        if (!this.checks[key]) {
            return;
        }

        if (urlRegex({strict: false}).test(text)) {
            this.kickForBadMessage(chatId, userId, messageId)
        } else {
            this.approve(chatId, userId, messageId)
        }
    }

    kickForBadMessage (chatId, userId, messageId) {
        let key = this.getCheckKey(chatId, userId);
        table.removeMessage(chatId, messageId);
        table.kick(table.getCheckKey(chatId, userId));
        console.log(key + ' was removed due to link in hello message');
    }

    approve (chatId, userId, messageId) {
        let key = this.getCheckKey(chatId, userId);

        if (!this.checks[key]) {
            return;
        }

        delete this.checks[key];

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

    removeMessage(chatId, messageId) {
        bot.deleteMessage(chatId, messageId).catch(function () {
            bot.sendMessage(chatId, 'А почему это я сообщения не могу удалять?!\nСделайте меня уже админом!');
            console.warn('Error on removing message ' + messageId + ' from ' + chatId);
        })
    }
}

let table = new CheckTable();


bot.on('text', (msg) => {
    console.log('Has text', [msg.chat.id, msg.from.id, msg.message_id]);
    table.checkFirstMessage(msg.chat.id, msg.from.id, msg.message_id, msg.text);
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

        //bot.unbanChatMember(chatId, member.id).catch(function () {});
        
        let name = member.username ?  '@' + member.username : (member.first_name + ' ' + (member.last_name || '')).trim();
        let greet =  FrazeStorage.hello.replace('{username}', name);
        table.addCheck(chatId, member.id, name);
        
        bot.sendMessage(chatId, greet, {
            reply_to_message_id: msg.message_id
        });
    }
});
