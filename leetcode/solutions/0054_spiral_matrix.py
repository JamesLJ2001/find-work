from typing import List


class Solution:
    def spiralOrder(self, matrix: List[List[int]]) -> List[int]:
        if not matrix or not matrix[0]:
            return []

        top, bottom = 0, len(matrix) - 1
        left, right = 0, len(matrix[0]) - 1
        ans = []

        while top <= bottom and left <= right:
            for column in range(left, right + 1):
                ans.append(matrix[top][column])
            top += 1

            for row in range(top, bottom + 1):
                ans.append(matrix[row][right])
            right -= 1

            if top <= bottom:
                for column in range(right, left - 1, -1):
                    ans.append(matrix[bottom][column])
                bottom -= 1

            if left <= right:
                for row in range(bottom, top - 1, -1):
                    ans.append(matrix[row][left])
                left += 1

        return ans
