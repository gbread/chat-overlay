<script>
    import "@picocss/pico";
    import "./assets/styles.css";

    import {onMount} from "svelte";

    import Settings from "./lib/components/Settings.svelte";
    import TTS from "./lib/components/TTS.svelte";

    import {Route, router} from "tinro";
    router.mode.memory();

    import tmi from "tmi.js";

    import {settings_db} from "./lib/db.js";

    import {debounce} from "./lib/utils.js";

    import {parse_message, skip_or_remove_message} from "./lib/tts.js";

    let show_settings = false;
    let show_tts = false;

    let client = new tmi.Client({
        channels: [],
    });
    let is_connected = false;

    // Listen to messages.
    client.on("message", parse_message);

    // Skip or remove deleted messages.
    client.on("messagedeleted", (channel, username, deleted_message, data) => {
        console.log("deleted data:", data, "username:", username);
        const {"target-msg-id": message_id} = data;

        skip_or_remove_message(message_id);
    });

    // Connect to channel.
    const connect = debounce(async (channel) => {
        if (typeof channel === "object") {
            ({channel} = channel)
        }

        // Channel is required.
        if (!channel) return;

        // Identical channel check.
        if (client.getChannels().includes(`#${channel.toLowerCase()}`)) return;

        if (!is_connected) {
            // Connect.
            await client.connect();
            is_connected = true;
        } else {
            for (const old_channel of client.getChannels()) {
                // Leave old channel.
                await client.part(old_channel);
                console.log("Left channel", old_channel);
            }
        }

        // Join new channel.
        await client.join(channel);
        console.log("Joined channel", channel);

    }, 1500);

    // Connect to channel.
    $: connect($settings_db.data.channel);

    // Detect and display error notifications.
    onMount(() => {
        const report_error = (error = "unknown error") => {
            const error_icon = `<svg xmlns="http://www.w3.org/2000/svg" class="error-icon" fill="none" viewBox="0 0 24 24"><title>Error</title><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
            window.toast.push(`${error_icon} <span>${error}</span>`);
        }

        const handle_rejection = (event) => {
            event.preventDefault();
            console.error(event);
            report_error(event?.reason);
        }

        const handle_error = (event) => {
            event.preventDefault();
            console.error(event);
            report_error(event?.message);
        }

        window.addEventListener("unhandledrejection", handle_rejection);
        window.addEventListener("error", handle_error);

        return () => {
            window.removeEventListener("unhandledrejection", handle_rejection);
            window.removeEventListener("error", handle_error);
        }
    });

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
