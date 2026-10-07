# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo.addons.web.tests.test_js import HOOTCommon, unit_test_error_checker
from odoo.tests import tagged


@tagged("post_install", "-at_install")
class TestWebDialogSizeHoot(HOOTCommon):
    def test_hoot_web_dialog_size(self):
        suite_id = self._generate_hash("@web_dialog_size")
        self.browser_js(
            f"/web/tests?headless&loglevel=2&preset=desktop&timeout=15000&id={suite_id}",
            "",
            "",
            login="admin",
            timeout=600,
            success_signal="[HOOT] Test suite succeeded",
            error_checker=unit_test_error_checker,
        )
