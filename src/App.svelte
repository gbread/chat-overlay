<script>
    import {onMount} from "svelte";

    import {router} from "tinro";
    import RangeSlider from "svelte-range-slider-pips";

    import fastq from "fastq";
    import tmi from "tmi.js";
    import {franc, francAll} from "franc";


    import {maybe_push, is_url} from "./utils.js";

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
        const {message, "badge-info": badge_info, badges, color, is_aoe_taunt, aoe_taunt, message_id} = task_item;
        console.log('task_item: ', task_item);

        const [promise, resolve] = create_promise();

        const ee = francAll(message, {
            only: languages,
        });
        console.log('ee: ', ee);

        const e = franc(message, {
            only: languages,
        });
        console.log('e: ', e);


        let message_fragments = message.split(/\s/gi);
        console.log('message_fragments before', message_fragments);

        // Modify words.
        for (let i = 0; i < message_fragments.length; i++) {
            let message_fragment = message_fragments[i];

            (() => {
                // URLs.
                if (is_url(message_fragment)) {
                    message_fragment = "odkaz";
                    return;
                }
            })();

            message_fragments[i] = message_fragment;
        }

        console.log('message_fragments after', message_fragments);
        const new_message = message_fragments.join(" ");
        console.log('new_message: ', new_message);

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

        if (is_aoe_taunt) {
            const url = `/taunts/T_${aoe_taunt}.mp3`;
            console.log('audio_src: ', audio_src);
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

        // Skip same message and sent less than 1 minutes ago.
        // TODO:

        // Skip command.
        if (message.startsWith("!")) return;

        // Skip blacklisted usernames.
        if (settings.blacklist.includes(username.toLowerCase())) return;

        let read_message = false;

        // Determine if to read
        (() => {
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
        data.aoe_taunt = message.trim();

        // TODO: split messages length

        if (previous_username === username) {
            talk_queue.push({
                ...data,
                message,
            });
        } else {

            talk_queue.push({
                ...data,
                message: `${username} říká ${message}`,
            });
        }

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
