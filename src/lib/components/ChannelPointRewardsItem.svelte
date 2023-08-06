<script>
    export let reward;
    export let index;
    export let remove_self;
    export let update_self;

    let edit_mode = (reward.reward_id) ? false : true;
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

    function change_reward(event) {
        const reward_id = event.target.value;

        reward = {
            ...reward,
            reward_id,
        };

        update_self(index, reward);
    }
</script>

<tr>
    <th scope="row">{index + 1}</th>

    <td>
        {#if (edit_mode)}
            <input type="text" value={reward.reward_id} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" on:input={change_reward}>
        {:else}
            {reward.reward_id}
        {/if}
    </td>

    <td class="align-right">
        <button class="btn-small small" on:click={toggle_edit_mode}>Edit</button>
        <button class="btn-small danger small" on:click={remove}>{remove_text}</button>
    </td>
</tr>
