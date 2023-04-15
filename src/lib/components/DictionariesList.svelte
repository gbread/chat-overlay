<script>
    import dictionaries from "../../assets/dictionaries.js";
    import languages from "../../assets/languages.js";

    import {settings_db} from "../db.js";

    let app_language = "en-us";
    let is_details_open = false;
    let selected = ($settings_db.data.tts_language.toLowerCase() in dictionaries) ? $settings_db.data.tts_language.toLowerCase() : Object.keys(dictionaries)[0];

    function select_dictionary(dictionary) {
        is_details_open = false;
        selected = dictionary;
    }

    function find_language_name(code) {
        return languages[app_language].find((language) => language.code.toLowerCase() === code.toLowerCase());
    }
</script>

<h3>Dictionaries</h3>

<p>These are used in TTS to find and replace words when it fails to pronounce words correctly.</p>

<div class="details-wrap">
    <details role="list" bind:open={is_details_open}>
        <!-- svelte-ignore a11y-no-redundant-roles -->
        <summary aria-haspopup="listbox" role="button" class="secondary">Dictionary language: {find_language_name(selected).name}</summary>

        <ul role="listbox">
            {#each Object.keys(dictionaries) as dictionary}
                <li>
                    <button class="no-mb" class:outline={dictionary !== selected} on:click={() => select_dictionary(dictionary)}>
                        {find_language_name(dictionary)?.name ?? dictionary}
                    </button>
                </li>
            {/each}
        </ul>
    </details>
</div>

<figure>
    <table role="grid">
        <thead>
            <tr>
                <th scope="col">#</th>
                <th scope="col">Find</th>
                <th scope="col">Replace with</th>
            </tr>
        </thead>
        <tbody>
            {#each Object.entries(dictionaries[selected]) as [target, replace], index (index)}
                <tr>
                    <th scope="row">{index + 1}</th>

                    <td>
                        {target}
                    </td>

                    <td>
                        {replace}
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
</figure>

<style>
    .details-wrap > details {
        display: inline-block;
    }
</style>