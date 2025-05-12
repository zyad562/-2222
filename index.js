import { Client, GatewayIntentBits, REST, Routes, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { createAudioResource, createAudioPlayer, joinVoiceChannel } from '@discordjs/voice';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// تحميل ملف config.json باستخدام import
import config from './config.json' assert { type: 'json' };

// تحويل مسار الملف إلى مسار مطلق
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// قائمة الإذاعات
const radios = [
  { name: "إذاعة أحمد الطرابلسي", value: "ahmed_altrabulsi" },
  { name: "إذاعة أحمد خضر الطرابلسي", value: "ahmad_khader_altarabulsi" },
  { name: "إذاعة ابراهيم الدوسري", value: "ibrahim_aldosari" },
  { name: "إذاعة ماهر المعيقلي", value: "maher_al_meaqli" },
  { name: "إذاعة عبدالباسط عبدالصمد", value: "abdulbasit_abdulsamad_warsh" },
  { name: "إذاعة تفسير القران الكريم", value: "tafseer" },
  { name: "أذكار الصباح", value: "athkar_sabah" },
  { name: "أذكار المساء", value: "athkar_masa" },
  { name: "إذاعة محمد عبدالكريم", value: "mohammad_abdullkarem" },
  { name: "إذاعة محمود علي البنا", value: "mahmoud_ali__albanna" },
  { name: "إذاعة محمود خليل الحصري", value: "mahmoud_khalil_alhussary" },
  { name: "إذاعة علي الحذيفي", value: "ali_alhuthaifi_qalon" },
  { name: "السيرة النبوية - 400 حلقة عن سيرة نبينا محمد", value: "fi_zilal_alsiyra" },
  { name: "إذاعة عبدالرحمن السديس", value: "abdulrahman_alsudaes" },
  { name: "إذاعة أحمد العجمي", value: "ahmad_alajmy" },
  { name: "إذاعة القران الكريم دولة السعودية", value: "saudi_quran_radio" },
  { name: "إذاعة القران الكريم دولة مصر", value: "egypt_quran_radio" },
  { name: "إذاعة القران الكريم دولة البحرين", value: "bahrain_quran_radio" },
  { name: "إذاعة سعد الغامدي", value: "saad_alghamdi" }
];

// تهيئة البوت
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// إنشاء REST instance لتسجيل الأوامر
const rest = new REST({ version: '10' }).setToken(config.token_bot);

// مسار ملف config.json
const configFilePath = path.join(__dirname, 'config.json');

// دالة لحفظ الإعدادات في ملف config.json
function saveConfig() {
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf-8');
}

// دالة لتسجيل الأوامر الجديدة
async function registerCommands() {
    try {
        console.log('جارٍ حذف الأوامر القديمة...');

        // حذف جميع الأوامر القديمة
        await rest.put(
            Routes.applicationCommands(config.client_id),
            { body: [] },
        );

        console.log('جارٍ تسجيل الأوامر الشرطية...');

        // تعريف الأوامر الشرطية
        const commands = [
            {
                name: 'set-channel',
                description: 'تحديد القناة الصوتية التي سيعمل فيها البوت',
            },
            {
                name: 'set-radio',
                description: 'تغيير الإذاعة',
            },
        ];

        // تسجيل الأوامر الجديدة
        await rest.put(
            Routes.applicationCommands(config.client_id),
            { body: commands },
        );

        console.log('تم تسجيل الأوامر الشرطية بنجاح.');
    } catch (error) {
        console.error('حدث خطأ أثناء تسجيل الأوامر:', error);
    }
}

// عند تشغيل البوت
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // تسجيل الأوامر الجديدة
    await registerCommands();

    // بدء البث الإذاعي في كل سيرفر
    for (const [guildId, settings] of Object.entries(config.servers)) {
        if (settings.voice_channel_id) {
            startRadioStream(guildId, settings.voice_channel_id, settings.radio_url);
        }
    }
});

// دالة لبدء بث الإذاعة في القناة الصوتية
function startRadioStream(guildId, channelId, radioValue) {
    // تحويل القيمة القصيرة إلى رابط كامل
    const radioUrl = `https://Qurango.net/radio/${radioValue}`;

    const connection = joinVoiceChannel({
        channelId,
        guildId,
        adapterCreator: client.guilds.cache.get(guildId).voiceAdapterCreator,
    });

    const player = createAudioPlayer();
    const resource = createAudioResource(radioUrl);

    connection.subscribe(player);
    player.play(resource);

    console.log(`Started playing radio in voice channel: ${channelId} (Server: ${guildId})`);
}

// عند استقبال أمر شرطي
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const guildId = interaction.guildId; // معرف السيرفر الذي تم استدعاء الأمر منه

    // الأمر /set-radio
    if (interaction.commandName === 'set-radio') {
        // التحقق من صلاحيات الأدمن
        if (!interaction.memberPermissions.has('ADMINISTRATOR')) {
            return interaction.reply({ content: '⚠️ يجب أن تكون أدمن لاستخدام هذا الأمر.', ephemeral: true });
        }

        // إنشاء قائمة اختيار للإذاعات
        const radioSelectMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('set-radio')
                .setPlaceholder('اختر الإذاعة')
                .addOptions(
                    radios.map(radio => ({
                        label: radio.name,
                        value: radio.value,
                    }))
                )
        );

        // إرسال الرسالة مع قائمة الاختيار
        await interaction.reply({
            content: 'اختر الإذاعة:',
            components: [radioSelectMenu],
            ephemeral: false, // الرسالة مرئية للجميع
        });
    }

    // الأمر /set-channel
    if (interaction.commandName === 'set-channel') {
        // التحقق من صلاحيات الأدمن
        if (!interaction.memberPermissions.has('ADMINISTRATOR')) {
            return interaction.reply({ content: '⚠️ يجب أن تكون أدمن لاستخدام هذا الأمر.', ephemeral: true });
        }

        // الحصول على قائمة القنوات الصوتية في السيرفر
        const voiceChannels = interaction.guild.channels.cache.filter(channel => channel.isVoiceBased());

        // إنشاء قائمة اختيار للقنوات الصوتية
        const channelSelectMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('set-channel')
                .setPlaceholder('اختر القناة الصوتية')
                .addOptions(
                    voiceChannels.map(channel => ({
                        label: channel.name,
                        value: channel.id,
                    }))
                )
        );

        // إرسال الرسالة مع قائمة الاختيار
        await interaction.reply({
            content: 'اختر القناة الصوتية:',
            components: [channelSelectMenu],
            ephemeral: false, // الرسالة مرئية للجميع
        });
    }
});

// عند تفاعل المستخدم مع قائمة الاختيار
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;

    const guildId = interaction.guildId; // معرف السيرفر الذي تم التفاعل منه

    // تفاعل مع قائمة اختيار الإذاعة
    if (interaction.customId === 'set-radio') {
        const radioValue = interaction.values[0]; // الحصول على قيمة الإذاعة المختارة

        // تحديث الإذاعة في الإعدادات
        config.servers[guildId].radio_url = radioValue;
        saveConfig();

        // إعادة تشغيل البث الإذاعي بالإذاعة الجديدة
        if (config.servers[guildId].voice_channel_id) {
            startRadioStream(guildId, config.servers[guildId].voice_channel_id, radioValue);
        }

        interaction.reply({ content: `✅ تم تغيير الإذاعة إلى: ${radios.find(radio => radio.value === radioValue).name}`, ephemeral: false }); // الرسالة مرئية للجميع
    }

    // تفاعل مع قائمة اختيار القناة
    if (interaction.customId === 'set-channel') {
        const newChannelId = interaction.values[0]; // الحصول على معرف القناة المختارة

        // تحديث القناة الصوتية في الإعدادات
        config.servers[guildId].voice_channel_id = newChannelId;
        saveConfig();

        // إعادة تشغيل البث الإذاعي في القناة الجديدة
        if (config.servers[guildId].radio_url) {
            startRadioStream(guildId, newChannelId, config.servers[guildId].radio_url);
        }

        interaction.reply({ content: `✅ تم تحديث القناة الصوتية إلى: ${interaction.guild.channels.cache.get(newChannelId).name}`, ephemeral: false }); // الرسالة مرئية للجميع
    }
});

// تسجيل الدخول
client.login(config.token_bot).catch((error) => {
    console.error('Error logging in:', error);
});