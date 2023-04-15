<script>
    import "@picocss/pico";
    import "./assets/styles.css";

    import Settings from "./lib/components/Settings.svelte";
    import TTS from "./lib/components/TTS.svelte";

    import {Route, router} from "tinro";
    router.mode.memory();

    import tmi from "tmi.js";

    import {settings_db} from "./lib/db.js";

    import {emitter, debounce} from "./lib/utils.js";

    import {parse_message} from "./lib/tts.js";

    let show_settings = false;
    let show_tts = false;

    let client = new tmi.Client({
        channels: [],
    });
    let is_connected = false;

    if ($settings_db.data.use_tts) {
        console.log("Listening to messages");
        client.on("message", parse_message);

        // TODO:
        client.on("messagedeleted", (channel, username, deletedMessage, userstate) => {
            console.log('channel: ', channel);
            console.log('username: ', username);
            console.log('deletedMessage: ', deletedMessage);
            console.log('userstate: ', userstate);
        });
    }

    const connect = debounce(async (channel) => {
        if (typeof channel === "object") {
            ({channel} = channel)
        }
        console.log('channel:', channel);
        //await client?.disconnect();

        // Channel is required.
        if (!channel) return;

        client.channels = [channel];

        if (!is_connected) {
            await client.connect();
            console.log("connected!");
        }
    }, 1500);

    emitter.on("set_channel", connect);
    connect($settings_db.data.channel);

</script>

<main class="container-fluid">
    <Route path="/">
        <button class="btn-small" on:click={() => show_settings = !show_settings}>
            {#if (show_settings)}
                Hide settings
            {:else}
                Show settings
            {/if}
        </button>

        {#if (show_settings)}
            <Settings />
        {/if}

        {#if ($settings_db.data.use_tts)}
            <button class="btn-small" on:click={() => show_tts = !show_tts}>
                {#if (show_tts)}
                    Hide TTS
                {:else}
                    Show TTS
                {/if}
            </button>

            {#if (show_tts)}
                <TTS />
            {/if}
        {/if}
    </Route>
</main>
