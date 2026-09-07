from typing import List


class Solution:
    def sortArray(self, nums: List[int]) -> List[int]:
        def merge(arr):
            if len(arr) <= 1:
                return arr

            mid = len(arr) // 2
            left = merge(arr[:mid])
            right = merge(arr[mid:])

            ans = []
            i = 0
            j = 0

            while i < len(left) and j < len(right):
                if left[i] <= right[j]:
                    ans.append(left[i])
                    i += 1
                else:
                    ans.append(right[j])
                    j += 1

            ans.extend(left[i:])
            ans.extend(right[j:])
            return ans

        return merge(nums)
