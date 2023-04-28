<script>
    import {copy} from "svelte-copy";

    import {settings_db, usernames_db, users_blacklist_db, users_whitelist_db, users_aliases_db, users_tts_languages_db} from "../db.js";

    const all_data = {
        settings: $settings_db.data,
        usernames: usernames_db.data,
        users_blacklist: users_blacklist_db.data,
        users_whitelist: users_whitelist_db.data,
        users_aliases: users_aliases_db.data,
        users_tts_languages: users_tts_languages_db.data,
    };
    const stringified_data = JSON.stringify(all_data);

    let button_el;

    function set_tooltip(text) {
        button_el.setAttribute("data-tooltip", text);
    }
</script>

<h3>Export settings</h3>

<textarea readonly>{stringified_data}</textarea>

<button bind:this={button_el} use:copy={stringified_data} on:svelte-copy={() => set_tooltip("Copied")} on:svelte-copy:error="{(event) => set_tooltip(`Failed to copy: ${event.detail.message}`)}">
    Copy
</button>

<style>
    textarea {
        resize: none;
        white-space: nowrap;
    }
</style>