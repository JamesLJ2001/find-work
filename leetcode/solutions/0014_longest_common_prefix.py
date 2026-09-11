from typing import List


class Solution:
    def longestCommonPrefix(self, strs: List[str]) -> str:
        if not strs:
            return ""

        for i, ch in enumerate(strs[0]):
            for word in strs[1:]:
                if i >= len(word) or word[i] != ch:
                    return strs[0][:i]

        return strs[0]
