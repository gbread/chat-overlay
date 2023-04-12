<script>
    import languages from "../../assets/languages-en-us.json";

    import AutoComplete from "simple-svelte-autocomplete";

    import {settings_db} from "../db.js";

    import {emitter} from "../utils.js";

    const settings_schema = {
        channel: {
            label: "Channel",
            type: "text",
            emit_event: "set_channel",
        },
        show_chat: {
            label: "Show chat",
            type: "boolean",
        },
        use_tts: {
            label: "Use TTS",
            type: "boolean",
        },
        tts_language: {
            label: "TTS language",
            type: "select",
            show_max: 7,
            dependant_on: "use_tts",
        },
        read_broadcaster: {
            label: "Read broadcaster",
            type: "boolean",
            dependant_on: "use_tts",
        },
        read_vip_users: {
            label: "Read VIP users",
            type: "boolean",
            dependant_on: "use_tts",
        },
        read_subscribers: {
            label: "Read subscribers",
            type: "boolean",
            dependant_on: "use_tts",
        },
        read_nonsubscribers: {
            label: "Read non-subscribers",
            type: "boolean",
            dependant_on: "use_tts",
        },
        remove_twitch_emotes: {
            label: "Remove Twitch emotes",
            type: "boolean",
            dependant_on: "use_tts",
        },
        skip_emote_only_messages: {
            label: "Skip emote-only messages",
            type: "boolean",
            dependant_on: "use_tts",
        },
        say_usernames: {
            label: "Pronounce usernames",
            type: "boolean",
            dependant_on: "use_tts",
        },
        username_separator: {
            label: "Separator after username",
            type: "text",
            dependant_on: "say_usernames",
        },
        username_only_link_separator: {
            label: "Separator after only link",
            type: "text",
            dependant_on: "say_usernames",
        },
        skip_over_numbers_in_usernames: {
            label: "Skip over numbers in usernames",
            type: "boolean",
            dependant_on: "say_usernames",
        },
        link_text: {
            label: "Replace URL links with",
            type: "text",
            dependant_on: "use_tts",
        },
        use_aoe_taunts: {
            label: "Use AoE taunts",
            type: "boolean",
            dependant_on: "use_tts",
        },
        volume: {
            label: "Volume",
            type: "range",
            min: "0.0",
            step: "0.01",
            max: "1.0",
            emit_event: "audio_change_volume",
            dependant_on: "use_tts",
        },
        speed: {
            label: "Speed",
            type: "range",
            min: "0.1",
            step: "0.01",
            max: "2.5",
            emit_event: "audio_change_speed",
            dependant_on: "use_tts",
        },
        preserve_pitch: {
            label: "Adjust the pitch of the audio to compensate for changes to the speed",
            type: "boolean",
            emit_event: "audio_change_preserves_pitch",
            dependant_on: "use_tts",
        },
    };

    function save_setting(key, value, schema) {
        // Skip same value.
        if (settings_db.data[key] === value) return;

        // Save new setting.
        settings_db.data[key] = value;
        settings_db.write();

        // Emit event.
        if (schema?.emit_event) {
            emitter.emit(schema.emit_event, {
                [key]: value,
            });
        }

    }

    function should_show_setting_item(schema) {
        if (!schema?.dependant_on) return true;

        while (true) {
            const {dependant_on} = schema;
            if (!dependant_on) return true;

            if (settings_db.data[dependant_on]) {
                schema = settings_schema[dependant_on];
            } else {
                return false;
            }
        }
    }

    function get_depth(key) {
        let depth = 1;
        while (true) {
            const dependant_on = settings_schema[key]?.dependant_on;
            if (dependant_on) {
                depth++;
                key = dependant_on;
            } else {
                break;
            }
        }
        return depth;
    }

</script>

<h2>Settings:</h2>

<ul class="-no-bullets">
    {#each Object.entries(settings_db.data) as [key, value] (key)}
        {@const schema = settings_schema[key]}
        {#if (schema && should_show_setting_item(schema))}
            <li class:-dependant={schema?.dependant_on} style="--depth: {get_depth(key)}">
                {#if (schema.type === "boolean")}
                    <!-- Checkbox. -->
                    <label for={`settings-${key}`}>
                        <input type="checkbox" id={`settings-${key}`} checked={value} on:change={(event) => save_setting(key, event.target.checked, schema)}>
                        {schema.label}
                    </label>
                {:else if (schema.type == "text")}
                    <!-- Text input. -->
                    <div class="vertical-wrap">
                        <span class="label">{schema.label}</span>
                        <input type="text" placeholder={schema.label} value={value} on:input={(event) => save_setting(key, event.target.value, schema)}>
                    </div>
                {:else if (schema.type == "range")}
                    <!-- Range slider. -->
                    <div class="vertical-wrap">
                        {schema.label}
                        <input type="range" min={schema.min} step={schema.step} max={schema.max} {value} on:input={(event) => save_setting(key, parseFloat(event.target.value), schema)}>
                        <span class="range-value">{value.toFixed(2)}</span>
                    </div>
                {:else if (schema.type === "select")}
                    {@const set_language = (value) => languages.find((language) => language.code.toLowerCase() === value.toLowerCase())}

                    <div class="vertical-wrap">
                        {schema.label}
                        <AutoComplete items={languages} labelFieldName="name" placeholder={schema.label} selectedItem={set_language(value)} onChange={(data) => save_setting(key, data.code, schema)} />
                    </div>
                {/if}
            </li>
        {/if}
    {/each}
</ul>

<style>
    ul.-no-bullets {
        padding-left: 0;
    }
    ul.-no-bullets li {
        list-style: none;
    }

    ul li.-dependant {
        padding-left: calc(var(--spacing) * var(--depth, 1));
    }
</style>