<script>
    import UsersAliasesItem from "./UsersAliasesItem.svelte";

    import diff from "microdiff";

    import {users_aliases_db} from "../db.js";

    export const save_items = () => {
        if (!Array.isArray(users_aliases)) return console.error("Users aliases error");

        // Filter empty usernames and duplicit user IDs.
        users_aliases = users_aliases.filter((user, index, array) => {
            // Remove empty usernames.
            if (!user?.username || !user?.alias) return false;

            // Remove duplicit user IDs.
            const found_index = array.findIndex((existing_user) => existing_user?.user_id == user?.user_id);
            return (found_index >= 0 && index !== found_index) ? false : true;
        });

        // Skip when no changes.
        if (diff(users_aliases_db.data, users_aliases).length < 1) return;

        // Save users aliases.
        users_aliases_db.data = users_aliases;
        users_aliases_db.write();
    }

    // Snapshot data.
    let users_aliases = structuredClone(users_aliases_db.data);

    function remove_item(index) {
        users_aliases.splice(index, 1);
        users_aliases = users_aliases;
    }

    function add_item() {
        users_aliases.push({
            user_id: crypto.randomUUID(),
            username: "",
            alias: "",
        });
        users_aliases = users_aliases;
    }

    function update_item(index, user, alias = false) {
        if (!alias) {
            if (users_aliases.find((user_aliased) => user_aliased.user_id === user.user_id)) return console.error("Selected existing user!");
        }

        if (alias) {
            users_aliases[index].alias = user.alias;
        } else {
            users_aliases[index] = user;
        }
        users_aliases = users_aliases;
    }

</script>

<h3>Users aliases</h3>

<p>These aliases replace usernames in TTS.</p>

{#if (users_aliases.length > 0)}
    <figure class="-has-autocomplete">
        <table role="grid">
            <thead>
                <tr>
                    <th scope="col">#</th>
                    <th scope="col">Username</th>
                    <th scope="col">Alias</th>
                    <th scope="col"></th>
                </tr>
            </thead>
            <tbody>
                {#each users_aliases as user, index (user.user_id)}
                    <UsersAliasesItem {user} {index} remove_self={remove_item} update_self={update_item} />
                {/each}
            </tbody>
        </table>
    </figure>
{/if}

<button on:click={add_item}>Add new</button>
