<script>
    import {onMount} from "svelte";

    import fastq from "fastq";
    import tmi from "tmi.js";
    import {franc, francAll} from "franc";

    import RangeSlider from "svelte-range-slider-pips";

    const create_promise = () => {
        let resolver;
        return [
            new Promise((resolve, reject) => {
                resolver = resolve;
            }),
            resolver,
        ];
    }

    const blacklist = [
        "streamelements",
        "nightbot",
        "soundalerts",
    ];

    const talk_queue = fastq.promise(async (task_item) => {
        const {message, "badge-info": badge_info, badges, color, } = task_item;
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
        const audio_src = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(message)}`;

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
                    errors.push(error);
                    resolve();
                });

                console.log("duration wait start");
                await new Promise((r) => setTimeout(r, duration_mils));
                console.log("duration wait done");
                resolve();
            }

            console.log("try start");
            audio.volume = volume[0];
            audio.addEventListener("loadedmetadata", async () => {
                const duration = audio.duration;
                console.log('duration: ', duration);

                // Fix infinity duration bug.
                if (duration === Infinity) {
                    audio.currentTime = 1e101;
                    audio.addEventListener("timeupdate", fix_duration);
                    console.log("konec vole");
                    return;
                }

                play_audio(duration);
            });
            console.log("try end");
        } catch (error) {
            resolve();
            console.log("ERRRROROR", error);
            errors.push(error);
            errors = errors;
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
    const languages = [
        "eng",
        "ces",
        "slk",
    ];

    let client;

    let hide_chat = "false";
    let read_subscribers_only;
    let read_vip_users = "true";
    onMount(() => {
        const url = new URL(location);

        // Use TTS.
        const use_tts = url?.searchParams?.get("use-tts");
        console.log('use_tts: ', use_tts);

        // Channel.
        const channel = url?.searchParams?.get("channel");
        console.log('channel: ', channel);

        // Hide chat.
        hide_chat = url?.searchParams?.get("hide-chat");
        console.log('hide_chat: ', hide_chat);

        // Hide chat.
        read_subscribers_only = url?.searchParams?.get("read-subscribers-only");
        console.log('read_subscribers_only: ', read_subscribers_only);

        // Hide chat.
        read_vip_users = url?.searchParams?.get("read-vip-users");
        console.log('read_vip_users: ', read_vip_users);

        client = new tmi.Client({
            channels: [channel],
        });

        client.connect();
        console.log("connected!");

        if (use_tts === "true") {
            console.log("do it");
            client.on("message", parse_message);
        }
    });

    function parse_message(channel, data, message, is_self) {
        const {
            "badge-info": badge_info,
            badges,
            "badges-raw": badges_raw,
            color,
            "display-name": display_name,
            emotes,
            "message-type": message_type,
            mod: is_mod,
            subscriber: is_subscriber,
            "user-id": user_id,
            "user-type": user_type,
            username,
        } = data;

        console.log("data:", data, "message: ", message);

        if (blacklist.includes(username.toLowerCase())) return;

        if (read_subscribers_only === "true") {
            if (!badges_raw.includes("founder") && !badges_raw.includes("subscriber")) {
                return;
            }
        }

        if (read_vip_users !== "true") {
            if (badges_raw.includes("vip")) {
                return;
            }
        }

        messages.push(message);
        messages = messages;

        talk_queue.push({
            ...data,
            message
        });
    }

</script>

{#if (hide_chat !== "true")}
    <input type="text" bind:value={message}>
    <button on:click={() => {
        messages.push(message);
        messages = messages;
        talk_queue.push({message});
    }}>mluvit</button>

    <br>

    <div style="max-width: 350px;">
        <RangeSlider min={0} max={1} step={0.01} pips hoverable all="label" float pipstep={10} bind:values={volume} on:change={() => {
            localStorage.setItem("volume", volume);
        }} />
    </div>
    <h1>Volume: {volume[0]}</h1>

    {#if (errors.length > 0)}
        <h1>{errors.length} errors:</h1>
        <ul>
            {#each errors as error}
                <li>{error}</li>
            {/each}
        </ul>
    {/if}

    {#if (messages.length > 0)}
        <h1>{messages.length} messages:</h1>
        <ul>
            {#each messages as message}
                <li>{message}</li>
            {/each}
        </ul>
    {/if}
{/if}

