"""Consumer — imports greet() from manyu_test across repository boundaries."""

import sys
from pathlib import Path

# Cross-repo dependency: add manyu_test to the import path
_MANYU_TEST = Path(__file__).resolve().parent.parent / "manyu_test-cred-test-20260716022903"
if str(_MANYU_TEST) not in sys.path:
    sys.path.insert(0, str(_MANYU_TEST))

from hello import greet  # noqa: E402

if __name__ == "__main__":
    print(greet("World"))