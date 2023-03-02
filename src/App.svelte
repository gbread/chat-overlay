<script>
    import {onMount} from "svelte";

    import {router} from "tinro";
    import RangeSlider from "svelte-range-slider-pips";

    import fastq from "fastq";
    import tmi from "tmi.js";
    import {franc, francAll} from "franc";

    import {maybe_push, modify_words} from "./utils.js";

    const create_promise = () => {
        let resolver;
        return [
            new Promise((resolve, reject) => {
                resolver = resolve;
            }),
            resolver,
        ];
    }

    // Settings.
    const settings = {
        blacklist: [
            "streamelements",
            "nightbot",
            "soundalerts",
        ],
        channel: "",
        hide_chat: "false",
        use_tts: "true",
        read_broadcaster: "true",
        read_vip_users: "true",
        read_subscribers: "true",
        read_nonsubscribers: "false",
        remove_twitch_emotes: "true",
        skip_emote_only_messages: "true",
        say_names: "true",
        use_aoe_taunts: "false",
    };

    let link = new URL(location);

    function set_settings() {
        // Possible url parameters to override settings.
        const possible_settings = Object.keys(settings);

        console.log("query", $router.query);
        // Apply found url parameters to settings.
        for (let possible_setting of possible_settings) {
            const setting_value = $router.query[possible_setting];
            console.log(possible_setting, 'setting_value: ', setting_value);

            // Store setting value.
            if (setting_value) {
                settings[possible_setting] = setting_value;
            }
        }
        console.log("after", JSON.stringify({settings}, null, 2));

        // Update link.
        for (const [key, value] of Object.entries(settings)) {
            if (key === "blacklist") continue;
            link.searchParams.set(key, value);
        }
        link = link;
    }

    // Audio queue.
    const talk_queue = fastq.promise(async (task_item) => {
        const {"badge-info": badge_info, badges, color, "emote-only": is_emote_only, emotes, is_aoe_taunt, aoe_taunt, say_name, message_id, username} = task_item;
        let {message} = task_item;
        console.log('task_item: ', task_item);

        const [promise, resolve] = create_promise();

        const bail_out = () => {
            resolve();
            messages.shift();
            messages = messages;
        };

        const ee = francAll(message, {
            only: languages,
        });
        console.log('ee: ', ee);

        const e = franc(message, {
            only: languages,
        });
        console.log('e: ', e);

        if (settings.skip_emote_only_messages && is_emote_only) return bail_out();

        console.log("message before:", message);

        // Remove all Twitch emotes.
        if (settings.remove_twitch_emotes && emotes) {
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

        const link_text = "odkaz";

        let new_message = modify_words(message, link_text);
        console.log('new_message: ', new_message);

        // Skip empty messages.
        if (new_message.trim().length < 1) {
            console.log("Empty message detected");
            return bail_out();
        }

        const new_username = modify_words(username, link_text);

        // Say name.
        if (new_message === link_text) {
            new_message = `${new_username} posílá ${link_text}`;
        } else if (settings.say_names && say_name) {
            new_message = `${new_username} říká ${new_message}`;
        }

        // Show comparison.
        if (message !== new_message) {
            const message_index = messages.findIndex((m) => m.id === message_id);
            if (message_index >= 0) {
                messages[message_index].text = `${new_message} (${message})`;
                messages = messages;
            }
        }

        console.log("zacinam mluvit");
        const lang = "cs-cz";
        let audio_src = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(new_message)}`;

        // Play AoE taunt.
        if (is_aoe_taunt) {
            const url = `/taunts/T_${message.trim()}.mp3`;
            console.log('audio_src: ', audio_src);

            // Check for file.
            const response = await fetch(url, {method: "HEAD"});
            if (response.ok && response.status !== 404) {
                audio_src = url;
            }
        }

        try {
            const audio = new Audio(audio_src);
            function fix_duration() {
                audio.currentTime = 0;
                audio.removeEventListener('timeupdate', fix_duration);
                const duration = audio.duration;
                console.log("new duration", duration);

                if (duration === Infinity) {
                    console.log("WTF JE TO TU ZAS");;
                    return;
                }

                play_audio(duration);
            }

            async function play_audio(duration) {
                const duration_mils = duration * 1000 + 100;
                console.log('duration_mils: ', duration_mils);
                audio.play().catch((error) => {
                    console.error("NO PLAY! ", error);
                    errors = maybe_push(errors, error, 5);
                    resolve();
                });

                console.log("duration wait start");
                await new Promise((r) => setTimeout(r, duration_mils));
                console.log("duration wait done");
                resolve();
            }

            audio.volume = volume[0];
            audio.addEventListener("loadedmetadata", async () => {
                const duration = audio.duration;
                console.log('duration: ', duration);

                // Fix infinity duration bug.
                if (duration === Infinity) {
                    audio.currentTime = 1e101;
                    audio.addEventListener("timeupdate", fix_duration);
                    console.error("Infinity bug");
                    return;
                }

                play_audio(duration);
            });

            audio.addEventListener("error", (error) => {
                console.error("Audio error:", error);
                errors = maybe_push(errors, "Audio error", 5);
                resolve();
            });

        } catch (error) {
            resolve();
            console.log("ERRRROROR", error);
            errors = maybe_push(errors, error, 5);
        }

        await promise;
        console.log("domluvil jsem");

        // Sleep before next
        console.log("sleep start");
        await new Promise((r) => setTimeout(r, 700));
        console.log("sleep end");
        messages.shift();
        messages = messages;
    }, 1);

    talk_queue.error((error, task_item) => {
        if (!error) return;

        console.error("Queue error:", error);
    });

    let errors = [];
    let messages = [];
    let message = "";
    let volume = [localStorage.getItem("volume") || 1];
    let previous_username = null;
    const languages = [
        "eng",
        "ces",
        "slk",
    ];

    let client;

    onMount(async () => {
        set_settings();

        // Channel is required.
        if (!settings.channel) return;

        client = new tmi.Client({
            channels: [settings.channel],
        });

        await client.connect();
        console.log("connected!");

        if (settings.use_tts === "true") {
            console.log("Listening to messages");
            client.on("message", parse_message);
        }
    });

    function parse_message(channel, data, message, is_self) {
        console.log("data:", data, "message: ", message);

        const {
            "badge-info": badge_info,
            badges = {},
            "badges-raw": badges_raw,
            color,
            "display-name": display_name,
            "emote-only": is_emote_only,
            emotes,
            "emotes-raw": emotes_raw,
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

        // Skip same message and sent less than 1 minutes ago.
        // TODO:

        // Skip command.
        if (message.startsWith("!")) return;

        // Skip blacklisted usernames.
        if (settings.blacklist.includes(username.toLowerCase())) return;

        let read_message = false;

        // Determine if to read
        (() => {
            if (settings.read_broadcaster === "true" && is_broadcaster) {
                read_message = true;
                return;
            }

            if (settings.read_vip_users === "true" && is_vip) {
                read_message = true;
                return;
            }

            if (settings.read_subscribers === "true" && is_subscriber) {
                read_message = true;
                return;
            }

            if (settings.read_nonsubscribers === "true" && !is_subscriber) {
                read_message = true;
                return;
            }

        })();

        // Maybe bail out.
        console.log('read_message: ', read_message);
        if (!read_message) return;

        // Messages visual queue.
        const message_id = crypto.randomUUID();
        messages.push({
            id: message_id,
            text: message,
        });
        messages = messages;
        data.message_id = message_id;

        // Determine if message is aoe taunt.
        const is_aoe_taunt = (settings.use_aoe_taunts === "true" && Number(message.trim()) == message.trim());
        console.log('is_aoe_taunt: ', is_aoe_taunt);
        data.is_aoe_taunt = is_aoe_taunt;

        // TODO: split messages length

        // Say name of non consecutive username.
        if (previous_username !== username) {
            data.say_name = true;
        } else {
            data.say_name = false;
        }

        // Push to talking queue.
        talk_queue.push({
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

    function test_message() {
        const badge_info = {
            subscriber: "1",
        }
        const badges = {
            ...badge_info,
            broadcaster: "1",
        }
        //const badges_raw = "subscriber/1";
        const badges_raw = "broadcaster/1,subscriber/1";
        //const badges_raw = "vip/1,no_video/1";
        const color = "#008000";
        const emotes = null;
        const emotes_raw = null;
        const message_type = "chat";
        const display_name = "Tester";
        const is_mod = false;
        const is_subscriber = true;
        const user_id = "160298966";
        const user_type = null;
        const username = "tester";

        const data = {
            "badge-info": badge_info,
            badges,
            "badges-raw": badges_raw,
            color,
            "display-name": display_name,
            emotes,
            emotes_raw,
            "message-type": message_type,
            mod: is_mod,
            subscriber: is_subscriber,
            "user-id": user_id,
            "user-type": user_type,
            username,
        };

        parse_message("", data, message);
    }

</script>

<!-- Settings form. -->
{#if (Object.keys($router.query).length < 1)}
    <h1>Settings:</h1>
    {#each Object.entries(settings) as [key, value]}
        <div>
            {#if (value === "true" || value === "false")}
                <!-- Checkbox. -->
                {key}
                <input type=checkbox checked={value === "true"} on:change={(event) => {
                    const checked = event.target.checked;

                    link.searchParams.set(key, checked);
                    link = link;
                }}>
            {:else if (key !== "blacklist")}
                <!-- Text input. -->
                {key}
                {value}
                <input type="text" on:input={(event) => {
                    const text = event.target.value;

                    link.searchParams.set(key, text);
                    link = link;
                }}>
            {/if}
        </div>
    {/each}

    <br>
    <strong>URL link:</strong>
    <pre>{link}</pre>
    <br>
{/if}

{#if (settings.hide_chat !== "true")}
    <input type="text" bind:value={message}>
    <button on:click={test_message}>promluvit</button>

    <br>

    <div class="max-width">
        <RangeSlider min={0} max={1} step={0.01} pips hoverable all="label" float pipstep={10} bind:values={volume} on:change={() => {
            localStorage.setItem("volume", volume);
        }} />
    </div>
    <h1>Volume: {volume[0]}</h1>

    {#if (errors.length > 0)}
        <h1>{errors.length} last errors:</h1>
        <ul>
            {#each errors as error}
                <li>{error}</li>
            {/each}
        </ul>
    {/if}

    {#if (messages.length > 0)}
        <h1>({messages.length}) Message queue:</h1>
        <ul>
            {#each messages as message}
                <li>{message.text}</li>
            {/each}
        </ul>
    {/if}
{/if}

<style>
    :global(body) {
        background-color: #fff;
    }

    .max-width {
        max-width: 350px;
    }
</style>
