<script>
    import {settings_db, usernames_db, users_blacklist_db, users_whitelist_db, users_aliases_db, users_tts_languages_db, channel_point_rewards_whitelist_db} from "../db.js";

    const all_data = {
        settings: $settings_db.data,
        usernames: usernames_db.data,
        users_blacklist: users_blacklist_db.data,
        users_whitelist: users_whitelist_db.data,
        users_aliases: users_aliases_db.data,
        users_tts_languages: users_tts_languages_db.data,
        channel_point_rewards_whitelist: channel_point_rewards_whitelist_db.data,
    };

    let button_el;
    let textarea_el;

    function copy_text() {
        textarea_el.select();
        textarea_el.setSelectionRange(0, 99999);

        // Clipboard API in OBS browser gives no permission to write text so only this works.
        document.execCommand("copy");

        // Add tooltip text.
        button_el.setAttribute("data-tooltip", "Copied");
    }

</script>

<h3>Export settings</h3>

<textarea bind:this={textarea_el} readonly>{JSON.stringify(all_data)}</textarea>

<button bind:this={button_el} on:click={copy_text}>
    Copy
</button>

<style>
    textarea {
        resize: none;
        white-space: nowrap;
    }
</style>