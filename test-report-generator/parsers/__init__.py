"""测试报告解析器模块。

支持以下解析器：
- Jest/Vitest JSON 输出
- JUnit XML 输出
- pytest (P1)
"""

from .jest_vitest import parse_jest_vitest_json
from .junit_xml import parse_junit_xml

__all__ = ["parse_jest_vitest_json", "parse_junit_xml"]