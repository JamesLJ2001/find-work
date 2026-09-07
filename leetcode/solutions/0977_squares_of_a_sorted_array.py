from typing import List


class Solution:
    def sortedSquares(self, nums: List[int]) -> List[int]:
        n = len(nums)
        ans = [0] * n

        left = 0
        right = n - 1

        for pos in range(n - 1, -1, -1):
            left_square = nums[left] * nums[left]
            right_square = nums[right] * nums[right]

            if left_square > right_square:
                ans[pos] = left_square
                left += 1
            else:
                ans[pos] = right_square
                right -= 1

        return ans
