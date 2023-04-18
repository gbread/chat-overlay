import dictionaries from "../assets/dictionaries.js";

import fastq from "fastq";

import {settings_db, usernames_db, users_blacklist_db, users_whitelist_db, users_aliases_db, users_tts_languages_db} from "./db.js";

import {emitter, maybe_push, create_promise, is_url, emoji_regex} from "./utils.js";

import {tts_messages, tts_errors} from "./stores.js";

// Settings data.
let settings_data = {};
settings_db.subscribe(($settings_db) => settings_data = $settings_db.data);

// Messages.
let messages = [];
tts_messages.subscribe(($messages) => messages = $messages);

// Errors.
let errors = [];
tts_errors.subscribe(($errors) => errors = $errors);

let previous_username = null;

// Audio queue.
const audio_queue = fastq.promise(async (task_item) => {
    const {"badge-info": badge_info, badges, color, "custom-reward-id": custom_reward_id, "emote-only": is_emote_only, emotes, id: message_id, is_aoe_taunt, aoe_taunt, say_name, "user-id": user_id, username} = task_item;
    let {message} = task_item;

    // Skip deleted message.
    const message_index = messages.findIndex((m) => m.id === message_id);
    if (message_index < 0) return;

    console.log("task_item:", task_item);

    const [promise, resolve] = create_promise();

    const bail_out = () => {
        resolve();
        messages.shift();
        tts_messages.set(messages);
    };

    if (settings_data.skip_emote_only_messages && is_emote_only) return bail_out();

    console.log("message before:", message);

    // Remove all Twitch emotes.
    if (settings_data.remove_twitch_emotes && emotes) {
        const character_to_remove = "|";
        for (const coordinates of Object.values(emotes)) {
            coordinates.forEach((coordinate) => {
                const [from, to] = coordinate.split("-");
                const coordinates_regex = new RegExp(`(?<=^.{${from}}).{${to-from+1}}`, "g");
                message = message.replace(coordinates_regex, character_to_remove.repeat(to - from + 1));
            });
        }
        message = message.replaceAll(character_to_remove, "");
    }

    const link_text = settings_data.link_text;

    let new_message = modify_words(message.toLowerCase(), link_text, dictionaries[settings_data.tts_language.toLowerCase()]);
    console.log("new_message:", new_message);

    // Skip empty messages.
    if (new_message.trim().length < 1) {
        console.log("Empty message detected");
        return bail_out();
    }

    // Modify username.
    let new_username = get_user_alias({username}, "username");
    if (!new_username) {
        new_username = maybe_remove_numbers(modify_words(username, link_text));
    }

    // Say name.
    if (new_message === link_text) {
        new_message = `${new_username} ${settings_data.username_only_link_separator} ${link_text}`;
    } else if (settings_data.say_usernames && say_name) {
        new_message = `${new_username} ${settings_data.username_separator} ${new_message}`;
    }

    // Show comparison.
    if (message !== new_message) {
        messages[message_index].text = `${new_message} (${message})`;
        tts_messages.set(messages);
    }

    console.log("zacinam mluvit");
    const tts_language = users_tts_languages_db.data.find((user_tts) => user_tts.user_id == user_id)?.tts_language ?? settings_data.tts_language.toLowerCase();
    console.log('tts_language:', tts_language);
    let audio_src = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${tts_language}&client=tw-ob&q=${encodeURIComponent(new_message)}`;

    // Play AoE taunt.
    if (is_aoe_taunt) {
        const url = `/taunts/T_${message.trim()}.mp3`;
        console.log("audio_src: ", audio_src);

        // Check for file.
        const response = await fetch(url, {method: "HEAD"});
        if (response.ok && response.status !== 404) {
            audio_src = url;
        }
    }

    try {
        // TODO: move outside to prevent memory leak.
        const audio = new Audio(audio_src);

        // Audio volume.
        audio.volume = settings_data.volume;
        emitter.on("audio_change_volume", ({volume}) => {
            audio.volume = volume;
        });

        // Audio speed.
        audio.playbackRate = settings_data.speed;
        emitter.on("audio_change_speed", ({speed}) => {
            audio.playbackRate = speed;
        });

        // Audio preserve pitch.
        audio.preservesPitch = settings_data.preserve_pitch;
        emitter.on("audio_change_preserves_pitch", ({preserve_pitch}) => {
            audio.preservesPitch = preserve_pitch;
        });

        // Can play through event.
        audio.addEventListener("canplaythrough", (event) => {
            console.log("audio play");
            audio.play().catch((error) => {
                console.error("NO PLAY! ", error);
                console.error("AUDIO ERROR?", audio.error);
                console.error(audio.src);
                tts_errors.set(maybe_push(errors, error, 5));
                resolve();
            });
        });

        // Ended event.
        audio.addEventListener("ended", (event) => {
            console.log("audio ended", audio.src);
            audio.remove();
            resolve();
        });

        // Stop audio on event.
        emitter.on("tts_stop_audio", () => {
            audio.pause();
            audio.remove();
            resolve();
        });

        // Error event.
        audio.addEventListener("error", async (error) => {
            const error_types = {
                "1": "MEDIA_ERR_ABORTED",
                "2": "MEDIA_ERR_NETWORK",
                "3": "MEDIA_ERR_DECODE",
                "4": "MEDIA_ERR_SRC_NOT_SUPPORTED",
            };

            tts_errors.set(maybe_push(errors, `[${new Date().toLocaleString()}] ${error_types[audio?.error?.code]}`, 5));
            resolve();
        });

    } catch (error) {
        resolve();
        console.log("ERRRROROR", error);
        tts_errors.set(maybe_push(errors, error, 5));
    }

    await promise;

    // Sleep before next
    console.log("sleep start");
    await new Promise((r) => setTimeout(r, 700));
    console.log("sleep end");
    messages.shift();
    tts_messages.set(messages);
}, 1);

audio_queue.error((error, task_item) => {
    if (!error) return;

    console.error("Audio queue error:", error);
});

function modify_words(message, link_text, dictionary) {
    console.log("message_fragments start:", message);
    // Replace URLs.
    let message_fragments = message.split(/\s/gi).map((message_fragments) => (is_url(message_fragments)) ? link_text : message_fragments).join(" ").trim();
    console.log("message_fragments before:", message_fragments);

    // Add space before punctuations and split message into words
    message_fragments = message_fragments.replace(/([.?!,]+)/gi, " $1").split(/\s/gi);

    // Modify words.
    for (let i = 0; i < message_fragments.length; i++) {
        let message_fragment = message_fragments[i];

        (() => {
            // Handle usernames.
            if (message_fragment.startsWith("@")) {
                const user = {username: message_fragment.substring(1)};
                // Remove blacklisted username.
                if (settings_data.remove_mentions_at_blacklisted_users && (!is_user_whitelisted(user, "username") && is_user_blacklisted(user, "username"))) {
                    message_fragment = "";
                    return;
                }

                // Change username to alias.
                const username_alias = get_user_alias(user, "username");
                if (username_alias) {
                    message_fragment = `et ${username_alias}`;
                    return;
                }

                // Remove numbers from username.
                if (settings_data.skip_over_numbers_in_usernames) {
                    message_fragment = maybe_remove_numbers(message_fragment);
                }
            }

            // Replace message fragment with dictionary item.
            if (dictionary) {
                const found = dictionary[message_fragment];
                if (found) {
                    message_fragment = found;
                }
            }

            // Remove underscores.
            message_fragment = message_fragment.replaceAll("_", " ");

            // Add space before number.
            message_fragment = message_fragment.replace(/(\d+)/gi, " $1");

            // Remove Emojis.
            message_fragment = message_fragment.replace(emoji_regex(), "");
        })();

        message_fragments[i] = message_fragment;
    }

    console.log("message_fragments after:", message_fragments);
    return message_fragments.join(" ").trim();
}

function is_user_whitelisted(user, type) {
    return is_user_in_db(users_whitelist_db, user, type);
}

function is_user_blacklisted(user, type) {
    return is_user_in_db(users_blacklist_db, user, type);
}

function get_user_alias(user, type) {
    return is_user_in_db(users_aliases_db, user, type, true)?.alias ?? "";
}

function is_user_in_db(db, user, type, get = false) {
    const {user_id, username, alias} = user;
    let found;

    if (username && type === "username") {
        found = db.data.find((db_user) => db_user[type].toLowerCase() === username.toLowerCase());
        if (get) {
            return found;
        }

        return !!found;
    } else if (user_id && type === "user_id") {
        found = !!db.data.find((db_user) => db_user.user_id === Number(user_id));
        if (get) {
            return found;
        }

        return !!found;
    }

    return false;
}

function maybe_remove_numbers(message) {
    if (!settings_data.skip_over_numbers_in_usernames) return message;
    const new_message = message.replace(/\d+/g, "");

    // Log change.
    if (new_message !== message) {
        console.log("removed numbers", message, "->", new_message);
    }

    return new_message;
}

export function parse_message(channel, data, message, is_self) {
    console.log("data:", data, "message: ", message);

    const {
        "badge-info": badge_info,
        badges = {},
        "badges-raw": badges_raw,
        color,
        "custom-reward-id": custom_reward_id,
        "display-name": display_name,
        "emote-only": is_emote_only,
        emotes,
        "emotes-raw": emotes_raw,
        id: message_id,
        "message-type": message_type,
        mod: is_mod,
        subscriber: is_subscriber,
        "user-id": user_id,
        "user-type": user_type,
        username,
    } = data;
    const is_vip = badges?.vip ?? false;
    const is_broadcaster = badges?.broadcaster ?? false;
    const sent_bits = badges?.bits ?? false;
    const has_no_video = badges?.no_video ?? false;
    const is_founder = badges?.founder ?? false;
    const is_partner = badges?.partner ?? false;
    const is_prime = badges?.premium ?? false;
    const user = {user_id, username};

    maybe_save_username(username, user_id);

    // Skip same message and sent less than 1 minutes ago.
    // TODO:

    // Skip command.
    if (message && message.startsWith("!")) return;

    const is_whitelisted = {
        user_id: is_user_whitelisted(user, "user_id"),
        username: is_user_whitelisted(user, "username"),
    }

    // Skip non-whitelisted blacklisted usernames.
    if (!is_whitelisted.user_id && !is_whitelisted.username) {
        if (is_user_blacklisted(user, "user_id") || is_user_blacklisted(user, "username")) return;
    }

    let read_message = false;

    // Determine whether to read this message.
    (() => {
        const allow_message = () => {
            read_message = true;
        };

        if (is_whitelisted.user_id || is_whitelisted.username) {
            return allow_message();
        }

        if (settings_data.read_broadcaster && is_broadcaster) {
            return allow_message();
        }

        if (settings_data.read_vip_users && is_vip) {
            return allow_message();
        }

        if (settings_data.read_subscribers && is_subscriber) {
            return allow_message();
        }

        if (settings_data.read_nonsubscribers && !is_subscriber) {
            return allow_message();
        }

    })();

    // Maybe bail out.
    console.log("read_message:", read_message);
    if (!read_message) return;

    // Messages visual queue.
    messages.push({
        id: message_id,
        text: message,
    });
    tts_messages.set(messages);

    // Determine if message is aoe taunt.
    const is_aoe_taunt = (settings_data.use_aoe_taunts && Number(message.trim()) == message.trim());
    console.log("is_aoe_taunt:", is_aoe_taunt);
    data.is_aoe_taunt = is_aoe_taunt;

    // TODO: split messages length

    // Say name of non consecutive username.
    if (previous_username !== username) {
        data.say_name = true;
    } else {
        data.say_name = false;
    }

    // Push to talking queue.
    audio_queue.push({
        ...data,
        message,
    });

    // Store previous username.
    if (!is_aoe_taunt) {
        previous_username = username;
    } else {
        previous_username = null;
    }
}

export function test_message(data, message) {
    parse_message("", data, message);
}

function maybe_save_username(username, user_id) {
    if (!user_id || usernames_db.data[user_id]) return;

    usernames_db.data[user_id] = username;
    usernames_db.write();
}
