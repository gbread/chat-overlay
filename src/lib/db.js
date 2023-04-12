import {LowSync} from "lowdb";
import {LocalStorage} from "lowdb/browser";

// Settings.
const settings_db = new LowSync(new LocalStorage("settings"));
settings_db.read();
settings_db.data ||= {};

// Set defaults,
const settings_db_default = {
    channel: "",
    show_chat: false,
    use_tts: false,
    tts_language: "en-US",
    read_broadcaster: true,
    read_vip_users: true,
    read_subscribers: true,
    read_nonsubscribers: false,
    remove_twitch_emotes: true,
    skip_emote_only_messages: true,
    say_usernames: true,
    username_separator: "says",
    username_only_link_separator: "sends",
    skip_over_numbers_in_usernames: false,
    link_text: "link",
    use_aoe_taunts: false,
    volume: 1,
    speed: 1,
    preserve_pitch: true,
};

settings_db.data = {
    ...settings_db_default,
    ...settings_db.data,
}

// TODO: migrations

// Usernames.
const usernames_db = new LowSync(new LocalStorage("usernames"));
usernames_db.read();
usernames_db.data ||= {};

// Usernames blacklist.
const usernames_blacklist_db = new LowSync(new LocalStorage("usernames_blacklist"));
usernames_blacklist_db.read();
usernames_blacklist_db.data ||= [
    "streamelements",
    "streamlabs",
    "nightbot",
    "soundalerts",
    786049415, // spectatordashboard
];

// Usernames whitelist.
const usernames_whitelist_db = new LowSync(new LocalStorage("usernames_whitelist"));
usernames_whitelist_db.read();
usernames_whitelist_db.data ||= [];

export {
    settings_db,
    usernames_db,
    usernames_blacklist_db,
    usernames_whitelist_db
};
