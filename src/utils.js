
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
