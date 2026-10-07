import { animationFrame, beforeEach, expect, test } from "@odoo/hoot";
import { Component, xml } from "@odoo/owl";
import { browser } from "@web/core/browser/browser";
import {
    makeDialogMockEnv,
    contains,
    defineModels,
    defineWebModels,
    fields,
    getService,
    models,
    mountWebClient,
    mountWithCleanup,
    onRpc,
} from "@web/../tests/web_test_helpers";

import { Dialog } from "@web/core/dialog/dialog";
import { SelectCreateDialog } from "@web/views/view_dialogs/select_create_dialog";
const MAXIMIZED_SIZE = "dialog_full_screen";
const STORAGE_KEY_VALUE = "odoo.web_dialog_size.value";
const STORAGE_KEY_SERVER = "odoo.web_dialog_size.last_server_value";

class Partner extends models.Model {
    name = fields.Char();

    _records = [{ id: 1, name: "Some partner" }];
    _views = {
        form: `<form><field name="name"/></form>`,
        list: `<list><field name="name"/></list>`,
        search: `<search><field name="name"/></search>`,
    };
}

defineWebModels();
defineModels([Partner]);

let serverDefaultMaximize = false;

beforeEach(() => {
    serverDefaultMaximize = false;
    onRpc("ir.config_parameter", "get_web_dialog_size_config", () => ({
        default_maximize: serverDefaultMaximize,
    }));
});

async function mountDialog(size) {
    class Parent extends Component {
        static components = { Dialog };
        static template = xml`
            <Dialog title="'Some title'" size="'${size}'">
                Hello!
            </Dialog>
        `;
    }
    await makeDialogMockEnv();
    await mountWithCleanup(Parent);
    await animationFrame();
}

test("the toggle maximizes / restores the dialog and remembers the choice", async () => {
    await mountDialog("md");
    expect(".o_dialog .modal-dialog").toHaveClass("modal-md");
    expect(".dialog_button_extend").toHaveCount(1);
    expect(".dialog_button_restore").toHaveCount(0);

    await contains(".dialog_button_extend").click();
    expect(".o_dialog .modal-dialog").toHaveClass(`modal-${MAXIMIZED_SIZE}`);
    expect(".o_dialog .modal-dialog").not.toHaveClass("modal-md");
    expect(".dialog_button_restore").toHaveCount(1);
    expect(".dialog_button_extend").toHaveCount(0);
    expect(browser.localStorage.getItem(STORAGE_KEY_VALUE)).toBe("true");

    await contains(".dialog_button_restore").click();
    // the size requested by the caller is back untouched
    expect(".o_dialog .modal-dialog").toHaveClass("modal-md");
    expect(browser.localStorage.getItem(STORAGE_KEY_VALUE)).toBe("false");
});

test("a maximized choice stored in the browser applies to new dialogs", async () => {
    browser.localStorage.setItem(STORAGE_KEY_VALUE, "true");
    await mountDialog("lg");
    expect(".o_dialog .modal-dialog").toHaveClass(`modal-${MAXIMIZED_SIZE}`);
    expect(".dialog_button_restore").toHaveCount(1);
});

test("standard sizes are untouched when not maximized", async () => {
    await mountDialog("xl");
    expect(".o_dialog .modal-dialog").toHaveClass("modal-xl");
});

test("the server default (system parameter) maximizes dialogs the user never customized", async () => {
    serverDefaultMaximize = true;
    await mountDialog("lg");
    expect(".o_dialog .modal-dialog").toHaveClass(`modal-${MAXIMIZED_SIZE}`);
    expect(browser.localStorage.getItem(STORAGE_KEY_VALUE)).toBe("true");
    expect(browser.localStorage.getItem(STORAGE_KEY_SERVER)).toBe("true");
});

test("the server default does not override an explicit user choice", async () => {
    // the user restored the dialogs although the server default was "maximize"
    browser.localStorage.setItem(STORAGE_KEY_VALUE, "false");
    browser.localStorage.setItem(STORAGE_KEY_SERVER, "true");
    serverDefaultMaximize = true;
    await mountDialog("lg");
    expect(".o_dialog .modal-dialog").toHaveClass("modal-lg");
    expect(browser.localStorage.getItem(STORAGE_KEY_VALUE)).toBe("false");
});

test("the toggle is available in action dialogs (primary header template)", async () => {
    await mountWebClient();
    await getService("action").doAction({
        type: "ir.actions.act_window",
        res_model: "partner",
        target: "new",
        views: [[false, "form"]],
    });
    await animationFrame();
    expect(".o_dialog .dialog_button_extend").toHaveCount(1);
    await contains(".o_dialog .dialog_button_extend").click();
    expect(".o_dialog .modal-dialog").toHaveClass(`modal-${MAXIMIZED_SIZE}`);
    expect(".o_dialog .dialog_button_restore").toHaveCount(1);
});

test("the toggle is available in SelectCreateDialog (own header slot)", async () => {
    await mountWebClient();
    getService("dialog").add(SelectCreateDialog, { resModel: "partner", onSelected: () => {} });
    await animationFrame();
    expect(".o_dialog .dialog_button_extend").toHaveCount(1);
    await contains(".o_dialog .dialog_button_extend").click();
    expect(".o_dialog .modal-dialog").toHaveClass(`modal-${MAXIMIZED_SIZE}`);
});
