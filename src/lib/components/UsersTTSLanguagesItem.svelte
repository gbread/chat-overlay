<script>
    import AutoComplete from "simple-svelte-autocomplete";

    import {usernames_db} from "../db.js";

    import languages from "../../assets/languages.js";

    export let user;
    export let index;
    export let remove_self;
    export let update_self;

    let app_language = "en-us";
    let edit_mode = (user.tts_language) ? false : true;
    let remove_really = false;
    let remove_text = "Remove";

    function toggle_edit_mode() {
        edit_mode = !edit_mode;
    }

    function remove() {
        if (!remove_really) {
            remove_really = true;
            remove_text += "?";
            return;
        }

        remove_self(index);
    }

    function label_name([user_id, username]) {
        return username;
    }

    function change_user(data) {
        if (!data) return;
        const user_id = Number(data[0]);
        if (user_id === user.user_id) return;

        user = {
            ...user,
            user_id,
        };

        update_self(index, user);

        if (user.tts_language) {
            edit_mode = false;
        }
    }

    function change_tts_language(data) {
        if (!data) return;
        const tts_language = data?.code;
        console.log('tts data:', data, 'tts_language:', tts_language);
        if (tts_language === user.tts_language) return;

        user = {
            ...user,
            tts_language,
        };

        update_self(index, user, true);

        if (!`${user.user_id}`.includes("-")) {
            edit_mode = false;
        }
    }

    function find_language_name(code) {
        if (!code) return;
        return languages[app_language].find((language) => language.code.toLowerCase() === code.toLowerCase());
    }

    function select_user() {
        if (`${user.user_id}`.includes("-")) return;
        const username = usernames_db.data[user.user_id];
        return [user.user_id, username];
    }

</script>

<tr>
    <th scope="row">{index + 1}</th>

    <td>
        {#if (edit_mode)}
            <AutoComplete items={Object.entries(usernames_db.data)} labelFunction={label_name} maxItemsToShowInList={3} dropdownClassName={`${(index > 2) ? "-top" : "-bottom"}`} hideArrow={true} placeholder={"search users..."} noResultsText={"No users found"} moreItemsText={"users not shown"} selectedItem={select_user()} onChange={change_user} />
        {:else}
            {usernames_db.data[user.user_id] || ""}
        {/if}
    </td>

    <td>
        {#if (edit_mode)}
            <AutoComplete items={languages[app_language]} labelFieldName="name" maxItemsToShowInList={3} dropdownClassName={`${(index > 2) ? "-top" : "-bottom"}`} hideArrow={true} placeholder={"choose TTS language"} selectedItem={find_language_name(user.tts_language)} onChange={change_tts_language} />
        {:else}
            {find_language_name(user.tts_language)?.name || ""}
        {/if}
    </td>

    <td class="align-right">
        <button class="btn-small small" on:click={toggle_edit_mode}>Edit</button>
        <button class="btn-small danger small" on:click={remove}>{remove_text}</button>
    </td>
</tr>
