<script>
    import {get} from "svelte/store";

    import diff from "microdiff";

    import * as db from "../db.js";

    export const save_items = () => {
        if (!settings_data?.trim()) throw Error("Empty settings data!");

        const settings_json = JSON.parse(settings_data);

        if (Object.keys(settings_json).length < 1) throw Error("Empty settings data!");

        for (const [key, value] of Object.entries(settings_json)) {
            console.log(key, "-", value);
            const db_name = `${key}_db`;

            // Valid DB check.
            if (!(db_name in db)) {
                console.error(key, "is not valid db");
                continue;
            }

            // Get appropriate DB instance.
            const is_store = db[db_name]?.data ? false : true;
            const current_db = !is_store ? db[db_name] : get(db[db_name]);

            // Data diff check.
            if (diff(current_db.data, value).length < 1) continue;

            if (is_store) {
                // Save DB store data.
                db[db_name].update((store_db) => {
                    store_db.data = value;
                    store_db.write();
                    return store_db;
                });
            } else {
                // Save DB data.
                current_db.data = value;
                current_db.write();
            }
        }
    }

    let settings_data;
</script>

<h3>Import settings</h3>

<p>Paste the exported settings string here.</p>

<textarea bind:value={settings_data}></textarea>

<style>
    textarea {
        resize: none;
        white-space: nowrap;
    }
</style>