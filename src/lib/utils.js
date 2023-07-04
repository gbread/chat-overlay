import {get} from "svelte/store";

import emoji_regex from "emoji-regex";
import mitt from "mitt";

import {settings_db} from "./db.js";

import {channel_emotes} from "./stores.js";

export const emitter = mitt();

export function debounce(callback, wait) {
    let timeout_id = null;
    return (...args) => {
        window.clearTimeout(timeout_id);
        timeout_id = window.setTimeout(() => {
            callback.apply(null, args);
        }, wait);
    };
}

/**
 * Limit the size of array
 *
 * @param {[]} array Existing array
 * @param {*} item Item to append to array
 * @param {number} limit Maximum size of array
 * @returns {[]} New array
 */
export function maybe_push(array, item, limit = 10) {
    if (array.length >= limit) {
        array.shift();
    }

    array.push(item);
    return array;
}

/**
 * Check if string is valid URL.
 *
 * @param {string} link
 * @returns {boolean}
 */
export function is_url(link) {
    return Array.isArray(link.match(/(((https?:\/\/)|(www\.))[^\s]+)/gi));
}

export const create_promise = () => {
    let resolver;
    return [
        new Promise((resolve, reject) => {
            resolver = resolve;
        }),
        resolver,
    ];
}

/**
 * Get indexes of substrings in string
 *
 * @param {*} array
 * @param {string} search_item
 * @returns {array}
 */
export function index_of_all(array, search_item) {
    let index = array.indexOf(search_item);
    const indexes = [];
    while (index !== -1) {
      indexes.push(index);
      index = array.indexOf(search_item, ++index);
    }
    return indexes;
}

export async function get_emotes(channel, user_id) {
    const settings = get(settings_db);

    // Store FFZ emotes.
    if (settings.data?.remove_ffz_emotes) {
        store_emotes("ffz", "global", user_id);
        store_emotes("ffz", channel, user_id);
    }

    // Store BTTV emotes.
    if (settings.data?.remove_bttv_emotes) {
        store_emotes("bttv", "global", user_id);
        store_emotes("bttv", channel, user_id);
    }

    // Store 7TV emotes.
    if (settings.data?.remove_7tv_emotes) {
        store_emotes("7tv", "global", user_id);
        store_emotes("7tv", channel, user_id);
    }
}

async function store_emotes(type, channel, user_id) {
    if (!type || !channel || !user_id) return;

    if (get(channel_emotes)?.[channel]?.[type]) return;

    let url = "";

    if (type === "bttv") {
        if (channel === "global") {
            url = "https://api.betterttv.net/3/cached/emotes/global";
        } else {
            url = `https://api.betterttv.net/3/cached/users/twitch/${user_id}`;
        }
    } else if (type === "ffz") {
        if (channel === "global") {
            url = "https://api.frankerfacez.com/v1/set/global";
        } else {
            url = `https://api.frankerfacez.com/v1/room/id/${user_id}`;
        }
    } else if (type === "7tv") {
        if (channel === "global") {
            url = "https://api.7tv.app/v2/emotes/global";
        } else {
            url = `https://api.7tv.app/v2/users/${user_id}/emotes`;
        }
    }

    if (!url) return;

    const response = await fetch(url).catch((error) => {
        console.error(`Getting ${type} emotes error:`, error);
    });

    if (!response?.ok) {
        console.error(`Getting ${type} emotes response not ok! Status: ${response?.status}`);
        return;
    }

    const json = await response.json();

    let emotes = [];

    if (type === "bttv") {
        if (channel === "global") {
            emotes = [
                ...json.map((emote) => emote.code),
            ];
        } else if (json?.channelEmotes && json?.sharedEmotes) {
            emotes = [
                ...json.channelEmotes.map((emote) => emote.code),
                ...json.sharedEmotes.map((emote) => emote.code),
            ];
        }
    } else if (type === "ffz" && json?.sets) {
        emotes = [
            ...Object.values(json.sets).map((set) => set.emoticons.map((emote) => emote.name)).flat(),
        ];
    } else if (type === "7tv" && Array.isArray(json)) {
        emotes = [
            ...json.map((emote) => emote.name),
        ];
    }

    if (emotes.length < 1) return;

    // Update store with new emotes.
    channel_emotes.update((channel_emotes_obj) => {
        if (!channel_emotes_obj[channel]) {
            channel_emotes_obj[channel] = {};
        }
        channel_emotes_obj[channel][type] = emotes;

        return channel_emotes_obj;
    });
}

export {
    emoji_regex,
};