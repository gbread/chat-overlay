<script>
    import {onMount} from "svelte";

    import {router} from "tinro";
    import RangeSlider from "svelte-range-slider-pips";

    import fastq from "fastq";
    import tmi from "tmi.js";
    import {franc, francAll} from "franc";


    import {maybe_push} from "./utils.js";

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
        read_subscribers: "true",
        read_nonsubscribers: "false",
        read_vip_users: "true",
        use_aoe_taunts: "false",
    };

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
    }


    const talk_queue = fastq.promise(async (task_item) => {
        const {message, "badge-info": badge_info, badges, color, is_aoe_taunt, aoe_taunt} = task_item;
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

        console.log("zacinam mluvit");
        const lang = "cs-cz";
        let audio_src = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(message)}`;

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
        const is_vip = badges["vip"];
        const is_broadcaster = badges["broadcaster"];
        const sent_bits = badges["bits"];

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

        messages.push(message);
        messages = messages;

        // Determine if message is aoe taunt.
        const is_aoe_taunt = (settings.use_aoe_taunts === "true" && Number(message.trim()) == message.trim());
        console.log('is_aoe_taunt: ', is_aoe_taunt);
        data.is_aoe_taunt = is_aoe_taunt;
        data.aoe_taunt = message.trim();

        // TODO: split messages length
        // TODO: url přečti jako "odkaz" nebo "link"

        if (previous_username === username) {
            talk_queue.push({
                ...data,
                message,
            });
        } else {

            talk_queue.push({
                ...data,
                message: `${username} říká: ${message}`,
            });
        }

        previous_username = username;
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

    let link = new URL(location);
</script>

{#if (Object.keys($router.query).length < 1)}
    <h1>Settings:</h1>
    {#each Object.entries(settings) as [key, value]}
        <div>
            {#if (value === "true" || value === "false")}
                {key}
                <input type=checkbox on:change={(event) => {
                    const checked = event.target.checked;
                    console.log("checked", checked);

                    link.searchParams.set(key, checked);
                    link = link;
                }}>
            {:else if (key !== "blacklist")}
                {key}
                {value}
                <input type="text" on:input={(event) => {
                    const text = event.target.value;
                    console.log('event: ', event);
                    console.log('text: ', text);
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
                <li>{message}</li>
            {/each}
        </ul>
    {/if}
{/if}

<style>
    .max-width {
        max-width: 350px;
    }
</style>
