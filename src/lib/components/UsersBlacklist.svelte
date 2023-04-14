<script>
    import UserBlacklistItem from "./UsersBlacklistItem.svelte";

    import diff from "microdiff";

    import {users_blacklist_db} from "../db.js";

    export const save_items = () => {
        if (!Array.isArray(users_blacklist)) return console.error("Blacklisted users error");

        // Filter empty usernames and duplicit user IDs.
        users_blacklist = users_blacklist.filter((user, index, array) => {
            // Remove empty usernames.
            if (!user?.username) return false;

            // Remove duplicit user IDs.
            const found_index = array.findIndex((existing_user) => existing_user?.user_id == user?.user_id);
            return (found_index >= 0 && index !== found_index) ? false : true;
        });

        // Skip when no changes.
        if (diff(users_blacklist_db.data, users_blacklist).length < 1) return;

        // Save blacklisted users.
        users_blacklist_db.data = users_blacklist;
        users_blacklist_db.write();
    }

    // Snapshot data.
    let users_blacklist = structuredClone(users_blacklist_db.data);

    function remove_item(index) {
        users_blacklist.splice(index, 1);
        users_blacklist = users_blacklist;
    }

    function add_item() {
        users_blacklist.push({
            user_id: crypto.randomUUID(),
            username: "",
        });
        users_blacklist = users_blacklist;
    }

    function update_item(index, user) {
        if (users_blacklist.find((blacklisted_user) => blacklisted_user.user_id === user.user_id)) return console.error("Selected existing user!");

        users_blacklist[index] = user;
        users_blacklist = users_blacklist;
    }

</script>

<h3>Users blacklist</h3>

<p>These users will be skipped in TTS.</p>

{#if (users_blacklist.length > 0)}
    <figure>
        <table role="grid">
            <thead>
                <tr>
                    <th scope="col">#</th>
                    <th scope="col">Username</th>
                    <th scope="col"></th>
                </tr>
            </thead>
            <tbody>
                {#each users_blacklist as user, index (user.user_id)}
                    <UserBlacklistItem {user} {index} remove_self={remove_item} update_self={update_item} />
                {/each}
            </tbody>
        </table>
    </figure>
{/if}

<button on:click={add_item}>Add new</button>
