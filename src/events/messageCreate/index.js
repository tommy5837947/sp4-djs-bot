import { Events } from 'discord.js';
import { getRandomFoodImage } from '@/constants/foodImages';

export const event = {
    name: Events.MessageCreate,
    once: false,
};

const cooldownTime = 60000; // 備註: 目前是 60 秒冷卻時間
const cooldowns = new Map();
const allowedUserIds = new Set(['516984965918097409', '422772162735374346']);
const processedMessageIds = new Set();


export const action = async (msg) => {
    if (msg.author.bot) return;

    if (processedMessageIds.has(msg.id)) return;
    // 備註: 防止同一則訊息被重複事件監聽處理
    processedMessageIds.add(msg.id);
    setTimeout(() => processedMessageIds.delete(msg.id), cooldownTime);

    /*if (allowedUserIds.has(msg.author.id)) {
        const now = Date.now();
        const lastUsed = cooldowns.get(msg.author.id);

        if (lastUsed && now - lastUsed < cooldownTime) {
            const timeLeft = ((cooldownTime - (now - lastUsed)) / 1000).toFixed(1);
            console.log(`冷卻中，剩餘時間：${timeLeft}秒`);
            return;
        }

        // 更新最後觸發時間
        

        if (msg.content.includes('吃飽沒')) {
            await msg.reply('安安栓栓吃飽沒？');

            const randomFoodImage = getRandomFoodImage();
            try {
                // 備註: 送出隨機食物圖片網址，Discord 會自動預覽
                await msg.channel.send(randomFoodImage);
            } catch (err) {
                console.error('食物圖片發送失敗:', err);
                // 備註: 圖片失敗時至少保留可見回覆
                await msg.channel.send('今天吃好吃的！');
            }

            cooldowns.set(msg.author.id, now);
        } else if (msg.content.includes('盡然')) {
            await msg.reply('竟然<:suiseidisspoint:954412346011430973>');
            cooldowns.set(msg.author.id, now);
        } else if (msg.content.includes('好耶') && !msg.content.includes('不') ) {
            await msg.reply('不好耶<:nacho_cry:1177218347910303814>');
            cooldowns.set(msg.author.id, now);
        } else if (msg.content.includes('不好耶') ) {
            await msg.reply('好耶<:nacho_love:1177218400007770222>');
            cooldowns.set(msg.author.id, now);
        }
    }*/
};
