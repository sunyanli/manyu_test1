"""
QuickSort 单元测试
覆盖：基本排序、边界条件、稳定性相关场景
"""

import pytest
from quicksort import quicksort, quicksort_sorted


class TestQuicksortInPlace:
    """就地排序测试"""

    def test_empty_array(self):
        arr = []
        quicksort(arr)
        assert arr == []

    def test_single_element(self):
        arr = [42]
        quicksort(arr)
        assert arr == [42]

    def test_sorted_array(self):
        arr = [1, 2, 3, 4, 5]
        quicksort(arr)
        assert arr == [1, 2, 3, 4, 5]

    def test_reverse_sorted(self):
        arr = [5, 4, 3, 2, 1]
        quicksort(arr)
        assert arr == [1, 2, 3, 4, 5]

    def test_duplicates(self):
        arr = [3, 1, 3, 2, 1, 2]
        quicksort(arr)
        assert arr == [1, 1, 2, 2, 3, 3]

    def test_all_same(self):
        arr = [7, 7, 7, 7]
        quicksort(arr)
        assert arr == [7, 7, 7, 7]

    def test_random_order(self):
        arr = [9, 3, 7, 1, 5, 4, 8, 2, 6]
        quicksort(arr)
        assert arr == [1, 2, 3, 4, 5, 6, 7, 8, 9]

    def test_negative_numbers(self):
        arr = [-3, 0, 5, -8, 2, -1]
        quicksort(arr)
        assert arr == [-8, -3, -1, 0, 2, 5]

    def test_large_numbers(self):
        arr = [1000000, 500, 999999, 1]
        quicksort(arr)
        assert arr == [1, 500, 999999, 1000000]

    def test_two_elements_unsorted(self):
        arr = [2, 1]
        quicksort(arr)
        assert arr == [1, 2]

    def test_two_elements_sorted(self):
        arr = [1, 2]
        quicksort(arr)
        assert arr == [1, 2]


class TestQuicksortSorted:
    """返回新列表的排序测试"""

    def test_original_unchanged(self):
        arr = [3, 1, 2]
        result = quicksort_sorted(arr)
        assert result == [1, 2, 3]
        assert arr == [3, 1, 2]  # 原列表不变

    def test_empty(self):
        assert quicksort_sorted([]) == []

    def test_normal_case(self):
        assert quicksort_sorted([5, 2, 8, 1, 3]) == [1, 2, 3, 5, 8]


class TestStrings:
    """字符串排序测试"""

    def test_string_sort(self):
        arr = ["banana", "apple", "cherry", "date"]
        quicksort(arr)
        assert arr == ["apple", "banana", "cherry", "date"]

    def test_string_duplicates(self):
        arr = ["z", "a", "z", "m", "a"]
        quicksort(arr)
        assert arr == ["a", "a", "m", "z", "z"]