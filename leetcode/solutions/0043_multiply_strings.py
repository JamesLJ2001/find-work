class Solution:
    def multiply(self, num1: str, num2: str) -> str:
        if num1 == "0" or num2 == "0":
            return "0"

        m, n = len(num1), len(num2)
        result = [0] * (m + n)

        for i in range(m - 1, -1, -1):
            for j in range(n - 1, -1, -1):
                product = int(num1[i]) * int(num2[j])
                pos1 = i + j
                pos2 = i + j + 1

                total = product + result[pos2]
                result[pos2] = total % 10
                result[pos1] += total // 10

        answer = "".join(str(digit) for digit in result).lstrip("0")
        return answer or "0"
