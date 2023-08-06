<script>
    import ChannelPointRewardsItem from "./ChannelPointRewardsItem.svelte";

    import diff from "microdiff";
    import {klona} from "klona/json";

    import {channel_point_rewards_whitelist_db} from "../db.js";

    export const save_items = () => {
        if (!Array.isArray(channel_point_rewards_whitelist)) return console.error("Rewards error");

        // Filter empty rewards and duplicit reward IDs.
        channel_point_rewards_whitelist = channel_point_rewards_whitelist.filter((reward, index, array) => {
            // Remove empty rewards.
            if (!reward?.reward_id?.trim()) return false;

            // Remove duplicit reward IDs.
            const found_index = array.findIndex((existing_reward) => existing_reward?.reward_id == reward?.reward_id);
            return (found_index >= 0 && index !== found_index) ? false : true;
        });

        // Skip when no changes.
        if (diff(channel_point_rewards_whitelist_db.data, channel_point_rewards_whitelist).length < 1) return;

        // Save rewards.
        channel_point_rewards_whitelist_db.data = channel_point_rewards_whitelist;
        channel_point_rewards_whitelist_db.write();
    }

    // Snapshot data.
    let channel_point_rewards_whitelist = klona(channel_point_rewards_whitelist_db.data);

    let is_details_open = false;

    function remove_item(index) {
        channel_point_rewards_whitelist.splice(index, 1);
        channel_point_rewards_whitelist = channel_point_rewards_whitelist;
    }

    function add_item() {
        channel_point_rewards_whitelist.push({
            reward_id: "",
        });
        channel_point_rewards_whitelist = channel_point_rewards_whitelist;
    }

    function update_item(index, reward) {
        channel_point_rewards_whitelist[index] = reward;
        channel_point_rewards_whitelist = channel_point_rewards_whitelist;
    }

</script>

<h3>Channel point rewards</h3>

<p>Whitelist / blacklist channel point rewards.</p>

<div class="details-wrap">
    <details role="list" bind:open={is_details_open}>
        <!-- svelte-ignore a11y-no-redundant-roles -->
        <summary aria-haspopup="listbox" role="button" class="secondary">Setting mode: Whitelist</summary>

        <ul role="listbox">
            <li>
                <button class="no-mb">
                    Whitelist
                </button>
            </li>
        </ul>
    </details>
</div>

{#if (channel_point_rewards_whitelist.length > 0)}
    <figure>
        <table role="grid">
            <thead>
                <tr>
                    <th scope="col">#</th>
                    <th scope="col">Reward ID</th>
                    <th scope="col"></th>
                </tr>
            </thead>
            <tbody>
                {#each channel_point_rewards_whitelist as reward, index (index)}
                    <ChannelPointRewardsItem {reward} {index} remove_self={remove_item} update_self={update_item} />
                {/each}
            </tbody>
        </table>
    </figure>
{/if}

<button on:click={add_item}>Add new</button>

<style>
    .details-wrap > details {
        display: inline-block;
    }
</style>