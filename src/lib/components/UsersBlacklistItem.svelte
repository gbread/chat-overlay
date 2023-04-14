<script>
    import AutoComplete from "simple-svelte-autocomplete";

    import {usernames_db} from "../db.js";

    export let user;
    export let index;
    export let remove_self;
    export let update_self;

    let edit_mode = (user.username) ? false : true;
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

    function change(data) {
        if (!data) return;

        user = {
            user_id: Number(data[0]),
            username: data[1],
        };

        update_self(index, user);
        toggle_edit_mode();
    }
</script>

<tr>
    <th scope="row">{index + 1}</th>

    <td>
        {#if (edit_mode)}
            <AutoComplete items={Object.entries(usernames_db.data)} labelFunction={label_name} maxItemsToShowInList={3} dropdownClassName={`${(index > 2) ? "-top" : "-bottom"}`} hideArrow={true} placeholder={"search users..."} noResultsText={"No users found"} moreItemsText={"users not shown"} onChange={change} />
        {:else}
            {user.username}
        {/if}
    </td>

    <td class="align-right">
        <button class="btn-small small" on:click={toggle_edit_mode}>Edit</button>
        <button class="btn-small danger small" on:click={remove}>{remove_text}</button>
    </td>
</tr>
