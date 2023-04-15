<script>
    import UsersWhitelistItem from "./UsersWhitelistItem.svelte";

    import diff from "microdiff";

    import {users_whitelist_db} from "../db.js";

    export const save_items = () => {
        if (!Array.isArray(users_whitelist)) return console.error("Whitelisted users error");

        // Filter empty usernames and duplicit user IDs.
        users_whitelist = users_whitelist.filter((user, index, array) => {
            // Remove empty usernames.
            if (!user?.username) return false;

            // Remove duplicit user IDs.
            const found_index = array.findIndex((existing_user) => existing_user?.user_id == user?.user_id);
            return (found_index >= 0 && index !== found_index) ? false : true;
        });

        // Skip when no changes.
        if (diff(users_whitelist_db.data, users_whitelist).length < 1) return;

        // Save whitelisted users.
        users_whitelist_db.data = users_whitelist;
        users_whitelist_db.write();
    }

    // Snapshot data.
    let users_whitelist = klona(users_whitelist_db.data);

    function remove_item(index) {
        users_whitelist.splice(index, 1);
        users_whitelist = users_whitelist;
    }

    function add_item() {
        users_whitelist.push({
            user_id: crypto.randomUUID(),
            username: "",
        });
        users_whitelist = users_whitelist;
    }

    function update_item(index, user) {
        if (users_whitelist.find((whitelisted_user) => whitelisted_user.user_id === user.user_id)) return console.error("Selected existing user!");

        users_whitelist[index] = user;
        users_whitelist = users_whitelist;
    }

</script>

<h3>Users whitelist</h3>

<p>These users will not be skipped in TTS.</p>

{#if (users_whitelist.length > 0)}
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
                {#each users_whitelist as user, index (user.user_id)}
                    <UsersWhitelistItem {user} {index} remove_self={remove_item} update_self={update_item} />
                {/each}
            </tbody>
        </table>
    </figure>
{/if}

<button on:click={add_item}>Add new</button>
