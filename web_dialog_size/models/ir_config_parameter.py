# Copyright 2018 Tecnativa - Jairo Llopis
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).

from odoo import api, models


class IrConfigParameter(models.Model):
    _inherit = "ir.config_parameter"

    @api.model
    def get_web_dialog_size_config(self):
        # Odoo 20 replaced get_param() by typed getters (get_bool, get_str, ...).
        return {
            "default_maximize": self.sudo().get_bool(
                "web_dialog_size.default_maximize", False
            )
        }
