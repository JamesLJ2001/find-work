from typing import List


class Solution:
    def partitionLabels(self, s: str) -> List[int]:
        # 每个字母最后出现的位置
        last = {}
        for i, ch in enumerate(s):
            last[ch] = i

        ans = []
        start = 0
        end = 0

        for i, ch in enumerate(s):
            # 当前段必须覆盖所有已遇到字母的最后位置
            end = max(end, last[ch])

            # 走到了当前段的最远边界，可以切分
            if i == end:
                ans.append(i - start + 1)
                start = i + 1

        return ans
