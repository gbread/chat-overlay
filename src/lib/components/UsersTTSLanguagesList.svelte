<script>
    import UsersTTSLanguagesItem from "./UsersTTSLanguagesItem.svelte";

    import diff from "microdiff";
    import {klona} from "klona/json";

    import {users_tts_languages_db} from "../db.js";

    export const save_items = () => {
        if (!Array.isArray(users_tts_languages)) return console.error("Users TTS languages error");

        // Filter empty TTS languages and duplicit user IDs.
        users_tts_languages = users_tts_languages.filter((user, index, array) => {
            // Remove empty TTS languages.
            if (`${user.user_id}`.includes("-") || !user?.tts_language) return false;

            // Remove duplicit user IDs.
            const found_index = array.findIndex((existing_user) => existing_user?.user_id == user?.user_id);
            return (found_index >= 0 && index !== found_index) ? false : true;
        });

        // Skip when no changes.
        if (diff(users_tts_languages_db.data, users_tts_languages).length < 1) return;

        // Save users TTS languages.
        users_tts_languages_db.data = users_tts_languages;
        users_tts_languages_db.write();
    }

    // Snapshot data.
    let users_tts_languages = klona(users_tts_languages_db.data);

    function remove_item(index) {
        users_tts_languages.splice(index, 1);
        users_tts_languages = users_tts_languages;
    }

    function add_item() {
        users_tts_languages.push({
            user_id: crypto.randomUUID(),
            tts_language: "",
        });
        users_tts_languages = users_tts_languages;
    }

    function update_item(index, user, tts_language = false) {
        if (!tts_language) {
            if (users_tts_languages.find((user_aliased) => user_aliased.user_id === user.user_id)) return console.error("Selected existing user!");
        }

        if (tts_language) {
            users_tts_languages[index].tts_language = user.tts_language;
        } else {
            users_tts_languages[index] = user;
        }
        users_tts_languages = users_tts_languages;
    }

</script>

<h3>Users TTS languages</h3>

<p>Change TTS language for each user.</p>

{#if (users_tts_languages.length > 0)}
    <figure class="-has-autocomplete">
        <table role="grid">
            <thead>
                <tr>
                    <th scope="col">#</th>
                    <th scope="col">Username</th>
                    <th scope="col">TTS language</th>
                    <th scope="col"></th>
                </tr>
            </thead>
            <tbody>
                {#each users_tts_languages as user, index (user.user_id)}
                    <UsersTTSLanguagesItem {user} {index} remove_self={remove_item} update_self={update_item} />
                {/each}
            </tbody>
        </table>
    </figure>
{/if}

<button on:click={add_item}>Add new</button>
