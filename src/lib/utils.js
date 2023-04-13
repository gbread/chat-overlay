import emoji_regex from "emoji-regex";

import mitt from "mitt";

export const emitter = mitt();

export function debounce(callback, wait) {
    let timeout_id = null;
    return (...args) => {
        window.clearTimeout(timeout_id);
        timeout_id = window.setTimeout(() => {
            callback.apply(null, args);
        }, wait);
    };
}

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

/**
 * Get indexes of substrings in string
 *
 * @param {*} array
 * @param {string} search_item
 * @returns {array}
 */
export function index_of_all(array, search_item) {
    let index = array.indexOf(search_item);
    const indexes = [];
    while (index !== -1) {
      indexes.push(index);
      index = array.indexOf(search_item, ++index);
    }
    return indexes;
}
