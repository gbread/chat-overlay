<script>
    import {onMount} from "svelte";

    export let on_save;
    let dialog_el;
    let show_dialog = false;

    // Config.
    const is_open_class = "modal-is-open";
    const opening_class = "modal-is-opening";
    const closing_class = "modal-is-closing";
    const animation_duration = 400; // ms
    let visibleModal = null;

    // Toggle modal.
    function toggle_modal(dialog) {
        console.log('modal:', dialog);
        (typeof(dialog) != "undefined" && dialog != null) && is_modal_open(dialog) ? close_modal(dialog) : open_modal(dialog);
    }

    // Is modal open.
    function is_modal_open(modal) {
        return modal.hasAttribute("open") && modal.getAttribute("open") != "false" ? true : false;
    }

    // Open modal.
    function open_modal(modal) {
        if (is_scrollbar_visible()) {
            document.documentElement.style.setProperty("--scrollbar-width", `${get_scrollbar_width()}px`);
        }

        document.documentElement.classList.add(is_open_class, opening_class);
        setTimeout(() => {
            visibleModal = modal;
            document.documentElement.classList.remove(opening_class);
        }, animation_duration);
        modal.setAttribute("open", true);
    }

    // Close modal.
    function close_modal(modal, save = false) {
        if (save && typeof on_save === "function") {
            on_save();
        }

        visibleModal = null;
        document.documentElement.classList.add(closing_class);
        setTimeout(() => {
            document.documentElement.classList.remove(closing_class, is_open_class);
            document.documentElement.style.removeProperty("--scrollbar-width");
            modal.removeAttribute("open");
            show_dialog = false;
        }, animation_duration);
    }

    // Close with a click outside.
    function on_click(event) {
        if (visibleModal != null) {
            const modalContent = visibleModal.querySelector("article");
            const isClickInside = modalContent.contains(event.target);

            if (!isClickInside) {
                close_modal(visibleModal);
            }
        }
    }

    // Close with Esc key.
    function on_keydown(event) {
        if (event.key === "Escape" && visibleModal != null) {
            close_modal(visibleModal);
        }
    }

    // Get scrollbar width.
    function get_scrollbar_width() {
        // Creating invisible container
        const outer = document.createElement("div");
        outer.style.visibility = "hidden";
        outer.style.overflow = "scroll"; // forcing scrollbar to appear
        outer.style.msOverflowStyle = "scrollbar"; // needed for WinJS apps
        document.body.appendChild(outer);

        // Creating inner element and placing it in the container
        const inner = document.createElement("div");
        outer.appendChild(inner);

        // Calculating difference between container's full width and the child width
        const scrollbar_width = (outer.offsetWidth - inner.offsetWidth);

        // Removing temporary elements from the DOM
        outer.parentNode.removeChild(outer);

        return scrollbar_width;
    }

    // Is scrollbar visible.
    function is_scrollbar_visible() {
        return document.body.scrollHeight > screen.height;
    }

    function allow_dialog() {
        show_dialog = show_dialog = true;
    }

    onMount(() => {
        document.addEventListener("click", on_click, true);
        document.addEventListener("keydown", on_keydown)

        // Clean up.
        return () => {
            document.removeEventListener("click", on_click, true);
            document.removeEventListener("keydown", on_keydown);
        }
    })

</script>

<button class="btn-small" on:click={allow_dialog}>
    <slot name="button-open-text">
        Open
    </slot>
</button>

{#if (show_dialog)}
    <dialog bind:this={dialog_el} use:open_modal={dialog_el}>
        <article>
            <button class="close" on:click={() => close_modal(dialog_el)}></button>

            <slot name="dialog-content" />

            <footer>
                <button class="btn-small secondary" on:click={() => close_modal(dialog_el)}>
                    <slot name="button-close-text">
                        Close
                    </slot>
                </button>

                {#if (on_save)}
                    <button class="btn-small success" on:click={() => close_modal(dialog_el, true)}>
                        <slot name="button-save-text">
                            Save
                        </slot>
                    </button>
                {/if}
            </footer>
        </article>
    </dialog>
{/if}
