"""Markdown 测试报告写入器。

根据标准化解析结果生成符合模板结构的 Markdown 报告。
"""

import os
import platform
import re
from datetime import datetime
from typing import Any, Dict, List, Optional


VERSION = "1.0.0"


def _format_timestamp() -> str:
    """格式化时间戳: YYYY-MM-DD HH:MM:SS"""
    now = datetime.now()
    return now.strftime("%Y-%m-%d %H:%M:%S")


def _format_filename() -> str:
    """生成报告文件名: test-report-YYYYMMDD-HHmmss.md"""
    now = datetime.now()
    return now.strftime("test-report-%Y%m%d-%H%M%S.md")


def _get_overall_status(summary: Dict[str, Any], fail_threshold: Optional[float] = None) -> str:
    """判断整体结论。

    Args:
        summary: 测试结果摘要
        fail_threshold: 可选的通过率阈值，低于此值标记为不达标

    Returns:
        ✅ 或 ❌ 状态标识
    """
    if summary.get("failed", 0) > 0:
        return "❌"

    if fail_threshold is not None and summary.get("passRate", 100) < fail_threshold:
        return f"❌ (通过率低于 {fail_threshold}%)"

    return "✅"


def _sanitize_environment() -> str:
    """收集环境信息，过滤敏感变量。"""
    parts = []
    # Python 版本
    try:
        import sys
        parts.append(f"Python {sys.version.split()[0]}")
    except Exception:
        pass

    # 操作系统
    try:
        parts.append(platform.system())
    except Exception:
        parts.append("未知")

    return ", ".join(parts) if parts else "未知"


def _detect_project_name() -> str:
    """从当前目录检测项目名。"""
    cwd = os.getcwd()
    # 尝试从 package.json 读取
    pkg_path = os.path.join(cwd, "package.json")
    if os.path.exists(pkg_path):
        try:
            import json
            with open(pkg_path, "r", encoding="utf-8") as f:
                pkg = json.load(f)
            return pkg.get("name", os.path.basename(cwd))
        except Exception:
            pass

    # 尝试从 pyproject.toml 读取
    pyproject_path = os.path.join(cwd, "pyproject.toml")
    if os.path.exists(pyproject_path):
        try:
            with open(pyproject_path, "r", encoding="utf-8") as f:
                for line in f:
                    m = re.match(r'^name\s*=\s*["\'](.+?)["\']', line)
                    if m:
                        return m.group(1)
        except Exception:
            pass

    return os.path.basename(cwd)


def _generate_header(meta: Dict[str, Any]) -> str:
    """生成报告头章节。"""
    lines = [
        "# 测试报告",
        "",
        "## 报告头",
        "",
        f"**项目**: {meta.get('projectName', '未知')}",
        f"**生成时间**: {meta.get('timestamp', _format_timestamp())}",
        f"**执行命令**: {meta.get('testCommand', '未指定')}",
        f"**测试框架**: {meta.get('framework', '未检测')}",
        f"**执行环境**: {meta.get('environment', _sanitize_environment())}",
        "",
    ]
    return "\n".join(lines)


def _generate_summary(summary: Dict[str, Any], fail_threshold: Optional[float] = None) -> str:
    """生成结果摘要章节。"""
    overall = _get_overall_status(summary, fail_threshold)
    lines = [
        "## 📊 结果摘要",
        "",
        "| 指标 | 值 |",
        "|------|----|",
        f"| 用例总数 | {summary.get('total', 0)} |",
        f"| 通过 | {summary.get('passed', 0)} |",
        f"| 失败 | {summary.get('failed', 0)} |",
        f"| 跳过 | {summary.get('skipped', 0)} |",
        f"| 通过率 | {summary.get('passRate', 0)}% |",
        f"| 总耗时 | {summary.get('duration', 0)}s |",
        f"| 整体结论 | {overall} |",
        "",
    ]
    return "\n".join(lines)


def _generate_failed_tests(failed_tests: List[Dict[str, Any]]) -> str:
    """生成失败用例分析章节。"""
    if not failed_tests:
        return ""

    lines = [
        "## ❌ 失败用例分析",
        "",
        f"共 {len(failed_tests)} 个用例失败：",
        "",
    ]

    for i, ft in enumerate(failed_tests, 1):
        lines.append(f"### {i}. {ft.get('name', '未命名')}")
        lines.append("")
        lines.append(f"- **文件**: `{ft.get('file', '未知')}`")
        if ft.get("suite"):
            lines.append(f"- **套件**: {ft.get('suite')}")
        lines.append(f"- **耗时**: {ft.get('duration', 0)}ms")
        lines.append("")
        lines.append(f"**错误信息**:")
        lines.append("```")
        lines.append(ft.get("error", "无错误信息"))
        lines.append("```")
        lines.append("")
        stack = ft.get("stackTrace", "")
        if stack and stack != "无堆栈信息":
            lines.append(f"<details>")
            lines.append(f"<summary>堆栈追踪</summary>")
            lines.append("")
            lines.append("```")
            lines.append(stack)
            lines.append("```")
            lines.append("")
            lines.append(f"</details>")
        lines.append("")

    return "\n".join(lines)


def _generate_test_details(test_files: List[Dict[str, Any]], max_tests: int = 200) -> str:
    """生成用例明细章节。"""
    lines = [
        "## 📋 用例明细",
        "",
    ]

    total_test_count = sum(tf.get("testCount", 0) for tf in test_files)
    displayed_count = 0
    truncated = False

    for tf in test_files:
        file_name = tf.get("fileName", "未知")
        file_status = tf.get("status", "unknown")
        file_duration = tf.get("duration", 0)
        tests = tf.get("tests", [])

        status_icon = {"passed": "✅", "failed": "❌", "skipped": "⏭️", "mixed": "⚠️"}.get(file_status, "⬜")

        lines.append(f"### {status_icon} {file_name}")
        lines.append("")
        lines.append(f"*耗时: {file_duration}s | 用例数: {len(tests)}*")
        lines.append("")
        lines.append("| 用例 | 状态 | 耗时 |")
        lines.append("|------|------|------|")

        for test in tests:
            if displayed_count >= max_tests:
                truncated = True
                break

            test_name = test.get("name", "未命名")
            test_status = test.get("status", "unknown")
            test_duration = test.get("duration", 0)
            status_display = {"passed": "✅", "failed": "❌", "skipped": "⏭️"}.get(test_status, "⬜")

            lines.append(f"| {test_name} | {status_display} {test_status} | {test_duration}ms |")
            displayed_count += 1

        lines.append("")
        if truncated:
            break

    if total_test_count > max_tests:
        lines.append(f"> ⚠️ 用例数量超过 {max_tests}，已截断显示。完整列表见原始结果文件。")
        lines.append("")

    return "\n".join(lines)


def _generate_coverage(coverage: Optional[Dict[str, Any]]) -> str:
    """生成覆盖率章节。"""
    lines = [
        "## 📈 覆盖率",
        "",
    ]

    if coverage is None:
        lines.append("**覆盖率数据**: 未获取")
        lines.append("")
        return "\n".join(lines)

    lines_value = coverage.get("lines", 0)
    branches_value = coverage.get("branches", 0)
    functions_value = coverage.get("functions", 0)
    statements_value = coverage.get("statements", 0)

    lines.append("| 类型 | 覆盖率 |")
    lines.append("|------|--------|")
    lines.append(f"| 语句 | {statements_value}% |")
    lines.append(f"| 分支 | {branches_value}% |")
    lines.append(f"| 函数 | {functions_value}% |")
    lines.append(f"| 行 | {lines_value}% |")
    lines.append("")

    low_files = coverage.get("lowCoverageFiles")
    if low_files:
        lines.append("### 📉 低覆盖率文件")
        lines.append("")
        lines.append("以下文件覆盖率低于 80%：")
        lines.append("")
        lines.append("| 文件 | 行覆盖率 | 分支覆盖率 |")
        lines.append("|------|---------|-----------|")
        for lf in low_files:
            lines.append(f"| {lf.get('file', '未知')} | {lf.get('lines', 0)}% | {lf.get('branches', 0)}% |")
        lines.append("")

    return "\n".join(lines)


def _generate_appendix(result_file: str) -> str:
    """生成附录章节。"""
    lines = [
        "## 📎 附录",
        "",
        f"- **原始结果文件**: `{result_file}`",
        f"- **生成工具**: test-report-generator v{VERSION}",
        f"- **生成时间**: {_format_timestamp()}",
        "",
        "---",
        "",
        "*本报告由 test-report-generator 自动生成*",
        "",
    ]
    return "\n".join(lines)


def generate_markdown_report(
    parsed_data: Dict[str, Any],
    output_path: str,
    meta: Dict[str, Any],
    fail_threshold: Optional[float] = None,
) -> str:
    """生成 Markdown 测试报告。

    Args:
        parsed_data: 解析器返回的标准化结果，包含 summary, failedTests, testFiles, coverage
        output_path: 报告输出路径
        meta: 报告元信息，包含 projectName, testCommand, framework, resultFile
        fail_threshold: 可选的通过率阈值

    Returns:
        生成的报告文件路径
    """
    summary = parsed_data.get("summary", {})
    failed_tests = parsed_data.get("failedTests", [])
    test_files = parsed_data.get("testFiles", [])
    coverage = parsed_data.get("coverage")

    # 确保 meta 包含必要字段
    meta.setdefault("projectName", _detect_project_name())
    meta.setdefault("timestamp", _format_timestamp())
    meta.setdefault("testCommand", "未指定")
    meta.setdefault("framework", "未检测")
    meta.setdefault("environment", _sanitize_environment())
    meta.setdefault("resultFile", "")

    sections = [
        _generate_header(meta),
        _generate_summary(summary, fail_threshold),
    ]

    # 失败用例分析
    failed_section = _generate_failed_tests(failed_tests)
    if failed_section:
        sections.append(failed_section)

    # 用例明细
    sections.append(_generate_test_details(test_files))

    # 覆盖率
    sections.append(_generate_coverage(coverage))

    # 附录
    sections.append(_generate_appendix(meta.get("resultFile", "")))

    report_content = "\n".join(sections)

    # 确保输出目录存在
    output_dir = os.path.dirname(output_path)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(report_content)

    return output_path


def generate_summary_text(parsed_data: Dict[str, Any]) -> str:
    """生成用户友好的摘要文本（用于终端输出）。

    Args:
        parsed_data: 解析器返回的标准化结果

    Returns:
        摘要文本
    """
    summary = parsed_data.get("summary", {})
    failed_tests = parsed_data.get("failedTests", [])

    overall = _get_overall_status(summary)
    lines = [
        f"测试报告生成完成 {overall}",
        f"通过率: {summary.get('passRate', 0)}%",
        f"总数: {summary.get('total', 0)} | 通过: {summary.get('passed', 0)} | 失败: {summary.get('failed', 0)} | 跳过: {summary.get('skipped', 0)}",
        f"耗时: {summary.get('duration', 0)}s",
    ]

    if failed_tests:
        lines.append("")
        lines.append("--- 失败用例 (Top 3) ---")
        for i, ft in enumerate(failed_tests[:3], 1):
            lines.append(f"  {i}. {ft.get('name', '未命名')}")
            lines.append(f"     {ft.get('error', '')[:120]}")

    return "\n".join(lines)