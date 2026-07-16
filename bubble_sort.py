"""
冒泡排序（Bubble Sort）实现
=============================
冒泡排序是一种简单的排序算法，它重复地遍历要排序的列表，
比较相邻元素，如果顺序错误就交换它们。
遍历列表的过程会重复进行，直到没有需要交换的元素为止。

时间复杂度：O(n²)  最坏/平均
空间复杂度：O(1)
"""

from typing import List


def bubble_sort(arr: List[int]) -> List[int]:
    """
    对整数列表进行冒泡排序，返回升序排列的新列表。

    Args:
        arr: 待排序的整数列表

    Returns:
        升序排列后的新列表（不修改原列表）
    """
    if not isinstance(arr, list):
        raise TypeError("输入必须是列表类型")

    n = len(arr)
    result = arr[:]  # 复制一份，避免修改原列表

    for i in range(n):
        swapped = False
        # 每一轮将最大元素 "冒泡" 到末尾
        for j in range(0, n - i - 1):
            if result[j] > result[j + 1]:
                result[j], result[j + 1] = result[j + 1], result[j]
                swapped = True
        # 如果本轮没有发生交换，说明已经有序，提前退出
        if not swapped:
            break

    return result


if __name__ == "__main__":
    # 测试用例
    test_cases = [
        ([64, 34, 25, 12, 22, 11, 90], "普通数组"),
        ([5, 1, 4, 2, 8], "小数组"),
        ([1, 2, 3, 4, 5], "已排序数组"),
        ([5, 4, 3, 2, 1], "逆序数组"),
        ([1], "单元素数组"),
        ([], "空数组"),
        ([3, 3, 1, 2, 3], "含重复元素"),
    ]

    all_passed = True
    for data, desc in test_cases:
        result = bubble_sort(data)
        expected = sorted(data)
        status = "✅" if result == expected else "❌"
        if result != expected:
            all_passed = False
        print(f"{status} {desc}: {data} -> {result}")

    print(f"\n{'所有测试通过!' if all_passed else '存在测试失败!'}")