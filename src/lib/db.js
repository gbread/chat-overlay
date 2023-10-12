import {get, writable} from "svelte/store";

import {LowSync} from "lowdb";
import {LocalStorage} from "lowdb/browser";

// Settings.
const settings_db = writable(new LowSync(new LocalStorage("settings")));
const settings = get(settings_db);
settings.read();
settings.data ||= {};

// Set defaults.
const settings_db_default = {
    channel: "",
    show_chat: false,
    use_tts: false,
    tts_language: "en-US",
    read_broadcaster: true,
    read_moderators: true,
    read_vip_users: true,
    read_subscribers: true,
    read_nonsubscribers: false,
    read_partners: true,
    read_sub_gift_leaders: true,
    read_bit_leaders: true,
    read_sub_gifters_over: 10,
    remove_twitch_emotes: true,
    remove_ffz_emotes: true,
    remove_bttv_emotes: true,
    remove_7tv_emotes: true,
    skip_emote_only_messages: true,
    say_usernames: true,
    username_separator: "says",
    question_separator: "asks",
    reply_separator: "replies to",
    username_only_link_separator: "sends",
    skip_over_numbers_in_usernames: false,
    remove_mentions_at_blacklisted_users: false,
    link_text: "link",
    use_long_number_text: false,
    long_number_text: "number",
    use_aoe_taunts: false,
    volume: 1,
    speed: 1,
    preserve_pitch: true,
};

// Merge defaults with current data.
settings.data = {
    ...settings_db_default,
    ...settings.data,
}
settings_db.set(settings);

// TODO: migrations

// Usernames.
const usernames_db = new LowSync(new LocalStorage("usernames"));
usernames_db.read();
usernames_db.data ||= {};

// Users blacklist.
const users_blacklist_db = new LowSync(new LocalStorage("users_blacklist"));
users_blacklist_db.read();
users_blacklist_db.data ||= [
    {
        user_id: 100135110,
        username: "streamelements",
    },
    {
        user_id: 105166207,
        username: "streamlabs",
    },
    {
        user_id: 19264788,
        username: "nightbot",
    },
    {
        user_id: 216527497,
        username: "soundalerts",
    },
    {
        user_id: 786049415,
        username: "spectatordashboard",
    },
];

// Users whitelist.
const users_whitelist_db = new LowSync(new LocalStorage("users_whitelist"));
users_whitelist_db.read();
users_whitelist_db.data ||= [];

// Users aliases.
const users_aliases_db = new LowSync(new LocalStorage("users_aliases"));
users_aliases_db.read();
users_aliases_db.data ||= [];

// Users tts languages.
const users_tts_languages_db = new LowSync(new LocalStorage("users_tts_languages"));
users_tts_languages_db.read();
users_tts_languages_db.data ||= [];

// Channel point rewards whitelist.
const channel_point_rewards_whitelist_db = new LowSync(new LocalStorage("channel_point_rewards_whitelist"));
channel_point_rewards_whitelist_db.read();
channel_point_rewards_whitelist_db.data ||= [];

export {
    settings_db,
    usernames_db,
    users_blacklist_db,
    users_whitelist_db,
    users_aliases_db,
    users_tts_languages_db,
    channel_point_rewards_whitelist_db,
};
