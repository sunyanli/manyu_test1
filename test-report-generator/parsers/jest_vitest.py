"""Jest / Vitest JSON 输出解析器。

支持 Jest --json 和 Vitest --reporter=json 输出的解析。
"""

import json
import os
from typing import Any, Dict, List, Optional


def _parse_location(full_name: str) -> str:
    """从全限定名提取文件路径和行号。

    Example:
        'src/utils/calc.test.ts > Calculator > add > should add two numbers'
        -> 'src/utils/calc.test.ts'
    """
    parts = full_name.split(" > ")
    if parts:
        return parts[0]
    return full_name


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
    # 移除环境变量类密钥
    sanitized = msg
    # 过滤常见的 JWT/API Key 模式
    import re
    sanitized = re.sub(r'[A-Za-z0-9+/=]{40,}', '<REDACTED>', sanitized)
    return sanitized


def _parse_assertion_results(test: Dict[str, Any]) -> List[Dict[str, Any]]:
    """解析单个测试用例中的断言结果。"""
    results = []
    assertion_results = test.get("assertionResults", [])
    for ar in assertion_results:
        results.append({
            "name": ar.get("title", "未命名"),
            "status": ar.get("status", "unknown"),
            "duration": ar.get("duration", 0),
            "location": _parse_location(test.get("name", "")),
            "ancestor_titles": ar.get("ancestorTitles", []),
        })
    return results


def parse_jest_vitest_json(
    file_path: str,
    coverage_path: Optional[str] = None,
) -> Dict[str, Any]:
    """解析 Jest/Vitest JSON 输出文件。

    Args:
        file_path: JSON 结果文件路径
        coverage_path: 可选的覆盖率 JSON 文件路径

    Returns:
        标准化的解析结果字典，包含 summary, failedTests, testFiles, coverage 字段
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"结果文件不存在: {file_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            raise ValueError(f"JSON 解析失败: {file_path} - {e}")

    total = data.get("numTotalTests", 0)
    passed = data.get("numPassedTests", 0)
    failed = data.get("numFailedTests", 0)
    pending = data.get("numPendingTests", 0)
    skipped = data.get("numSkippedTests", 0) if "numSkippedTests" in data else (
        pending + data.get("numTodoTests", 0)
    )
    success = data.get("success", failed == 0)

    pass_rate = (passed / total * 100) if total > 0 else 0.0

    # 计算总耗时
    test_results = data.get("testResults", [])
    total_duration = 0
    for tr in test_results:
        # Jest 的 perfStats 包含 endTime - startTime 或直接用 duration
        perf = tr.get("perfStats", {})
        if perf:
            runtime = perf.get("runtime", 0)
            if runtime > 0:
                total_duration += runtime
            else:
                total_duration += (perf.get("end", 0) - perf.get("start", 0))
        else:
            total_duration += tr.get("duration", 0)

    summary = {
        "total": total,
        "passed": passed,
        "failed": failed,
        "skipped": skipped,
        "passRate": round(pass_rate, 1),
        "duration": round(total_duration / 1000, 2),  # 转换为秒
        "success": success,
    }

    # 提取失败用例
    failed_tests = []
    for tr in test_results:
        file_name = tr.get("name", "")
        assertion_results = tr.get("assertionResults", [])
        for ar in assertion_results:
            if ar.get("status") == "failed":
                failure_messages = ar.get("failureMessages", [])
                error_msg = ""
                stack_trace = ""
                if failure_messages:
                    full_msg = failure_messages[0]
                    # 分离错误信息和堆栈
                    parts = full_msg.split("\n", 1)
                    error_msg = _sanitize_message(parts[0])
                    if len(parts) > 1:
                        stack_trace = parts[1]

                ancestor = ar.get("ancestorTitles", [])
                full_name = " > ".join(ancestor + [ar.get("title", "")]) if ancestor else ar.get("title", "")

                failed_tests.append({
                    "name": full_name or "未命名",
                    "file": file_name,
                    "suite": ancestor[0] if ancestor else "",
                    "duration": ar.get("duration", 0),
                    "location": _parse_location(file_name),
                    "error": error_msg,
                    "stackTrace": _truncate_stack(stack_trace),
                })

    # 提取测试文件明细
    test_files = []
    for tr in test_results:
        file_name = tr.get("name", "")
        assertion_results = tr.get("assertionResults", [])
        tests = []
        for ar in assertion_results:
            ancestor = ar.get("ancestorTitles", [])
            full_name = " > ".join(ancestor + [ar.get("title", "")]) if ancestor else ar.get("title", "")
            tests.append({
                "name": full_name or "未命名",
                "status": ar.get("status", "unknown"),
                "duration": ar.get("duration", 0),
            })

        # 确定文件状态
        statuses = [t["status"] for t in tests]
        if "failed" in statuses:
            file_status = "failed"
        elif all(s == "passed" for s in statuses):
            file_status = "passed"
        elif all(s == "skipped" or s == "pending" or s == "todo" for s in statuses):
            file_status = "skipped"
        else:
            file_status = "mixed"

        test_files.append({
            "fileName": file_name,
            "status": file_status,
            "duration": tr.get("duration", 0),
            "testCount": len(tests),
            "tests": tests,
        })

    # 解析覆盖率
    coverage = None
    if coverage_path and os.path.exists(coverage_path):
        with open(coverage_path, "r", encoding="utf-8") as f:
            coverage_data = json.load(f)
        coverage = _parse_coverage(coverage_data)

    return {
        "summary": summary,
        "failedTests": failed_tests,
        "testFiles": test_files,
        "coverage": coverage,
    }


def _parse_coverage(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """解析覆盖率数据（支持 Istanbul/Jest 格式）。"""
    total = data.get("total", {})
    if not total:
        return None

    lines_pct = 0
    branches_pct = 0
    functions_pct = 0
    statements_pct = 0

    lines = total.get("lines", {})
    branches = total.get("branches", {})
    functions = total.get("functions", {})
    statements = total.get("statements", {})

    if lines:
        lines_pct = round(lines.get("covered", 0) / max(lines.get("total", 1), 1) * 100, 1)
    if branches:
        branches_pct = round(branches.get("covered", 0) / max(branches.get("total", 1), 1) * 100, 1)
    if functions:
        functions_pct = round(functions.get("covered", 0) / max(functions.get("total", 1), 1) * 100, 1)
    if statements:
        statements_pct = round(statements.get("covered", 0) / max(statements.get("total", 1), 1) * 100, 1)

    # 低于 80% 阈值的文件
    low_coverage_files: List[Dict[str, Any]] = []
    file_map = data.get("fileMap", data.get("files", {}))
    if isinstance(file_map, dict):
        for fpath, finfo in file_map.items():
            flines = finfo.get("lines", {})
            if flines:
                fpct = round(flines.get("covered", 0) / max(flines.get("total", 1), 1) * 100, 1)
                if fpct < 80:
                    low_coverage_files.append({
                        "file": fpath,
                        "lines": fpct,
                        "branches": round(
                            finfo.get("branches", {}).get("covered", 0) / max(
                                finfo.get("branches", {}).get("total", 1), 1
                            ) * 100, 1
                        ) if finfo.get("branches", {}).get("total", 0) > 0 else 0,
                    })

    return {
        "lines": lines_pct,
        "branches": branches_pct,
        "functions": functions_pct,
        "statements": statements_pct,
        "lowCoverageFiles": low_coverage_files if low_coverage_files else None,
    }