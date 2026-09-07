from typing import List


class Solution:
    def removeDuplicates(self, nums: List[int]) -> int:
        left = 0  # 已经保留了多少个元素

        for right in range(len(nums)):
            if left < 2 or nums[right] != nums[left - 2]:
                nums[left] = nums[right]
                left += 1

        return left
