from typing import List


class Solution:
    def findAnagrams(self, s: str, p: str) -> List[int]:
        if not p or len(p) > len(s):
            return []

        need = [0] * 26
        window = [0] * 26

        for ch in p:
            need[ord(ch) - ord("a")] += 1

        ans = []
        left = 0

        for right, ch in enumerate(s):
            window[ord(ch) - ord("a")] += 1

            if right - left + 1 > len(p):
                old = s[left]
                window[ord(old) - ord("a")] -= 1
                left += 1

            if window == need:
                ans.append(left)

        return ans
