<script>
    import languages from "../../assets/languages.js";
    // test these: ,af,af-ZA,am,am-ET,ar-EG,ar-AE,ar-KW,ar-QA,ar,ar-IL,ar-JO,ar-LB,ar-PS,az,az-AZ,bg,bg-BG,bn,bn-BD,bn-IN,ca,ca-es,cs,cs-CZ,de,de-DE,de-CH,de-AT,de-LI,en,en-US,en-CA,en-AU,en-NZ,en-GB,en-IN,en-KE,en-TZ,en-NG,en-GH,en-PH,en-ZA,es,es-ES,es-AR,es-UY,es-419,es-BO,es-CL,es-CR,es-CO,es-DO,es-EC,es-GT,es-HN,es-NI,es-PA,es-PE,es-PR,es-PY,es-SV,es-VE,es-MX,es-US,eu,eu-ES,fi,fi-FI,fr,fr-FR,fr-CH,fr-BE,gl,gl-ES,gu,gu-IN,he,he-IL,iw,iw-IL,hu,hu-HU,hy,hy-AM,id,id-ID,is,is-IS,it,it-IT,it-CH,ja,ja-JP,jv,jv-ID,ka,ka-GE,km,km-KH,kn,kn-IN,ko,ko-KR,la,lo,lo-LA,lv,lv-LV,ml,ml-IN,mr,mr-IN,ms,ms-MY,nl,nl-NL,nb,nb-NO,ne,ne-NP,pl,pl-PL,pt,pt-BR,pt-PT,ro,ro-RO,ru,ru-RU,si-LK,sk,sk-SK,sr,sr-RS,su,su-ID,sv,sv-SE,sw,sw-TZ,sw-KE,ta,ta-IN,ta-SG,ta-LK,ta-MY,te,te-IN,tr,tr-TR,ur,ur-PK,ur-IN,yue,yue-HK,yue-Hant-HK,zh-HK,zh,zh-CN,zh-cmn,zh-cmn-CN,zh-Hans,zh-Hans-CN,zh-cmn-Hans,zh-cmn-Hans-CN,cmn-CN,cmn-Hans,cmn-Hans-CN,zh-TW,zh-Hant-TW,cmn-TW,cmn-Hant-TW,zh-cmn-TW,zh-cmn-Hant-TW,zu,zu-ZA

    import Dialog from "./Dialog.svelte";
    import UsersBlacklist from "./UsersBlacklist.svelte";
    import UsersWhitelist from "./UsersWhitelist.svelte";
    import UsersAliasesList from "./UsersAliasesList.svelte";
    import DictionariesList from "./DictionariesList.svelte";

    import AutoComplete from "simple-svelte-autocomplete";

    import {settings_db, users_blacklist_db, usernames_db} from "../db.js";

    import {emitter} from "../utils.js";

    let app_language = "en-us";
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

    let users_blacklist_save;
    let users_whitelist_save;
    let users_aliases_save;

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
                    {@const set_language = (value) => languages[app_language].find((language) => language.code.toLowerCase() === value.toLowerCase())}

                    <div class="vertical-wrap">
                        {schema.label}
                        <AutoComplete items={languages[app_language]} labelFieldName="name" placeholder={schema.label} selectedItem={set_language(value)} onChange={(data) => save_setting(key, data.code, schema)} />
                    </div>
                {/if}
            </li>
        {/if}
    {/each}
</ul>

<div>
    <!-- Users blacklist. -->
    <Dialog on_save={users_blacklist_save}>
        <svelte:fragment slot="button-open-text">
            Show users blacklist
        </svelte:fragment>

        <UsersBlacklist slot="dialog-content" bind:save_items={users_blacklist_save} />
    </Dialog>

    <!-- Users whitelist. -->
    <Dialog on_save={users_whitelist_save}>
        <svelte:fragment slot="button-open-text">
            Show users whitelist
        </svelte:fragment>

        <UsersWhitelist slot="dialog-content" bind:save_items={users_whitelist_save} />
    </Dialog>

    <!-- Users aliases. -->
    <Dialog on_save={users_aliases_save}>
        <svelte:fragment slot="button-open-text">
            Show users aliases
        </svelte:fragment>

        <UsersAliasesList slot="dialog-content" bind:save_items={users_aliases_save} />
    </Dialog>

    <!-- Dictionaries -->
    {#if (settings_db.data.use_tts)}
        <Dialog>
            <svelte:fragment slot="button-open-text">
                Show dictionaries
            </svelte:fragment>

            <DictionariesList slot="dialog-content" />
        </Dialog>
    {/if}
</div>
