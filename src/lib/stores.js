import {writable} from "svelte/store";

export const tts_messages = writable([]);
export const tts_errors = writable([]);

export const channel_emotes = writable({});
