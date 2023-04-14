<script>
    import AutoComplete from "simple-svelte-autocomplete";

    import {usernames_db} from "../db.js";

    export let user;
    export let index;
    export let remove_self;
    export let update_self;

    let edit_username = (user.username) ? false : true;
    let edit_alias = (user.username) ? true : false;
    let remove_really = false;
    let remove_text = "Remove";

    function toggle_edit_mode() {
        edit_username = !edit_username;
        edit_alias = (user.username) ? true : false;
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

    function change(data) {
        if (!data) return;

        user = {
            ...user,
            user_id: Number(data[0]),
            username: data[1],
        };

        update_self(index, user);
        edit_alias = true;
    }

    function change_alias(event) {
        const alias = event.target.value;

        user = {
            ...user,
            alias,
        };

        update_self(index, user, true);
    }
</script>

<tr>
    <th scope="row">{index + 1}</th>

    <td>
        {#if (edit_username)}
            <AutoComplete items={Object.entries(usernames_db.data)} labelFunction={label_name} maxItemsToShowInList={3} dropdownClassName={`${(index > 2) ? "-top" : "-bottom"}`} hideArrow={true} placeholder={"search users..."} noResultsText={"No users found"} moreItemsText={"users not shown"} onChange={change} />
        {:else}
            {user.username}
        {/if}
    </td>

    <td>
        {#if (edit_alias)}
            <input type="text" value={user.alias} on:input={change_alias}>
        {:else}
            {user.alias}
        {/if}
    </td>

    <td class="align-right">
        <button class="btn-small small" on:click={toggle_edit_mode}>Edit</button>
        <button class="btn-small danger small" on:click={remove}>{remove_text}</button>
    </td>
</tr>
