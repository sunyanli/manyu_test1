"""
QuickSort 算法实现
-------------------
就地分区（Lomuto partition scheme），递归排序。
时间复杂度：平均 O(n log n)，最坏 O(n²)
空间复杂度：O(log n)（递归栈）
"""

from typing import List, TypeVar

T = TypeVar('T')


def quicksort(arr: List[T], low: int = 0, high: int | None = None) -> None:
    """对列表 arr[low..high] 进行就地快速排序。

    Args:
        arr: 待排序列表（原地修改）
        low: 排序区间起始索引，默认 0
        high: 排序区间结束索引（含），默认 len(arr)-1
    """
    if high is None:
        high = len(arr) - 1

    if low < high:
        pivot_idx = _partition(arr, low, high)
        quicksort(arr, low, pivot_idx - 1)
        quicksort(arr, pivot_idx + 1, high)


def _partition(arr: List[T], low: int, high: int) -> int:
    """Lomuto 分区：以 arr[high] 为 pivot，将较小元素置于左侧。

    Returns:
        pivot 最终位置索引
    """
    pivot = arr[high]
    i = low - 1  # 较小元素区的末尾索引

    for j in range(low, high):
        if arr[j] <= pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]

    # 将 pivot 放到正确位置
    arr[i + 1], arr[high] = arr[high], arr[i + 1]
    return i + 1


def quicksort_sorted(arr: List[T]) -> List[T]:
    """返回排序后的新列表，不修改原列表。"""
    result = arr[:]
    quicksort(result)
    return result