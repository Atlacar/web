import { proxy } from "@odoo/owl";
import { browser } from "@web/core/browser/browser";
import { Dialog } from "@web/core/dialog/dialog";
import { SelectCreateDialog } from "@web/views/view_dialogs/select_create_dialog";
import { patch } from "@web/core/utils/patch";
import { useService } from "@web/core/utils/hooks";

/**
 * Size name applied while a dialog is maximized. It is not part of Odoo's
 * `Dialog` size enum (sm/md/lg/xl/fs/fullscreen) on purpose: the standard
 * sizes (and the `dialog_size` list-view attribute, `env.setDialogSize`) keep
 * working untouched and this module only overrides the *effective* size while
 * the user has the dialog maximized. The matching CSS class is
 * `.modal-dialog_full_screen` (see web_dialog_size.scss).
 */
export const MAXIMIZED_SIZE = "dialog_full_screen";
// Browser storage keys (unchanged since Odoo <= 19: keep them for compatibility).
export const STORAGE_KEY_VALUE = "odoo.web_dialog_size.value";
export const STORAGE_KEY_SERVER = "odoo.web_dialog_size.last_server_value";

/**
 * Decide, from the value of the `web_dialog_size.default_maximize` system
 * parameter, whether the stored user preference must be (re)initialised.
 * The server value only wins when the user never chose anything, or when the
 * stored value is still the one inherited from the previous server value.
 *
 * @param {Storage} storage
 * @param {boolean} serverMaximize
 * @returns {boolean|null} new maximized state to apply, `null` if unchanged
 */
export function syncServerDefault(storage, serverMaximize) {
    const serverValue = String(Boolean(serverMaximize));
    const storedValue = storage.getItem(STORAGE_KEY_VALUE);
    const lastServerValue = storage.getItem(STORAGE_KEY_SERVER);
    if (serverValue === lastServerValue) {
        return null;
    }
    storage.setItem(STORAGE_KEY_SERVER, serverValue);
    if (storedValue === null || storedValue === lastServerValue) {
        storage.setItem(STORAGE_KEY_VALUE, serverValue);
        return serverValue === "true";
    }
    return null;
}

function triggerWindowResize() {
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
}

/**
 * The maximized state is shared by every dialog (it is a user preference
 * persisted in the browser storage, which stays the source of truth: it is
 * re-read each time a dialog is created). Reading it from a reactive proxy
 * makes all the opened dialogs follow the toggle. A module level state is also
 * what allows dialogs that render their own header (SelectCreateDialog calls
 * `web.Dialog.header` from its own template) to display the toggle.
 */
const state = proxy({ maximized: false });

function loadMaximized() {
    state.maximized = browser.localStorage.getItem(STORAGE_KEY_VALUE) === "true";
}

function toggleMaximized() {
    const maximized = !state.maximized;
    state.maximized = maximized;
    browser.localStorage.setItem(STORAGE_KEY_VALUE, String(maximized));
    triggerWindowResize();
}

// One RPC per page load is enough: the result is persisted in the storage.
let serverConfigPromise = null;
export function resetServerConfigCache() {
    serverConfigPromise = null;
}

function syncWithServerConfig(orm) {
    if (!serverConfigPromise) {
        serverConfigPromise = orm
            .call("ir.config_parameter", "get_web_dialog_size_config")
            .catch((error) => {
                serverConfigPromise = null;
                throw error;
            });
    }
    serverConfigPromise.then((config) => {
        const maximize = syncServerDefault(browser.localStorage, config.default_maximize);
        if (maximize !== null) {
            state.maximized = maximize;
        }
    });
}

patch(Dialog.prototype, {
    setup() {
        super.setup(...arguments);
        loadMaximized();
        syncWithServerConfig(useService("orm"));
    },

    /** Effective size: the maximized state wins over the size given by the caller. */
    get size() {
        return state.maximized ? MAXIMIZED_SIZE : super.size;
    },

    // Members used by the header template extension (web_dialog_header.xml)
    get wdsMaximized() {
        return state.maximized;
    },

    wdsToggleMaximize() {
        toggleMaximized();
    },
});

// SelectCreateDialog renders `web.Dialog.header` itself, from its own template
// (`this` is the SelectCreateDialog there): give it the same template members.
patch(SelectCreateDialog.prototype, {
    get wdsMaximized() {
        return state.maximized;
    },

    wdsToggleMaximize() {
        toggleMaximized();
    },
});
