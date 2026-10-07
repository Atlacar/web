import {Component, onMounted, onWillRender} from "@odoo/owl";
import {ActionDialog} from "@web/webclient/actions/action_dialog";
import {Dialog} from "@web/core/dialog/dialog";
import {SelectCreateDialog} from "@web/views/view_dialogs/select_create_dialog";
import {patch} from "@web/core/utils/patch";
import {useService} from "@web/core/utils/hooks";

function triggerWindowResize() {
    requestAnimationFrame(() => {
        window.dispatchEvent(new Event("resize"));
    });
}

export class ExpandButton extends Component {
    setup() {
        this.orm = useService("orm");
        this.last_size = this.props.getsize();
        this.config = this.orm.call(
            "ir.config_parameter",
            "get_web_dialog_size_config"
        );

        onMounted(() => {
            var self = this;
            this.config
                .then(function (r) {
                    if (r.default_maximize) {
                        self.dialog_button_extend();
                    }
                })
                .catch(() => {
                    // Session likely expired → ignore
                });
        });
    }

    dialog_button_extend() {
        this.props.setsize("dialog_full_screen");
        triggerWindowResize();
    }

    dialog_button_restore() {
        this.props.setsize(this.last_size);
        triggerWindowResize();
    }
}

ExpandButton.template = "web_dialog_size.ExpandButton";

patch(Dialog.prototype, {
    setup() {
        super.setup();
        this.setSize = this.setSize.bind(this);
        this.getSize = this.getSize.bind(this);
        onWillRender(() => {
            if (this._forcedSize && this.props.size !== this._forcedSize) {
                this.props.size = this._forcedSize;
            }
        });
    },

    setSize(size) {
        this._forcedSize = size;
        this.props.size = size;
        // deep render: ExpandButton only gets functions as props, a shallow
        // render would not refresh its maximize/restore icon
        this.render(true);
    },

    getSize() {
        return this.props.size;
    },
});

patch(SelectCreateDialog.prototype, {
    setup() {
        super.setup();
        this.setSize = this.setSize.bind(this);
        this.getSize = this.getSize.bind(this);
    },

    setSize(size) {
        this.props.size = size;
        // deep render, see Dialog.setSize
        this.render(true);
    },

    getSize() {
        return this.props.size;
    },
});

Object.assign(ActionDialog.components, {ExpandButton});
SelectCreateDialog.components = Object.assign(SelectCreateDialog.components || {}, {
    ExpandButton,
});
Dialog.components = Object.assign(Dialog.components || {}, {ExpandButton});
// Keep Odoo's standard dialog sizes and add the custom maximized size.
const coreValidateDialogSize = Dialog.props.size.validate;
Dialog.props.size.validate = (size) =>
    coreValidateDialogSize(size) || size === "dialog_full_screen";
