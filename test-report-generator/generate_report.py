#!/usr/bin/env python3
"""测试报告生成器主入口。

用法:
    # 解析模式：直接解析已有结果文件
    python generate_report.py --mode parse --result-file results.json --framework jest --output-path reports/

    # 解析 JUnit XML
    python generate_report.py --mode parse --result-file junit.xml --framework junit --output-path reports/

    # 执行模式：自动运行测试并生成报告
    python generate_report.py --mode execute --output-path reports/

    # 指定覆盖率文件
    python generate_report.py --mode parse --result-file results.json --framework jest --coverage coverage/coverage-final.json
"""

import argparse
import os
import sys
import subprocess
from typing import Any, Dict, Optional

# 添加当前目录到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from parsers.jest_vitest import parse_jest_vitest_json
from parsers.junit_xml import parse_junit_xml
from report_writer import (
    generate_markdown_report,
    generate_summary_text,
    _format_filename,
    _detect_project_name,
    _sanitize_environment,
    VERSION,
)


def detect_framework() -> str:
    """自动检测测试框架。

    检测优先级:
    1. package.json scripts 中的 test 命令
    2. 框架特征文件 (jest.config.*, vitest.config.*)
    3. pyproject.toml / pytest.ini
    """
    cwd = os.getcwd()

    # 检查 package.json
    pkg_path = os.path.join(cwd, "package.json")
    if os.path.exists(pkg_path):
        try:
            import json
            with open(pkg_path, "r", encoding="utf-8") as f:
                pkg = json.load(f)
            scripts = pkg.get("scripts", {})
            test_script = scripts.get("test", "")
            if "vitest" in test_script.lower():
                return "vitest"
            if "jest" in test_script.lower():
                return "jest"
            # 检查 devDependencies / dependencies
            dev_deps = pkg.get("devDependencies", {})
            deps = pkg.get("dependencies", {})
            all_deps = {**dev_deps, **deps}
            if "vitest" in all_deps:
                return "vitest"
            if "jest" in all_deps:
                return "jest"
        except Exception:
            pass

    # 检查特征文件
    feature_files = {
        "vitest": ["vitest.config.ts", "vitest.config.js", "vitest.config.mjs"],
        "jest": ["jest.config.js", "jest.config.ts", "jest.config.mjs", "jest.config.json"],
    }
    for framework, files in feature_files.items():
        for f in files:
            if os.path.exists(os.path.join(cwd, f)):
                return framework

    # 检查 pytest
    if os.path.exists(os.path.join(cwd, "pyproject.toml")):
        try:
            with open(os.path.join(cwd, "pyproject.toml"), "r", encoding="utf-8") as f:
                content = f.read()
            if "pytest" in content.lower() or "[tool.pytest" in content:
                return "pytest"
        except Exception:
            pass

    if os.path.exists(os.path.join(cwd, "pytest.ini")) or os.path.exists(os.path.join(cwd, "tox.ini")):
        return "pytest"

    return "unknown"


def detect_test_command(framework: str) -> str:
    """根据框架检测测试命令。"""
    if framework == "jest":
        return "npx jest --json --outputFile=test-results.json"
    if framework == "vitest":
        return "npx vitest run --reporter=json --outputFile=test-results.json"
    if framework == "pytest":
        return "python -m pytest --junitxml=test-results.xml"
    return "npm test"


def run_tests(command: str, timeout_secs: int = 300) -> subprocess.CompletedProcess:
    """执行测试命令。

    Args:
        command: 测试命令
        timeout_secs: 超时时间（秒）

    Returns:
        subprocess.CompletedProcess
    """
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout_secs,
            cwd=os.getcwd(),
        )
        return result
    except subprocess.TimeoutExpired:
        raise RuntimeError(f"测试执行超时 ({timeout_secs}s): {command}")
    except FileNotFoundError:
        raise RuntimeError(f"测试命令无法执行，请确认环境已安装: {command}")


def find_result_file(framework: str) -> Optional[str]:
    """自动查找测试结果文件。"""
    cwd = os.getcwd()
    candidates = []

    if framework in ("jest", "vitest"):
        candidates = [
            "test-results.json",
            "results.json",
            os.path.join("test-results", "results.json"),
        ]
    elif framework == "junit":
        candidates = [
            "test-results.xml",
            "junit.xml",
            os.path.join("test-results", "junit.xml"),
            os.path.join("target", "surefire-reports", "TEST-*.xml"),
        ]
    elif framework == "pytest":
        candidates = [
            "test-results.xml",
            "pytest-results.xml",
            "junit.xml",
        ]

    for candidate in candidates:
        if os.path.exists(os.path.join(cwd, candidate)):
            return candidate

    return None


def parse_args():
    """解析命令行参数。"""
    parser = argparse.ArgumentParser(
        description="测试报告生成器 - 自动执行测试并生成结构化 Markdown 报告",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 解析模式
  %(prog)s --mode parse --result-file results.json --framework jest
  %(prog)s --mode parse --result-file junit.xml --framework junit

  # 执行模式
  %(prog)s --mode execute

  # 指定覆盖率
  %(prog)s --mode parse --result-file results.json --framework jest --coverage coverage/coverage-final.json
        """,
    )

    parser.add_argument(
        "--mode",
        choices=["parse", "execute"],
        default="parse",
        help="工作模式: parse(解析已有结果) / execute(执行测试并收集结果)",
    )
    parser.add_argument(
        "--result-file",
        default=None,
        help="解析模式下的结果文件路径（自动检测若未指定）",
    )
    parser.add_argument(
        "--framework",
        choices=["jest", "vitest", "junit", "pytest", "auto"],
        default="auto",
        help="测试框架类型（默认 auto 自动检测）",
    )
    parser.add_argument(
        "--test-command",
        default=None,
        help="执行模式下的测试命令（覆盖自动检测）",
    )
    parser.add_argument(
        "--output-format",
        choices=["markdown"],
        default="markdown",
        help="输出格式（默认 markdown）",
    )
    parser.add_argument(
        "--output-path",
        default="reports/",
        help="报告输出目录（默认 reports/）",
    )
    parser.add_argument(
        "--coverage",
        choices=["auto", "on", "off"],
        default="auto",
        help="覆盖率数据收集: auto/on/off",
    )
    parser.add_argument(
        "--coverage-file",
        default=None,
        help="覆盖率文件路径（如 coverage/coverage-final.json）",
    )
    parser.add_argument(
        "--fail-threshold",
        type=float,
        default=None,
        help="通过率阈值，低于该值时报告结论标记为不达标",
    )

    return parser.parse_args()


def main():
    """主入口函数。"""
    args = parse_args()

    # 确定框架
    framework = args.framework
    if framework == "auto":
        framework = detect_framework()
        print(f"[检测] 框架: {framework}")

    if framework == "unknown":
        print("[错误] 无法自动检测测试框架，请使用 --framework 参数指定")
        sys.exit(1)

    # 确定测试命令
    test_command = args.test_command or detect_test_command(framework)

    result_file = None
    coverage_file = None

    if args.mode == "execute":
        print(f"[执行] 运行测试: {test_command}")
        try:
            result = run_tests(test_command)
        except RuntimeError as e:
            print(f"[错误] {e}")
            sys.exit(1)

        if result.returncode != 0 and result.stderr:
            # 检查是否真的是执行失败（非用例失败）
            if "command not found" in result.stderr.lower() or "no such file" in result.stderr.lower():
                print(f"[错误] 测试命令无法执行: {result.stderr.strip()}")
                sys.exit(1)

        # 自动查找结果文件
        result_file = find_result_file(framework)
        if not result_file:
            print(f"[警告] 未能自动定位结果文件，尝试搜索...")
            # 尝试在常见位置查找
            for ext in (".json", ".xml"):
                for root_dir, _, files in os.walk(os.getcwd()):
                    for f in files:
                        if f.endswith(ext) and ("test-result" in f or "junit" in f or "results" in f):
                            result_file = os.path.join(root_dir, f)
                            break
                    if result_file:
                        break
                if result_file:
                    break

    elif args.mode == "parse":
        result_file = args.result_file or find_result_file(framework)
        if not result_file:
            print("[错误] 未指定结果文件且无法自动检测，请使用 --result-file 参数")
            print(f"[提示] 常见结果文件: test-results.json, junit.xml, test-results.xml")
            sys.exit(1)

    if not result_file or not os.path.exists(result_file):
        print(f"[错误] 结果文件不存在: {result_file}")
        sys.exit(1)

    print(f"[解析] 结果文件: {result_file}")

    # 解析结果
    try:
        if framework in ("jest", "vitest"):
            # 覆盖率文件
            if args.coverage in ("auto", "on"):
                coverage_file = args.coverage_file
                if not coverage_file:
                    for cov_path in ("coverage/coverage-final.json", "coverage/coverage-summary.json"):
                        if os.path.exists(os.path.join(os.getcwd(), cov_path)):
                            coverage_file = cov_path
                            break
            parsed = parse_jest_vitest_json(result_file, coverage_file)
        elif framework == "junit":
            parsed = parse_junit_xml(result_file)
        elif framework == "pytest":
            # pytest 产出的 JUnit XML 也用 junit 解析器
            parsed = parse_junit_xml(result_file)
        else:
            print(f"[错误] 不支持的框架: {framework}")
            sys.exit(1)
    except (FileNotFoundError, ValueError) as e:
        print(f"[错误] 结果文件解析失败: {e}")
        print("请确认结果文件格式正确且未损坏")
        sys.exit(1)

    # 生成报告
    output_dir = args.output_path
    if not output_dir.endswith("/") and not output_dir.endswith("\\"):
        output_dir += "/"
    os.makedirs(output_dir, exist_ok=True)

    report_filename = _format_filename()
    output_path = os.path.join(output_dir, report_filename)

    meta = {
        "projectName": _detect_project_name(),
        "testCommand": test_command,
        "framework": framework,
        "resultFile": result_file,
        "environment": _sanitize_environment(),
    }

    report_path = generate_markdown_report(
        parsed_data=parsed,
        output_path=output_path,
        meta=meta,
        fail_threshold=args.fail_threshold,
    )

    # 输出摘要
    print(f"\n[报告] {report_path}")
    print(generate_summary_text(parsed))

    return parsed


if __name__ == "__main__":
    main()