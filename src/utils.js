import emoji_regex from "emoji-regex";

/**
 * Limit the size of array
 *
 * @param {[]} array Existing array
 * @param {*} item Item to append to array
 * @param {number} limit Maximum size of array
 * @returns {[]} New array
 */
export function maybe_push(array, item, limit = 10) {
    if (array.length >= limit) {
        array.shift();
    }

    array.push(item);
    return array;
}

export function modify_words(message, link_text) {
    let message_fragments = message.split(/\s/gi);
    console.log("message_fragments before", message_fragments);

    // Modify words.
    for (let i = 0; i < message_fragments.length; i++) {
        let message_fragment = message_fragments[i];

        (() => {
            // URLs.
            if (is_url(message_fragment)) {
                message_fragment = link_text;
                return;
            }

            // Remove underscores.
            message_fragment = message_fragment.replaceAll("_", " ");

            // Add space before number.
            message_fragment = message_fragment.replace(/(\d+)/gi, " $1");

            // Remove Emojis.
            message_fragment = message_fragment.replace(emoji_regex(), "");
        })();

        message_fragments[i] = message_fragment.toLowerCase();
    }

    console.log("message_fragments after", message_fragments);
    return message_fragments.join(" ");
}

/**
 * Check if string is valid URL.
 *
 * @param {string} link
 * @returns {boolean}
 */
export function is_url(link) {
    return Array.isArray(link.match(/(((https?:\/\/)|(www\.))[^\s]+)/gi));
}

export const create_promise = () => {
    let resolver;
    return [
        new Promise((resolve, reject) => {
            resolver = resolve;
        }),
        resolver,
    ];
}
