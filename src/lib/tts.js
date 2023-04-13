
import fastq from "fastq";

import {settings_db, usernames_db, usernames_blacklist_db, usernames_whitelist_db} from "./db.js";

import {emitter, maybe_push, create_promise} from "./utils.js";

import {tts_messages, tts_errors} from "./stores.js";

let messages = [];
tts_messages.subscribe(($messages) => messages = $messages);

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

    if (settings_db.data.skip_emote_only_messages && is_emote_only) return bail_out();

    console.log("message before:", message);

    // Remove all Twitch emotes.
    if (settings_db.data.remove_twitch_emotes && emotes) {
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

    const link_text = settings_db.data.link_text;

    let new_message = modify_words(message, link_text);
    console.log("new_message: ", new_message);

    // Skip empty messages.
    if (new_message.trim().length < 1) {
        console.log("Empty message detected");
        return bail_out();
    }

    // Modify username.
    let new_username = modify_words(username, link_text);
    if (settings_db.data.skip_over_numbers_in_usernames) {
        new_username = new_username.replace(/\d+/g, "");
        if (new_username !== username) {
            console.log("changed username", username, "->", new_username);
        }
    }

    // Say name.
    if (new_message === link_text) {
        new_message = `${new_username} ${settings_db.data.username_only_link_separator} ${link_text}`;
    } else if (settings_db.data.say_usernames && say_name) {
        new_message = `${new_username} ${settings_db.data.username_separator} ${new_message}`;
    }

    // Show comparison.
    if (message !== new_message) {
        messages[message_index].text = `${new_message} (${message})`;
        tts_messages.set(messages);
    }

    console.log("zacinam mluvit");
    const lang = settings_db.data.tts_language.toLowerCase();
    let audio_src = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(new_message)}`;

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
        audio.volume = settings_db.data.volume;
        emitter.on("audio_change_volume", ({volume}) => {
            audio.volume = volume;
        });

        // Audio speed.
        audio.playbackRate = settings_db.data.speed;
        emitter.on("audio_change_speed", ({speed}) => {
            audio.playbackRate = speed;
        });

        // Audio preserve pitch.
        audio.preservesPitch = settings_db.data.preserve_pitch;
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
    console.log("domluvil jsem");

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

function modify_words(message, link_text) {
    let message_fragments = message.split(/\s/gi);
    console.log("message_fragments before", message_fragments);

    // Modify words.
    for (let i = 0; i < message_fragments.length; i++) {
        let message_fragment = message_fragments[i];

        (() => {
            // URLs.
            if (is_url(message_fragment)) {
                message_fragment = link_text;
                return;
            }

            // Remove underscores.
            message_fragment = message_fragment.replaceAll("_", " ");

            // Add space before number.
            message_fragment = message_fragment.replace(/(\d+)/gi, " $1");

            // Remove Emojis.
            message_fragment = message_fragment.replace(emoji_regex(), "");
        })();

        message_fragments[i] = message_fragment.toLowerCase();
    }

    console.log("message_fragments after", message_fragments);
    return message_fragments.join(" ");
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

    maybe_save_username(username, user_id);

    // Skip same message and sent less than 1 minutes ago.
    // TODO:

    // Skip command.
    if (message && message.startsWith("!")) return;

    // Skip blacklisted usernames.
    if ((user_id && usernames_blacklist_db.data.includes(Number(user_id))) || (username && usernames_blacklist_db.data.includes(username.toLowerCase()))) return;

    let read_message = false;

    // Determine if to read
    (() => {
        if (settings_db.data.read_broadcaster && is_broadcaster) {
            read_message = true;
            return;
        }

        if (settings_db.data.read_vip_users && is_vip) {
            read_message = true;
            return;
        }

        if (settings_db.data.read_subscribers && is_subscriber) {
            read_message = true;
            return;
        }

        if (settings_db.data.read_nonsubscribers && !is_subscriber) {
            read_message = true;
            return;
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
    const is_aoe_taunt = (settings_db.data.use_aoe_taunts && Number(message.trim()) == message.trim());
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
