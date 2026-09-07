from typing import List


class Solution:
    def moveZeroes(self, nums: List[int]) -> None:
        n = len(nums)
        left = 0  # 下一个非零数该放的位置

        for right in range(n):  # 依次检查每个元素
            if nums[right] != 0:
                nums[left], nums[right] = nums[right], nums[left]
                left += 1
