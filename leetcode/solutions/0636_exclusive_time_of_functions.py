from typing import List


class Solution:
    def exclusiveTime(self, n: int, logs: List[str]) -> List[int]:
        ans = [0] * n
        stack = []
        prev = 0

        for log in logs:
            function_id, event, timestamp = log.split(":")
            function_id = int(function_id)
            timestamp = int(timestamp)

            if event == "start":
                if stack:
                    ans[stack[-1]] += timestamp - prev

                stack.append(function_id)
                prev = timestamp

            else:
                ans[stack.pop()] += timestamp - prev + 1
                prev = timestamp + 1

        return ans
