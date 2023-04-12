<script>
    import {emitter} from "../utils.js";

    import {test_message} from "../tts.js";

    import {tts_messages, tts_errors} from "../stores.js";

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

    let data = {
        "badge-info": badge_info,
        badges,
        "badges-raw": badges_raw,
        color: "#008000",
        "display-name": "Tester",
        emotes: null,
        emotes_raw: null,
        "message-type": "chat",
        mod: false,
        subscriber: true,
        "user-id": 0, // 160298966
        "user-type": null,
        username: "tester",
    };
    let message = "";
    let show_test_data = false;

    function send_test_message() {
        data.id = crypto.randomUUID();
        test_message(data, message)
    }
</script>

<h2>TTS</h2>

<button class="btn-small" on:click={() => show_test_data = !show_test_data}>Show test data</button>

{#if (show_test_data)}
    <div class="vertical-wrap">
        Username
        <input type="text" bind:value={data.username}>
    </div>

    <div class="vertical-wrap">
        <label for="mod">
            <input type="checkbox" id="mod" bind:checked={data.mod}>
            Is mod
        </label>
    </div>

    <div class="vertical-wrap">
        <label for="subscriber">
            <input type="checkbox" id="subscriber" bind:checked={data.subscriber}>
            Is subscriber
        </label>
    </div>
{/if}

<form on:submit|preventDefault={send_test_message} class="grid -columns">
    <div class="vertical-wrap">
        Message
        <input type="text" placeholder="test message" bind:value={message}>
    </div>
    <button>Send test message</button>
</form>

<br>

{#if ($tts_errors.length > 0)}
    <h3>{$tts_errors.length} {$tts_errors.length > 4 ? "last" : ""} error{$tts_errors.length > 1 ? "s" : ""}:</h3>
    <ul>
        {#each $tts_errors.reverse() as error}
            <li>{error}</li>
        {/each}
    </ul>
{/if}

{#if ($tts_messages.length > 0)}
    <h3>({$tts_messages.length}) Message queue:</h3>
    <ol>
        {#each $tts_messages as message, index (message.id)}
            <li>
                <div class="gridd -columns">
                    {message.text}

                    <!-- Skip / Remove button. -->
                    <button class="btn-small" on:click={() => {
                        if (index > 0) {
                            // Remove this message.
                            $tts_messages = $tts_messages.filter((m) => m.id !== message.id);
                        } else {
                            // Stop this message.
                            emitter.emit("tts_stop_audio");
                        }
                    }}>
                        {#if (index > 0)}
                            remove
                        {:else}
                            skip
                        {/if}
                    </button>
                </div>
            </li>
        {/each}
    </ol>
{/if}

<style>
    .vertical-wrap {
        margin-bottom: var(--spacing);
    }
</style>