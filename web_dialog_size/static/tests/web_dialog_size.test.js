import {animationFrame, expect, test} from "@odoo/hoot";
import {Component, xml} from "@odoo/owl";
import {
    contains,
    defineModels,
    defineWebModels,
    fields,
    getService,
    makeDialogMockEnv,
    models,
    mountWebClient,
    mountWithCleanup,
    onRpc,
} from "@web/../tests/web_test_helpers";

import {Dialog} from "@web/core/dialog/dialog";
import {SelectCreateDialog} from "@web/views/view_dialogs/select_create_dialog";

class Partner extends models.Model {
    name = fields.Char();

    _records = [{id: 1, name: "Some partner"}];
    _views = {
        form: `<form><field name="name"/></form>`,
        list: `<list><field name="name"/></list>`,
        search: `<search><field name="name"/></search>`,
    };
}

defineWebModels();
defineModels([Partner]);

async function mountDialog(size) {
    onRpc("ir.config_parameter", "get_web_dialog_size_config", () => ({
        default_maximize: false,
    }));
    class Parent extends Component {
        static components = {Dialog};
        static template = xml`<Dialog title="'Some title'" size="'${size}'">Hello!</Dialog>`;
    }
    await makeDialogMockEnv();
    await mountWithCleanup(Parent);
    await animationFrame();
}

// In this module the button that maximizes has the class dialog_button_restore
// and the one that restores dialog_button_extend (historical OCA naming): the
// tests rely on the icons.
test("the toggle maximizes and restores a standard dialog", async () => {
    await mountDialog("md");
    expect(".o_dialog .modal-dialog").toHaveClass("modal-md");
    expect(".o_dialog .fa-window-maximize").toHaveCount(1);

    await contains(".o_dialog .fa-window-maximize").click();
    await animationFrame();
    expect(".o_dialog .modal-dialog").toHaveClass("modal-dialog_full_screen");
    // the button must now offer to restore the dialog
    expect(".o_dialog .fa-window-restore").toHaveCount(1);
    expect(".o_dialog .fa-window-maximize").toHaveCount(0);

    await contains(".o_dialog .fa-window-restore").click();
    await animationFrame();
    expect(".o_dialog .modal-dialog").toHaveClass("modal-md");
    expect(".o_dialog .fa-window-maximize").toHaveCount(1);
});

test("the toggle works in action dialogs (primary header template)", async () => {
    onRpc("ir.config_parameter", "get_web_dialog_size_config", () => ({
        default_maximize: false,
    }));
    await mountWebClient();
    await getService("action").doAction({
        type: "ir.actions.act_window",
        res_model: "partner",
        target: "new",
        views: [[false, "form"]],
    });
    await animationFrame();
    expect(".o_dialog").toHaveCount(1);
    await contains(".o_dialog .fa-window-maximize").click();
    await animationFrame();
    expect(".o_dialog .modal-dialog").toHaveClass("modal-dialog_full_screen");
    expect(".o_dialog .fa-window-restore").toHaveCount(1);
    await contains(".o_dialog .fa-window-restore").click();
    await animationFrame();
    expect(".o_dialog .fa-window-maximize").toHaveCount(1);
});

test("the toggle works in SelectCreateDialog", async () => {
    onRpc("ir.config_parameter", "get_web_dialog_size_config", () => ({
        default_maximize: false,
    }));
    await mountWebClient();
    getService("dialog").add(SelectCreateDialog, {
        resModel: "partner",
        onSelected: () => {},
    });
    await animationFrame();
    expect(".o_dialog").toHaveCount(1);
    await contains(".o_dialog .fa-window-maximize").click();
    await animationFrame();
    expect(".o_dialog .modal-dialog").toHaveClass("modal-dialog_full_screen");
    expect(".o_dialog .fa-window-restore").toHaveCount(1);
});

test("the standard fs size of Odoo dialogs is still valid", async () => {
    await mountDialog("fs");
    expect(".o_dialog .modal-dialog").toHaveClass("modal-fs");
});
