from typing import List


class Solution:
    def searchMatrix(self, matrix: List[List[int]], target: int) -> bool:
        if not matrix or not matrix[0]:
            return False

        rows, columns = len(matrix), len(matrix[0])
        row, column = 0, columns - 1

        while row < rows and column >= 0:
            value = matrix[row][column]

            if value == target:
                return True
            if value > target:
                column -= 1
            else:
                row += 1

        return False
