"""JUnit XML 解析器。

支持标准 JUnit XML 格式，兼容 Jest、pytest、Maven Surefire 等框架的输出。
同时支持嵌套 <testsuites> 和扁平 <testsuite> 结构。
"""

import os
import re
import xml.etree.ElementTree as ET
from typing import Any, Dict, List, Optional


def _safe_float(value: Optional[str], default: float = 0.0) -> float:
    """安全转换为浮点数。"""
    if value is None:
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def _safe_int(value: Optional[str], default: int = 0) -> int:
    """安全转换为整数。"""
    if value is None:
        return default
    try:
        return int(round(float(value)))
    except (ValueError, TypeError):
        return default


def _truncate_stack(stack: str, max_lines: int = 8) -> str:
    """截断堆栈至可读长度。"""
    if not stack:
        return "无堆栈信息"
    lines = stack.strip().split("\n")
    if len(lines) <= max_lines:
        return stack.strip()
    return "\n".join(lines[:max_lines]) + f"\n... (共 {len(lines)} 行，已截断)"


def _sanitize_message(msg: str) -> str:
    """过滤错误信息中的敏感内容。"""
    if not msg:
        return ""
    sanitized = re.sub(r'[A-Za-z0-9+/=]{40,}', '<REDACTED>', msg)
    return sanitized


def _collect_testcases(suite: ET.Element) -> List[ET.Element]:
    """递归收集 testsuite 下的所有 testcase 元素。"""
    testcases = []
    # 直接子 testcase
    for child in suite:
        if child.tag == "testcase":
            testcases.append(child)
        elif child.tag == "testsuite":
            # 递归嵌套的 testsuite
            testcases.extend(_collect_testcases(child))
    return testcases


def _collect_all_suites(root: ET.Element) -> List[ET.Element]:
    """收集所有 testsuite 元素（支持嵌套）。"""
    suites = []
    if root.tag == "testsuites":
        for child in root:
            if child.tag == "testsuite":
                suites.append(child)
    elif root.tag == "testsuite":
        suites.append(root)
    return suites


def parse_junit_xml(file_path: str) -> Dict[str, Any]:
    """解析 JUnit XML 文件。

    Args:
        file_path: JUnit XML 文件路径

    Returns:
        标准化的解析结果字典，包含 summary, failedTests, testFiles, coverage 字段
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"结果文件不存在: {file_path}")

    try:
        tree = ET.parse(file_path)
        root = tree.getroot()
    except ET.ParseError as e:
        raise ValueError(f"XML 解析失败: {file_path} - {e}")

    total = 0
    passed = 0
    failed = 0
    skipped = 0
    total_duration = 0.0
    failed_tests: List[Dict[str, Any]] = []
    test_files: List[Dict[str, Any]] = []

    suites = _collect_all_suites(root)

    for suite in suites:
        suite_name = suite.get("name", "未命名")
        suite_total = _safe_int(suite.get("tests", "0"))
        suite_failures = _safe_int(suite.get("failures", "0"))
        suite_errors = _safe_int(suite.get("errors", "0"))
        suite_skipped = _safe_int(suite.get("skipped", "0"))
        suite_time = _safe_float(suite.get("time", "0"))

        total += suite_total
        failed += suite_failures + suite_errors
        skipped += suite_skipped
        total_duration += suite_time

        # 收集 testcase
        testcases = _collect_testcases(suite)
        suite_tests = []

        for tc in testcases:
            tc_name = tc.get("name", "未命名")
            tc_classname = tc.get("classname", "")
            tc_time = _safe_float(tc.get("time", "0"))

            failure = tc.find("failure")
            error = tc.find("error")
            skipped_elem = tc.find("skipped")

            if failure is not None or error is not None:
                elem = failure if failure is not None else error
                error_msg = _sanitize_message(elem.get("message", ""))
                stack_text = elem.text or ""
                full_stack = error_msg + "\n" + stack_text if stack_text else error_msg

                # 构建完整的用例名
                full_name = f"{tc_classname}.{tc_name}" if tc_classname else tc_name

                failed_tests.append({
                    "name": full_name,
                    "file": suite_name,
                    "suite": tc_classname,
                    "duration": tc_time,
                    "location": suite_name,
                    "error": error_msg,
                    "stackTrace": _truncate_stack(full_stack),
                })
                suite_tests.append({
                    "name": full_name,
                    "status": "failed",
                    "duration": tc_time,
                })
            elif skipped_elem is not None:
                skipped += 1
                full_name = f"{tc_classname}.{tc_name}" if tc_classname else tc_name
                suite_tests.append({
                    "name": full_name,
                    "status": "skipped",
                    "duration": tc_time,
                })
            else:
                full_name = f"{tc_classname}.{tc_name}" if tc_classname else tc_name
                suite_tests.append({
                    "name": full_name,
                    "status": "passed",
                    "duration": tc_time,
                })

        # 确定 suite 状态
        suite_statuses = [t["status"] for t in suite_tests]
        if "failed" in suite_statuses:
            suite_status = "failed"
        elif all(s == "passed" for s in suite_statuses):
            suite_status = "passed"
        elif all(s == "skipped" for s in suite_statuses):
            suite_status = "skipped"
        else:
            suite_status = "mixed"

        test_files.append({
            "fileName": suite_name,
            "status": suite_status,
            "duration": suite_time,
            "testCount": len(suite_tests),
            "tests": suite_tests,
        })

    passed = total - failed - skipped
    pass_rate = (passed / total * 100) if total > 0 else 0.0
    success = failed == 0

    summary = {
        "total": total,
        "passed": passed,
        "failed": failed,
        "skipped": skipped,
        "passRate": round(pass_rate, 1),
        "duration": round(total_duration, 2),
        "success": success,
    }

    return {
        "summary": summary,
        "failedTests": failed_tests,
        "testFiles": test_files,
        "coverage": None,
    }