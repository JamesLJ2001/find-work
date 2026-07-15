window.HOT100_SOLUTIONS = {
    1: String.raw`from typing import List


class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        # 哈希表保存已经见过的值；先查补数再写入，避免同一元素被使用两次
        index_by_value = {}

        for index, value in enumerate(nums):
            complement = target - value
            if complement in index_by_value:
                return [index_by_value[complement], index]
            index_by_value[value] = index

        return []`,

    49: String.raw`from collections import defaultdict
from typing import List


class Solution:
    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:
        groups = defaultdict(list)

        for word in strs:
            # 26 个字母的出现次数是异位词共享的唯一签名
            letter_counts = [0] * 26
            for character in word:
                letter_counts[ord(character) - ord("a")] += 1
            groups[tuple(letter_counts)].append(word)

        return list(groups.values())`,

    128: String.raw`from typing import List


class Solution:
    def longestConsecutive(self, nums: List[int]) -> int:
        values = set(nums)
        longest_length = 0

        for value in values:
            # 只从连续序列的起点向右扩展，保证每个数字最多参与一次扫描
            if value - 1 in values:
                continue

            current_value = value
            current_length = 1
            while current_value + 1 in values:
                current_value += 1
                current_length += 1

            longest_length = max(longest_length, current_length)

        return longest_length`,

    283: String.raw`from typing import List


class Solution:
    def moveZeroes(self, nums: List[int]) -> None:
        # write_index 之前始终是按原顺序压紧的全部非零元素
        write_index = 0

        for value in nums:
            if value != 0:
                nums[write_index] = value
                write_index += 1

        # 非零元素写完后，剩余位置统一补零
        while write_index < len(nums):
            nums[write_index] = 0
            write_index += 1`,

    11: String.raw`from typing import List


class Solution:
    def maxArea(self, height: List[int]) -> int:
        left = 0
        right = len(height) - 1
        best_area = 0

        while left < right:
            width = right - left
            current_height = min(height[left], height[right])
            best_area = max(best_area, width * current_height)

            # 面积受短板限制；移动长板不会突破当前高度，只能尝试替换短板
            if height[left] <= height[right]:
                left += 1
            else:
                right -= 1

        return best_area`,

    15: String.raw`from typing import List


class Solution:
    def threeSum(self, nums: List[int]) -> List[List[int]]:
        # 排序后固定第一个数，剩余两数可用相向双指针线性寻找
        nums.sort()
        triplets = []

        for first in range(len(nums) - 2):
            # 固定位置去重，避免产生相同三元组
            if first > 0 and nums[first] == nums[first - 1]:
                continue
            if nums[first] > 0:
                break

            left = first + 1
            right = len(nums) - 1
            while left < right:
                total = nums[first] + nums[left] + nums[right]
                if total < 0:
                    left += 1
                elif total > 0:
                    right -= 1
                else:
                    triplets.append([nums[first], nums[left], nums[right]])
                    left += 1
                    right -= 1
                    # 找到答案后两端都越过重复值
                    while left < right and nums[left] == nums[left - 1]:
                        left += 1
                    while left < right and nums[right] == nums[right + 1]:
                        right -= 1

        return triplets`,

    42: String.raw`from typing import List


class Solution:
    def trap(self, height: List[int]) -> int:
        left = 0
        right = len(height) - 1
        left_max = 0
        right_max = 0
        trapped_water = 0

        while left < right:
            # 较低一侧的水位已由该侧最大值确定，因此可以立即结算并向内移动
            if height[left] <= height[right]:
                left_max = max(left_max, height[left])
                trapped_water += left_max - height[left]
                left += 1
            else:
                right_max = max(right_max, height[right])
                trapped_water += right_max - height[right]
                right -= 1

        return trapped_water`,

    3: String.raw`class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        last_index = {}
        left = 0
        longest_length = 0

        for right, character in enumerate(s):
            # 窗口内出现重复字符时，左端直接跳到其上次位置之后
            if character in last_index and last_index[character] >= left:
                left = last_index[character] + 1
            last_index[character] = right
            longest_length = max(longest_length, right - left + 1)

        return longest_length`,

    438: String.raw`from typing import List


class Solution:
    def findAnagrams(self, s: str, p: str) -> List[int]:
        if len(p) > len(s):
            return []

        needed = [0] * 26
        window = [0] * 26
        for character in p:
            needed[ord(character) - ord("a")] += 1

        result = []
        window_size = len(p)
        for right, character in enumerate(s):
            # 每次加入右端并移出恰好相隔 window_size 的字符，维持定长窗口
            window[ord(character) - ord("a")] += 1

            if right >= window_size:
                outgoing = s[right - window_size]
                window[ord(outgoing) - ord("a")] -= 1

            if right >= window_size - 1 and window == needed:
                result.append(right - window_size + 1)

        return result`,

    76: String.raw`from collections import Counter, defaultdict


class Solution:
    def minWindow(self, s: str, t: str) -> str:
        if not s or not t:
            return ""

        needed = Counter(t)
        window = defaultdict(int)
        required_kinds = len(needed)
        formed_kinds = 0
        left = 0
        best_start = 0
        best_length = float("inf")

        for right, character in enumerate(s):
            window[character] += 1
            # 只有某类字符首次达到需求数量时，满足的字符种类才增加
            if character in needed and window[character] == needed[character]:
                formed_kinds += 1

            # 当前窗口已覆盖 t 时持续收缩，以得到以 right 结尾的最短可行窗口
            while formed_kinds == required_kinds:
                current_length = right - left + 1
                if current_length < best_length:
                    best_start = left
                    best_length = current_length

                outgoing = s[left]
                window[outgoing] -= 1
                if outgoing in needed and window[outgoing] < needed[outgoing]:
                    formed_kinds -= 1
                left += 1

        if best_length == float("inf"):
            return ""
        return s[best_start:best_start + best_length]`,

    560: String.raw`from collections import defaultdict
from typing import List


class Solution:
    def subarraySum(self, nums: List[int], k: int) -> int:
        prefix = defaultdict(int)
        # 空前缀出现一次，使从下标 0 开始且和为 k 的子数组也能被统计
        prefix[0] = 1
        prefix_sum = 0
        subarray_count = 0

        for value in nums:
            prefix_sum += value
            # 每个此前出现的 prefix_sum-k 都对应一个以当前位置结尾的答案
            subarray_count += prefix[prefix_sum - k]
            prefix[prefix_sum] += 1

        return subarray_count`,

    239: String.raw`from collections import deque
from typing import List


class Solution:
    def maxSlidingWindow(self, nums: List[int], k: int) -> List[int]:
        decreasing_indices = deque()
        maximums = []

        for right, value in enumerate(nums):
            # 队列中下标对应的值严格递减，队首始终是当前窗口最大值
            while decreasing_indices and nums[decreasing_indices[-1]] <= value:
                decreasing_indices.pop()
            decreasing_indices.append(right)

            left = right - k + 1
            # 过期下标必须在读取队首答案前移除
            if decreasing_indices[0] < left:
                decreasing_indices.popleft()

            if left >= 0:
                maximums.append(nums[decreasing_indices[0]])

        return maximums`,

    53: String.raw`from typing import List


class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        best_ending_here = nums[0]
        best_overall = nums[0]

        for value in nums[1:]:
            # 以前一位置结尾的和若拖累当前值，就从当前值重新开始子数组
            best_ending_here = max(value, best_ending_here + value)
            best_overall = max(best_overall, best_ending_here)

        return best_overall`,

    56: String.raw`from typing import List


class Solution:
    def merge(self, intervals: List[List[int]]) -> List[List[int]]:
        # 按左端点排序后，只需判断当前区间能否接到最后一个合并区间上
        intervals.sort()
        merged = []

        for start, end in intervals:
            if not merged or start > merged[-1][1]:
                merged.append([start, end])
            else:
                merged[-1][1] = max(merged[-1][1], end)

        return merged`,

    189: String.raw`from typing import List


class Solution:
    def rotate(self, nums: List[int], k: int) -> None:
        n = len(nums)
        # 轮转整圈等于不动，取模也保证后续分段边界有效
        k %= n

        # 整体反转改变顺序，再分别反转两段即可恢复各段内部顺序
        self._reverse(nums, 0, n - 1)
        self._reverse(nums, 0, k - 1)
        self._reverse(nums, k, n - 1)

    def _reverse(self, nums: List[int], left: int, right: int) -> None:
        while left < right:
            nums[left], nums[right] = nums[right], nums[left]
            left += 1
            right -= 1`,

    238: String.raw`from typing import List


class Solution:
    def productExceptSelf(self, nums: List[int]) -> List[int]:
        # 第一遍让 products[i] 保存 i 左侧所有元素的乘积
        products = [1] * len(nums)

        prefix_product = 1
        for index in range(len(nums)):
            products[index] = prefix_product
            prefix_product *= nums[index]

        # 第二遍用滚动后缀积补上右侧部分，从而不需要额外数组
        suffix_product = 1
        for index in range(len(nums) - 1, -1, -1):
            products[index] *= suffix_product
            suffix_product *= nums[index]

        return products`,

    41: String.raw`from typing import List


class Solution:
    def firstMissingPositive(self, nums: List[int]) -> int:
        n = len(nums)

        for index in range(n):
            # 有效正数 x 的归位位置是 x-1，循环交换直到当前位置无法继续归位
            while 1 <= nums[index] <= n:
                correct_index = nums[index] - 1
                # 目标位置已有相同值时停止，避免重复数字造成死循环
                if nums[correct_index] == nums[index]:
                    break
                nums[index], nums[correct_index] = nums[correct_index], nums[index]

        for index, value in enumerate(nums):
            if value != index + 1:
                return index + 1

        return n + 1`,

    73: String.raw`from typing import List


class Solution:
    def setZeroes(self, matrix: List[List[int]]) -> None:
        rows = len(matrix)
        columns = len(matrix[0])
        # 第一行和第一列将充当标记位，因此先单独保存它们原本是否含零
        first_row_has_zero = any(matrix[0][column] == 0 for column in range(columns))
        first_column_has_zero = any(matrix[row][0] == 0 for row in range(rows))

        # 内部元素为零时，只标记对应行首和列首，避免立刻扩散影响判断
        for row in range(1, rows):
            for column in range(1, columns):
                if matrix[row][column] == 0:
                    matrix[row][0] = 0
                    matrix[0][column] = 0

        for row in range(1, rows):
            for column in range(1, columns):
                if matrix[row][0] == 0 or matrix[0][column] == 0:
                    matrix[row][column] = 0

        # 最后再依据最初状态处理第一行、第一列，不能提前覆盖标记
        if first_row_has_zero:
            for column in range(columns):
                matrix[0][column] = 0

        if first_column_has_zero:
            for row in range(rows):
                matrix[row][0] = 0`,

    54: String.raw`from typing import List


class Solution:
    def spiralOrder(self, matrix: List[List[int]]) -> List[int]:
        top = 0
        bottom = len(matrix) - 1
        left = 0
        right = len(matrix[0]) - 1
        order = []

        # 每轮沿四条边遍历一圈，再把对应边界向内收缩
        while top <= bottom and left <= right:
            for column in range(left, right + 1):
                order.append(matrix[top][column])
            top += 1

            for row in range(top, bottom + 1):
                order.append(matrix[row][right])
            right -= 1

            # 单行或单列收缩后可能已越界，后两条边必须再次检查
            if top <= bottom:
                for column in range(right, left - 1, -1):
                    order.append(matrix[bottom][column])
                bottom -= 1

            if left <= right:
                for row in range(bottom, top - 1, -1):
                    order.append(matrix[row][left])
                left += 1

        return order`,

    48: String.raw`from typing import List


class Solution:
    def rotate(self, matrix: List[List[int]]) -> None:
        n = len(matrix)

        # 先沿主对角线转置，再反转每一行，等价于顺时针旋转 90 度
        for row in range(n):
            for column in range(row + 1, n):
                matrix[row][column], matrix[column][row] = (
                    matrix[column][row],
                    matrix[row][column],
                )

        for row in matrix:
            row.reverse()`,

    240: String.raw`from typing import List


class Solution:
    def searchMatrix(self, matrix: List[List[int]], target: int) -> bool:
        row = 0
        column = len(matrix[0]) - 1

        # 右上角同时具备向左变小、向下变大的单调性，每步可排除一行或一列
        while row < len(matrix) and column >= 0:
            value = matrix[row][column]
            if value == target:
                return True
            if value > target:
                column -= 1
            else:
                row += 1

        return False`,

    160: String.raw`from typing import Optional


# Definition for singly-linked list:
# class ListNode:
#     def __init__(self, x):
#         self.val = x
#         self.next = None

class Solution:
    def getIntersectionNode(
        self,
        headA: Optional[ListNode],
        headB: Optional[ListNode],
    ) -> Optional[ListNode]:
        pointer_a = headA
        pointer_b = headB

        # 两指针走完自身链表后切换到另一条，路程被补齐后会在交点或 None 相遇
        while pointer_a is not pointer_b:
            pointer_a = pointer_a.next if pointer_a else headB
            pointer_b = pointer_b.next if pointer_b else headA

        return pointer_a`,

    206: String.raw`from typing import Optional


# Definition for singly-linked list:
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next

class Solution:
    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        previous = None
        current = head

        while current:
            # 改写 current.next 前先保存后继，否则会丢失尚未反转的链表
            next_node = current.next
            current.next = previous
            previous = current
            current = next_node

        return previous`,

    234: String.raw`from typing import Optional


# Definition for singly-linked list:
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next

class Solution:
    def isPalindrome(self, head: Optional[ListNode]) -> bool:
        if not head or not head.next:
            return True

        slow = head
        fast = head
        # 快指针走两步、慢指针走一步，使 slow 停在前半段末尾
        while fast.next and fast.next.next:
            slow = slow.next
            fast = fast.next.next

        # 只反转后半段，随后从两端起点逐个比较
        second_half = self._reverse(slow.next)
        left = head
        right = second_half
        is_palindrome = True

        while right:
            if left.val != right.val:
                is_palindrome = False
                break
            left = left.next
            right = right.next

        # 判断结束后恢复原链表，避免给调用方留下结构副作用
        slow.next = self._reverse(second_half)
        return is_palindrome

    def _reverse(self, head: Optional[ListNode]) -> Optional[ListNode]:
        previous = None
        current = head

        while current:
            next_node = current.next
            current.next = previous
            previous = current
            current = next_node

        return previous`,

    141: String.raw`from typing import Optional


# Definition for singly-linked list:
# class ListNode:
#     def __init__(self, x):
#         self.val = x
#         self.next = None

class Solution:
    def hasCycle(self, head: Optional[ListNode]) -> bool:
        slow = head
        fast = head

        # 若存在环，快指针会在环内追上慢指针；无环时快指针先到链尾
        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next
            if slow is fast:
                return True

        return False`,

    142: String.raw`from typing import Optional


# Definition for singly-linked list:
# class ListNode:
#     def __init__(self, x):
#         self.val = x
#         self.next = None

class Solution:
    def detectCycle(self, head: Optional[ListNode]) -> Optional[ListNode]:
        slow = head
        fast = head

        # 第一阶段仅判断并找到环内相遇点；快指针到链尾则说明无环
        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next
            if slow is fast:
                break
        else:
            return None

        # 相遇后从链头与相遇点同速前进，两者再次相遇处就是环入口
        entry = head
        while entry is not slow:
            entry = entry.next
            slow = slow.next

        return entry`,

    21: String.raw`from typing import Optional


# Definition for singly-linked list:
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next

class Solution:
    def mergeTwoLists(
        self,
        list1: Optional[ListNode],
        list2: Optional[ListNode],
    ) -> Optional[ListNode]:
        # 哑节点统一处理结果链表的头节点，tail 始终指向已合并部分末尾
        dummy = ListNode()
        tail = dummy

        while list1 and list2:
            if list1.val <= list2.val:
                tail.next = list1
                list1 = list1.next
            else:
                tail.next = list2
                list2 = list2.next
            tail = tail.next

        tail.next = list1 if list1 else list2
        return dummy.next`,

    2: String.raw`from typing import Optional


# Definition for singly-linked list:
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next

class Solution:
    def addTwoNumbers(
        self,
        l1: Optional[ListNode],
        l2: Optional[ListNode],
    ) -> Optional[ListNode]:
        dummy = ListNode()
        tail = dummy
        carry = 0

        # carry 也作为循环条件，确保最高位产生的进位不会遗漏
        while l1 or l2 or carry:
            value1 = l1.val if l1 else 0
            value2 = l2.val if l2 else 0
            total = value1 + value2 + carry
            carry, digit = divmod(total, 10)

            tail.next = ListNode(digit)
            tail = tail.next
            l1 = l1.next if l1 else None
            l2 = l2.next if l2 else None

        return dummy.next`,

    19: String.raw`from typing import Optional


# Definition for singly-linked list:
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next

class Solution:
    def removeNthFromEnd(
        self,
        head: Optional[ListNode],
        n: int,
    ) -> Optional[ListNode]:
        dummy = ListNode(0, head)
        fast = dummy
        slow = dummy

        # fast 先走 n 步，之后与 slow 始终保持 n 个节点的间隔
        for _ in range(n):
            fast = fast.next

        # fast 到达末节点时，slow 恰好位于待删除节点的前一个位置
        while fast.next:
            fast = fast.next
            slow = slow.next

        slow.next = slow.next.next
        return dummy.next`,

    24: String.raw`from typing import Optional


# Definition for singly-linked list:
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next

class Solution:
    def swapPairs(self, head: Optional[ListNode]) -> Optional[ListNode]:
        dummy = ListNode(0, head)
        previous = dummy

        # previous 始终指向下一对节点之前，便于统一重连链表头和中间节点
        while previous.next and previous.next.next:
            first = previous.next
            second = first.next

            previous.next = second
            first.next = second.next
            second.next = first
            # 交换后 first 成为这一对的末尾，也是下一轮的前驱
            previous = first

        return dummy.next`,

    25: String.raw`from typing import Optional


# Definition for singly-linked list:
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next

class Solution:
    def reverseKGroup(
        self,
        head: Optional[ListNode],
        k: int,
    ) -> Optional[ListNode]:
        dummy = ListNode(0, head)
        group_previous = dummy

        while True:
            # 先确认剩余节点达到 k 个，不完整的一组保持原顺序
            group_end = self._find_kth(group_previous, k)
            if not group_end:
                break

            next_group = group_end.next
            # previous 从下一组开头起步，使反转后的组尾能直接接回后续链表
            previous = next_group
            current = group_previous.next

            while current is not next_group:
                next_node = current.next
                current.next = previous
                previous = current
                current = next_node

            # 原组首反转后变成组尾，下一轮从它继续寻找分组
            old_group_start = group_previous.next
            group_previous.next = group_end
            group_previous = old_group_start

        return dummy.next

    def _find_kth(self, start: ListNode, k: int) -> Optional[ListNode]:
        current = start
        for _ in range(k):
            current = current.next
            if not current:
                return None
        return current`,

    138: String.raw`from typing import Optional


# Definition for a Node:
# class Node:
#     def __init__(self, x: int, next=None, random=None):
#         self.val = int(x)
#         self.next = next
#         self.random = random

class Solution:
    def copyRandomList(self, head: Optional[Node]) -> Optional[Node]:
        if not head:
            return None

        copy_by_original = {}
        current = head
        # 第一遍只创建节点，建立“原节点到复制节点”的一一映射
        while current:
            copy_by_original[current] = Node(current.val)
            current = current.next

        # 第二遍借助映射连接 next 和 random，避免引用回原链表
        current = head
        while current:
            copied_node = copy_by_original[current]
            copied_node.next = copy_by_original.get(current.next)
            copied_node.random = copy_by_original.get(current.random)
            current = current.next

        return copy_by_original[head]`,

    148: String.raw`from typing import Optional


# Definition for singly-linked list:
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next

class Solution:
    def sortList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        if not head or not head.next:
            return head

        slow = head
        fast = head.next
        # 快慢指针找到左半段末尾，并断开链表形成两个独立子问题
        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next

        right_head = slow.next
        slow.next = None
        # 递归排序两半后线性归并，整体复杂度为 O(n log n)
        left = self.sortList(head)
        right = self.sortList(right_head)
        return self._merge(left, right)

    def _merge(
        self,
        left: Optional[ListNode],
        right: Optional[ListNode],
    ) -> Optional[ListNode]:
        dummy = ListNode()
        tail = dummy

        while left and right:
            if left.val <= right.val:
                tail.next = left
                left = left.next
            else:
                tail.next = right
                right = right.next
            tail = tail.next

        tail.next = left if left else right
        return dummy.next`,

    23: String.raw`import heapq
from typing import List, Optional


# Definition for singly-linked list:
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next

class Solution:
    def mergeKLists(
        self,
        lists: List[Optional[ListNode]],
    ) -> Optional[ListNode]:
        min_heap = []
        sequence = 0

        for head in lists:
            if head:
                # sequence 作为值相同时的稳定比较项，避免 Python 比较 ListNode
                heapq.heappush(min_heap, (head.val, sequence, head))
                sequence += 1

        dummy = ListNode()
        tail = dummy
        while min_heap:
            # 堆中始终只保留各链表当前最小的未合并节点
            _, _, node = heapq.heappop(min_heap)
            tail.next = node
            tail = tail.next

            if node.next:
                heapq.heappush(min_heap, (node.next.val, sequence, node.next))
                sequence += 1

        return dummy.next`,

    146: String.raw`class DoublyLinkedNode:
    def __init__(self, key: int = 0, value: int = 0):
        self.key = key
        self.value = value
        self.previous = None
        self.next = None


class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        # 哈希表负责 O(1) 定位，双向链表负责 O(1) 调整最近使用顺序
        self.node_by_key = {}
        self.head = DoublyLinkedNode()
        self.tail = DoublyLinkedNode()
        self.head.next = self.tail
        self.tail.previous = self.head

    def get(self, key: int) -> int:
        if key not in self.node_by_key:
            return -1

        node = self.node_by_key[key]
        # 每次访问都把节点移到头部，头部表示最近使用
        self._remove(node)
        self._add_to_front(node)
        return node.value

    def put(self, key: int, value: int) -> None:
        if key in self.node_by_key:
            node = self.node_by_key[key]
            node.value = value
            self._remove(node)
            self._add_to_front(node)
            return

        node = DoublyLinkedNode(key, value)
        self.node_by_key[key] = node
        self._add_to_front(node)

        if len(self.node_by_key) > self.capacity:
            # 尾哨兵之前的节点最久未使用，超出容量时淘汰它
            least_recent = self.tail.previous
            self._remove(least_recent)
            del self.node_by_key[least_recent.key]

    def _remove(self, node: DoublyLinkedNode) -> None:
        node.previous.next = node.next
        node.next.previous = node.previous

    def _add_to_front(self, node: DoublyLinkedNode) -> None:
        node.previous = self.head
        node.next = self.head.next
        self.head.next.previous = node
        self.head.next = node`,

    94: String.raw`from typing import List, Optional


# Definition for a binary tree node:
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right

class Solution:
    def inorderTraversal(self, root: Optional[TreeNode]) -> List[int]:
        values = []
        stack = []
        current = root

        # 栈中保存的是“左子树尚未处理完、稍后才访问”的祖先节点。
        while current or stack:
            # 一路向左到底，弹栈时自然得到“左—根—右”的顺序。
            while current:
                stack.append(current)
                current = current.left

            current = stack.pop()
            values.append(current.val)
            current = current.right

        return values`,

    104: String.raw`from typing import Optional


# Definition for a binary tree node:
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right

class Solution:
    def maxDepth(self, root: Optional[TreeNode]) -> int:
        if not root:
            return 0

        # 递归返回当前子树的高度，父节点只需取两侧较大值再加一。
        left_depth = self.maxDepth(root.left)
        right_depth = self.maxDepth(root.right)
        return 1 + max(left_depth, right_depth)`,

    226: String.raw`from typing import Optional


# Definition for a binary tree node:
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right

class Solution:
    def invertTree(self, root: Optional[TreeNode]) -> Optional[TreeNode]:
        if not root:
            return None

        # 先分别翻转原来的右、左子树，再把它们交换到相反位置。
        root.left, root.right = self.invertTree(root.right), self.invertTree(root.left)
        return root`,

    101: String.raw`from typing import Optional


# Definition for a binary tree node:
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right

class Solution:
    def isSymmetric(self, root: Optional[TreeNode]) -> bool:
        if not root:
            return True
        return self._is_mirror(root.left, root.right)

    def _is_mirror(
        self,
        left: Optional[TreeNode],
        right: Optional[TreeNode],
    ) -> bool:
        # 镜像位置必须同时为空或同时存在，不能只看某一侧。
        if not left or not right:
            return left is right
        if left.val != right.val:
            return False

        # 外侧与外侧、内侧与内侧成对比较，才是镜像关系。
        return (
            self._is_mirror(left.left, right.right)
            and self._is_mirror(left.right, right.left)
        )`,

    543: String.raw`from typing import Optional


# Definition for a binary tree node:
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right

class Solution:
    def diameterOfBinaryTree(self, root: Optional[TreeNode]) -> int:
        longest_diameter = 0

        def height(node: Optional[TreeNode]) -> int:
            nonlocal longest_diameter
            if not node:
                return 0

            # height 返回从当前节点向下延伸的最长单边长度（按节点数计）。
            left_height = height(node.left)
            right_height = height(node.right)
            # 经过当前节点的路径可同时使用左右两边，因此边数正好是两侧高度之和。
            longest_diameter = max(
                longest_diameter,
                left_height + right_height,
            )
            return 1 + max(left_height, right_height)

        height(root)
        return longest_diameter`,

    102: String.raw`from collections import deque
from typing import List, Optional


# Definition for a binary tree node:
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right

class Solution:
    def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:
        if not root:
            return []

        levels = []
        queue = deque([root])

        while queue:
            level = []
            # 本轮只消费开始时已有的节点，新入队节点统一留给下一层。
            for _ in range(len(queue)):
                node = queue.popleft()
                level.append(node.val)
                if node.left:
                    queue.append(node.left)
                if node.right:
                    queue.append(node.right)
            levels.append(level)

        return levels`,

    108: String.raw`from typing import List, Optional


# Definition for a binary tree node:
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right

class Solution:
    def sortedArrayToBST(self, nums: List[int]) -> Optional[TreeNode]:
        def build(left: int, right: int) -> Optional[TreeNode]:
            # 递归区间是闭区间 [left, right]，越界即为空子树。
            if left > right:
                return None

            # 选择中点作根，左右元素数量尽量接近，从而保持高度平衡。
            middle = left + (right - left) // 2
            root = TreeNode(nums[middle])
            root.left = build(left, middle - 1)
            root.right = build(middle + 1, right)
            return root

        return build(0, len(nums) - 1)`,

    98: String.raw`from typing import Optional


# Definition for a binary tree node:
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right

class Solution:
    def isValidBST(self, root: Optional[TreeNode]) -> bool:
        def validate(
            node: Optional[TreeNode],
            lower_bound: Optional[int],
            upper_bound: Optional[int],
        ) -> bool:
            if not node:
                return True
            # 上下界汇总了所有祖先的约束，而不只是检查父子节点。
            if lower_bound is not None and node.val <= lower_bound:
                return False
            if upper_bound is not None and node.val >= upper_bound:
                return False

            # BST 不允许等值：左子树收紧上界，右子树收紧下界。
            return (
                validate(node.left, lower_bound, node.val)
                and validate(node.right, node.val, upper_bound)
            )

        return validate(root, None, None)`,

    230: String.raw`from typing import Optional


# Definition for a binary tree node:
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right

class Solution:
    def kthSmallest(self, root: Optional[TreeNode], k: int) -> int:
        stack = []
        current = root

        # BST 的中序遍历值严格递增，第 k 次访问就是第 k 小。
        while current or stack:
            # 栈顶始终是下一批尚未访问节点中最小的候选者。
            while current:
                stack.append(current)
                current = current.left

            current = stack.pop()
            k -= 1
            if k == 0:
                return current.val
            current = current.right

        raise ValueError("k exceeds the number of nodes")`,

    199: String.raw`from collections import deque
from typing import List, Optional


# Definition for a binary tree node:
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right

class Solution:
    def rightSideView(self, root: Optional[TreeNode]) -> List[int]:
        if not root:
            return []

        visible_values = []
        queue = deque([root])

        while queue:
            level_size = len(queue)
            # 按从左到右的层序遍历，每层最后出队的节点就是右侧可见节点。
            for index in range(level_size):
                node = queue.popleft()
                if index == level_size - 1:
                    visible_values.append(node.val)
                if node.left:
                    queue.append(node.left)
                if node.right:
                    queue.append(node.right)

        return visible_values`,

    114: String.raw`from typing import Optional


# Definition for a binary tree node:
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right

class Solution:
    def flatten(self, root: Optional[TreeNode]) -> None:
        previous = None

        def visit(node: Optional[TreeNode]) -> None:
            nonlocal previous
            if not node:
                return

            # 按“右—左—根”逆序处理，previous 始终指向先序遍历中的后继。
            visit(node.right)
            visit(node.left)
            # 当前节点接到已展开链表的头部，并清空左指针满足题目结构。
            node.right = previous
            node.left = None
            previous = node

        visit(root)`,

    105: String.raw`from typing import List, Optional


# Definition for a binary tree node:
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right

class Solution:
    def buildTree(
        self,
        preorder: List[int],
        inorder: List[int],
    ) -> Optional[TreeNode]:
        # 哈希表把中序中的根定位从线性查找降为 O(1)。
        inorder_index = {value: index for index, value in enumerate(inorder)}
        preorder_index = 0

        def build(left: int, right: int) -> Optional[TreeNode]:
            nonlocal preorder_index
            if left > right:
                return None

            # 前序序列按“根—左—右”消费；当前指针总是本子树的根。
            root_value = preorder[preorder_index]
            preorder_index += 1
            root = TreeNode(root_value)
            middle = inorder_index[root_value]
            # 中序根位置切开左右子树，必须先构造左侧以匹配前序消费顺序。
            root.left = build(left, middle - 1)
            root.right = build(middle + 1, right)
            return root

        return build(0, len(inorder) - 1)`,

    437: String.raw`from collections import defaultdict
from typing import Optional


# Definition for a binary tree node:
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right

class Solution:
    def pathSum(self, root: Optional[TreeNode], targetSum: int) -> int:
        prefix = defaultdict(int)
        # 空路径前缀出现一次，才能统计从根节点开始且和恰为目标值的路径。
        prefix[0] = 1

        def dfs(node, cur):
            if not node:
                return 0

            cur += node.val
            # 若此前存在 cur - targetSum，两前缀之间的路径和就是目标值。
            path_count = prefix[cur - targetSum]
            # 先登记当前前缀，子节点才可以把当前节点作为路径起点之前的位置。
            prefix[cur] += 1

            path_count += dfs(node.left, cur)
            path_count += dfs(node.right, cur)

            # 回溯时撤销，保证 prefix 只记录当前根到节点这一条路径。
            prefix[cur] -= 1
            return path_count

        return dfs(root, 0)`,

    236: String.raw`from typing import Optional


# Definition for a binary tree node:
# class TreeNode:
#     def __init__(self, x):
#         self.val = x
#         self.left = None
#         self.right = None

class Solution:
    def lowestCommonAncestor(
        self,
        root: Optional[TreeNode],
        p: TreeNode,
        q: TreeNode,
    ) -> Optional[TreeNode]:
        # 找到 p 或 q 就向上返回该节点；空节点表示这一支没有目标。
        if not root or root is p or root is q:
            return root

        left_result = self.lowestCommonAncestor(root.left, p, q)
        right_result = self.lowestCommonAncestor(root.right, p, q)

        # 两侧各找到一个目标时，当前节点是它们第一次汇合的位置。
        if left_result and right_result:
            return root
        # 只有一侧非空时，把已找到的目标或公共祖先继续向上传递。
        return left_result if left_result else right_result`,

    124: String.raw`from typing import Optional


# Definition for a binary tree node:
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right

class Solution:
    def maxPathSum(self, root: Optional[TreeNode]) -> int:
        best_path_sum = float("-inf")

        def maximum_gain(node: Optional[TreeNode]) -> int:
            nonlocal best_path_sum
            if not node:
                return 0

            # 负贡献只会拉低路径和，等价于不选择该子树。
            left_gain = max(0, maximum_gain(node.left))
            right_gain = max(0, maximum_gain(node.right))
            # 更新全局答案时可以同时连接左右两支，形成经过当前节点的完整路径。
            path_through_node = node.val + left_gain + right_gain
            best_path_sum = max(best_path_sum, path_through_node)

            # 返回父节点的路径不能分叉，所以只能携带左右较大的一支。
            return node.val + max(left_gain, right_gain)

        maximum_gain(root)
        return best_path_sum`,

    200: String.raw`from typing import List


class Solution:
    def numIslands(self, grid: List[List[str]]) -> int:
        rows = len(grid)
        columns = len(grid[0])
        island_count = 0

        for row in range(rows):
            for column in range(columns):
                if grid[row][column] != "1":
                    continue

                # 每遇到一块未访问陆地，就发现了一个新的连通分量。
                island_count += 1
                grid[row][column] = "0"
                stack = [(row, column)]

                # 入栈时立即改为水，避免同一格被相邻陆地重复加入栈。
                while stack:
                    current_row, current_column = stack.pop()
                    for row_change, column_change in (
                        (1, 0),
                        (-1, 0),
                        (0, 1),
                        (0, -1),
                    ):
                        next_row = current_row + row_change
                        next_column = current_column + column_change
                        if (
                            0 <= next_row < rows
                            and 0 <= next_column < columns
                            and grid[next_row][next_column] == "1"
                        ):
                            grid[next_row][next_column] = "0"
                            stack.append((next_row, next_column))

        return island_count`,

    994: String.raw`from collections import deque
from typing import List


class Solution:
    def orangesRotting(self, grid: List[List[int]]) -> int:
        rows = len(grid)
        columns = len(grid[0])
        rotten_queue = deque()
        fresh_count = 0

        for row in range(rows):
            for column in range(columns):
                if grid[row][column] == 2:
                    rotten_queue.append((row, column))
                elif grid[row][column] == 1:
                    fresh_count += 1

        minutes = 0
        # 所有初始腐烂橘子同时入队，构成多源 BFS 的第 0 层。
        while rotten_queue and fresh_count > 0:
            # 一轮只扩散当前层，轮末加一分钟，保证时间与 BFS 层数一致。
            for _ in range(len(rotten_queue)):
                row, column = rotten_queue.popleft()
                for row_change, column_change in (
                    (1, 0),
                    (-1, 0),
                    (0, 1),
                    (0, -1),
                ):
                    next_row = row + row_change
                    next_column = column + column_change
                    if (
                        0 <= next_row < rows
                        and 0 <= next_column < columns
                        and grid[next_row][next_column] == 1
                    ):
                        grid[next_row][next_column] = 2
                        fresh_count -= 1
                        rotten_queue.append((next_row, next_column))
            minutes += 1

        # 队列耗尽后仍有新鲜橘子，说明它们与所有腐烂源都不连通。
        return minutes if fresh_count == 0 else -1`,

    207: String.raw`from collections import deque
from typing import List


class Solution:
    def canFinish(
        self,
        numCourses: int,
        prerequisites: List[List[int]],
    ) -> bool:
        graph = [[] for _ in range(numCourses)]
        indegree = [0] * numCourses

        for course, prerequisite in prerequisites:
            graph[prerequisite].append(course)
            indegree[course] += 1

        # 入度为 0 的课程没有未完成前置条件，可以立即学习。
        available = deque(
            course
            for course in range(numCourses)
            if indegree[course] == 0
        )
        completed_count = 0

        while available:
            prerequisite = available.popleft()
            completed_count += 1

            for course in graph[prerequisite]:
                # 移除已完成课程对应的边，新的零入度节点进入队列。
                indegree[course] -= 1
                if indegree[course] == 0:
                    available.append(course)

        # 有环时环内节点永远无法降到零入度，因此完成数会不足。
        return completed_count == numCourses`,

    208: String.raw`class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_word = False


class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        current = self.root
        # 每条边代表一个字符，共享路径自然复用了相同前缀。
        for character in word:
            if character not in current.children:
                current.children[character] = TrieNode()
            current = current.children[character]
        # 结束标记用于区分“完整单词”和“仅仅是某个单词的前缀”。
        current.is_word = True

    def search(self, word: str) -> bool:
        node = self._find_prefix(word)
        return node is not None and node.is_word

    def startsWith(self, prefix: str) -> bool:
        return self._find_prefix(prefix) is not None

    def _find_prefix(self, prefix: str):
        current = self.root
        for character in prefix:
            if character not in current.children:
                return None
            current = current.children[character]
        return current`,

    46: String.raw`from typing import List


class Solution:
    def permute(self, nums: List[int]) -> List[List[int]]:
        permutations = []
        path = []
        used = [False] * len(nums)

        def backtrack() -> None:
            # path 的层数表示已经确定了多少个位置，used 防止同一元素重复入选。
            if len(path) == len(nums):
                permutations.append(path.copy())
                return

            for index, value in enumerate(nums):
                if used[index]:
                    continue
                used[index] = True
                path.append(value)
                backtrack()
                # 撤销选择后，当前层才能尝试另一个元素放在同一位置。
                path.pop()
                used[index] = False

        backtrack()
        return permutations`,

    78: String.raw`from typing import List


class Solution:
    def subsets(self, nums: List[int]) -> List[List[int]]:
        all_subsets = []
        path = []

        def backtrack(start_index: int) -> None:
            # 回溯树的每个节点都对应一个合法子集，因此进入函数就收集答案。
            all_subsets.append(path.copy())

            # 只向后选择，既避免重复，也保证每个元素最多使用一次。
            for index in range(start_index, len(nums)):
                path.append(nums[index])
                backtrack(index + 1)
                path.pop()

        backtrack(0)
        return all_subsets`,

    17: String.raw`from typing import List


class Solution:
    def letterCombinations(self, digits: str) -> List[str]:
        if not digits:
            return []

        letters_by_digit = {
            "2": "abc",
            "3": "def",
            "4": "ghi",
            "5": "jkl",
            "6": "mno",
            "7": "pqrs",
            "8": "tuv",
            "9": "wxyz",
        }
        combinations = []
        path = []

        def backtrack(digit_index: int) -> None:
            # 每一层固定处理一个数字，递归深度就是已选字符数量。
            if digit_index == len(digits):
                combinations.append("".join(path))
                return

            # 当前数字的每个字母都是本层互斥的选择，返回后撤销再尝试下一个。
            for letter in letters_by_digit[digits[digit_index]]:
                path.append(letter)
                backtrack(digit_index + 1)
                path.pop()

        backtrack(0)
        return combinations`,

    39: String.raw`from typing import List


class Solution:
    def combinationSum(
        self,
        candidates: List[int],
        target: int,
    ) -> List[List[int]]:
        candidates.sort()
        combinations = []
        path = []

        def backtrack(start_index: int, remaining: int) -> None:
            if remaining == 0:
                combinations.append(path.copy())
                return

            # start_index 限制选择顺序，避免同一组合产生不同排列。
            for index in range(start_index, len(candidates)):
                value = candidates[index]
                # 数组已排序，当前值超出剩余目标时，后续值也都无需尝试。
                if value > remaining:
                    break
                path.append(value)
                # 继续传入 index，表示当前候选数可以重复使用。
                backtrack(index, remaining - value)
                path.pop()

        backtrack(0, target)
        return combinations`,

    22: String.raw`from typing import List


class Solution:
    def generateParenthesis(self, n: int) -> List[str]:
        combinations = []
        path = []

        def backtrack(open_count: int, close_count: int) -> None:
            if len(path) == 2 * n:
                combinations.append("".join(path))
                return

            # 左括号总数不能超过 n，它负责开启新的未闭合结构。
            if open_count < n:
                path.append("(")
                backtrack(open_count + 1, close_count)
                path.pop()

            # 只有已有未闭合左括号时才能放右括号，从源头剪掉非法前缀。
            if close_count < open_count:
                path.append(")")
                backtrack(open_count, close_count + 1)
                path.pop()

        backtrack(0, 0)
        return combinations`,

    79: String.raw`from typing import List


class Solution:
    def exist(self, board: List[List[str]], word: str) -> bool:
        rows = len(board)
        columns = len(board[0])

        def search(row: int, column: int, word_index: int) -> bool:
            # word_index 表示下一个待匹配字符，走到末尾说明整条路径成功。
            if word_index == len(word):
                return True
            if (
                row < 0
                or row >= rows
                or column < 0
                or column >= columns
                or board[row][column] != word[word_index]
            ):
                return False

            original_character = board[row][column]
            # 原地标记当前格，防止同一条搜索路径重复使用它。
            board[row][column] = "#"
            found = (
                search(row + 1, column, word_index + 1)
                or search(row - 1, column, word_index + 1)
                or search(row, column + 1, word_index + 1)
                or search(row, column - 1, word_index + 1)
            )
            # 回溯恢复棋盘，使其他起点或分支仍能使用该格。
            board[row][column] = original_character
            return found

        for row in range(rows):
            for column in range(columns):
                if search(row, column, 0):
                    return True

        return False`,

    131: String.raw`from typing import List


class Solution:
    def partition(self, s: str) -> List[List[str]]:
        n = len(s)
        is_palindrome = [[False] * n for _ in range(n)]

        # 先预处理所有回文区间，让回溯时的切片合法性判断降为 O(1)。
        for left in range(n - 1, -1, -1):
            for right in range(left, n):
                # 由内层区间推外层，所以 left 必须从右向左枚举。
                is_palindrome[left][right] = (
                    s[left] == s[right]
                    and (right - left <= 2 or is_palindrome[left + 1][right - 1])
                )

        partitions = []
        path = []

        def backtrack(start: int) -> None:
            # start 表示尚未分割的后缀起点，到达末尾才得到完整方案。
            if start == n:
                partitions.append(path.copy())
                return

            for end in range(start, n):
                if not is_palindrome[start][end]:
                    continue
                path.append(s[start:end + 1])
                backtrack(end + 1)
                path.pop()

        backtrack(0)
        return partitions`,

    51: String.raw`from typing import List


class Solution:
    def solveNQueens(self, n: int) -> List[List[str]]:
        solutions = []
        queen_column_by_row = [-1] * n
        used_columns = set()
        used_main_diagonals = set()
        used_anti_diagonals = set()

        def backtrack(row: int) -> None:
            # 每层只放当前行的一枚皇后，因此只需记录列和两类对角线冲突。
            if row == n:
                board = []
                for column in queen_column_by_row:
                    board.append("." * column + "Q" + "." * (n - column - 1))
                solutions.append(board)
                return

            for column in range(n):
                # 同一主对角线的 row-column 相等，同一副对角线的 row+column 相等。
                main_diagonal = row - column
                anti_diagonal = row + column
                if (
                    column in used_columns
                    or main_diagonal in used_main_diagonals
                    or anti_diagonal in used_anti_diagonals
                ):
                    continue

                queen_column_by_row[row] = column
                used_columns.add(column)
                used_main_diagonals.add(main_diagonal)
                used_anti_diagonals.add(anti_diagonal)

                backtrack(row + 1)

                # 撤销三类占用状态，让当前行继续尝试其他列。
                used_columns.remove(column)
                used_main_diagonals.remove(main_diagonal)
                used_anti_diagonals.remove(anti_diagonal)

        backtrack(0)
        return solutions`,

    35: String.raw`from typing import List


class Solution:
    def searchInsert(self, nums: List[int], target: int) -> int:
        left = 0
        right = len(nums)

        # 在左闭右开区间 [left, right) 中寻找第一个大于等于 target 的位置。
        while left < right:
            middle = left + (right - left) // 2
            if nums[middle] >= target:
                # middle 仍可能是答案，因此保留它并收缩右边界。
                right = middle
            else:
                left = middle + 1

        return left`,

    74: String.raw`from typing import List


class Solution:
    def searchMatrix(self, matrix: List[List[int]], target: int) -> bool:
        rows = len(matrix)
        columns = len(matrix[0])
        left = 0
        right = rows * columns

        # 利用行列单调性，把矩阵虚拟成一个有序的一维数组做左边界二分。
        while left < right:
            middle = left + (right - left) // 2
            # 商映射到行、余数映射到列，无需真的展开矩阵。
            value = matrix[middle // columns][middle % columns]
            if value >= target:
                right = middle
            else:
                left = middle + 1

        return (
            left < rows * columns
            and matrix[left // columns][left % columns] == target
        )`,

    34: String.raw`from typing import List


class Solution:
    def searchRange(self, nums: List[int], target: int) -> List[int]:
        # 第一次二分找第一个 >= target 的位置，先确认目标确实存在。
        first = self._lower_bound(nums, target)
        if first == len(nums) or nums[first] != target:
            return [-1, -1]

        # 第一个 >= target + 1 的位置就是目标区间的右侧开边界。
        after_last = self._lower_bound(nums, target + 1)
        return [first, after_last - 1]

    def _lower_bound(self, nums: List[int], target: int) -> int:
        left = 0
        right = len(nums)

        while left < right:
            middle = left + (right - left) // 2
            if nums[middle] >= target:
                right = middle
            else:
                left = middle + 1

        return left`,

    33: String.raw`from typing import List


class Solution:
    def search(self, nums: List[int], target: int) -> int:
        left = 0
        right = len(nums) - 1

        while left <= right:
            middle = left + (right - left) // 2
            if nums[middle] == target:
                return middle

            # 旋转数组被 middle 切开后，至少有一侧仍然有序。
            if nums[left] <= nums[middle]:
                # 目标落在左侧有序区间才收缩右边界，否则排除整段左侧。
                if nums[left] <= target < nums[middle]:
                    right = middle - 1
                else:
                    left = middle + 1
            else:
                # 左侧无序时右侧必有序，用同样的区间判断决定保留哪一半。
                if nums[middle] < target <= nums[right]:
                    left = middle + 1
                else:
                    right = middle - 1

        return -1`,

    153: String.raw`from typing import List


class Solution:
    def findMin(self, nums: List[int]) -> int:
        left = 0
        right = len(nums) - 1

        # 搜索区间始终包含最小值，并用最右元素判断 middle 位于哪一段。
        while left < right:
            middle = left + (right - left) // 2
            if nums[middle] > nums[right]:
                # middle 在较大的左段，最小值只能位于其右侧。
                left = middle + 1
            else:
                # middle 可能就是最小值，不能用 middle - 1 排除它。
                right = middle

        return nums[left]`,

    4: String.raw`from typing import List


class Solution:
    def findMedianSortedArrays(
        self,
        nums1: List[int],
        nums2: List[int],
    ) -> float:
        total_length = len(nums1) + len(nums2)

        # 中位数统一转化为寻找两个有序数组合并后的第 k 小元素。
        if total_length % 2 == 1:
            return float(self._find_kth(nums1, nums2, total_length // 2 + 1))

        left_middle = self._find_kth(nums1, nums2, total_length // 2)
        right_middle = self._find_kth(nums1, nums2, total_length // 2 + 1)
        return (left_middle + right_middle) / 2.0

    def _find_kth(self, nums1: List[int], nums2: List[int], k: int) -> int:
        index1 = 0
        index2 = 0

        while True:
            # 某个数组耗尽后，答案可直接在另一个数组的剩余部分定位。
            if index1 == len(nums1):
                return nums2[index2 + k - 1]
            if index2 == len(nums2):
                return nums1[index1 + k - 1]
            if k == 1:
                return min(nums1[index1], nums2[index2])

            half = k // 2
            candidate1 = min(index1 + half, len(nums1)) - 1
            candidate2 = min(index2 + half, len(nums2)) - 1

            # 较小候选值及其之前的元素不可能是当前第 k 小，可整段淘汰。
            if nums1[candidate1] <= nums2[candidate2]:
                removed = candidate1 - index1 + 1
                index1 = candidate1 + 1
            else:
                removed = candidate2 - index2 + 1
                index2 = candidate2 + 1
            # k 同步减去实际淘汰数量，维持“寻找剩余元素第 k 小”的不变量。
            k -= removed`,

    20: String.raw`class Solution:
    def isValid(self, s: str) -> bool:
        opening_for_closing = {
            ")": "(",
            "]": "[",
            "}": "{",
        }
        stack = []

        # 栈中只保留尚未匹配的左括号；右括号必须与栈顶成对。
        for bracket in s:
            if bracket not in opening_for_closing:
                stack.append(bracket)
            elif not stack or stack.pop() != opening_for_closing[bracket]:
                return False

        return not stack`,

    155: String.raw`class MinStack:
    def __init__(self):
        # 每个元素同时保存“压入它以后”的栈内最小值，使查询最小值保持 O(1)。
        self.stack = []

    def push(self, val: int) -> None:
        current_minimum = val if not self.stack else min(val, self.stack[-1][1])
        self.stack.append((val, current_minimum))

    def pop(self) -> None:
        self.stack.pop()

    def top(self) -> int:
        return self.stack[-1][0]

    def getMin(self) -> int:
        return self.stack[-1][1]`,

    394: String.raw`class Solution:
    def decodeString(self, s: str) -> str:
        stack = []
        current_text = []
        current_number = 0

        # 遇到左括号时保存外层文本和倍数，栈顶始终是当前层的父环境。
        for character in s:
            if character.isdigit():
                current_number = current_number * 10 + int(character)
            elif character == "[":
                stack.append((current_text, current_number))
                current_text = []
                current_number = 0
            elif character == "]":
                previous_text, repeat_count = stack.pop()
                current_text = previous_text + current_text * repeat_count
            else:
                current_text.append(character)

        return "".join(current_text)`,

    739: String.raw`from typing import List


class Solution:
    def dailyTemperatures(self, temperatures: List[int]) -> List[int]:
        wait_days = [0] * len(temperatures)
        decreasing_indices = []

        # 栈中是仍未找到更高温度的日期，温度从栈底到栈顶单调不增。
        for index, temperature in enumerate(temperatures):
            while (
                decreasing_indices
                and temperatures[decreasing_indices[-1]] < temperature
            ):
                previous_index = decreasing_indices.pop()
                wait_days[previous_index] = index - previous_index
            decreasing_indices.append(index)

        return wait_days`,

    84: String.raw`from typing import List


class Solution:
    def largestRectangleArea(self, heights: List[int]) -> int:
        # 栈内柱高单调递增，-1 是计算最左宽度时的边界哨兵。
        increasing_indices = [-1]
        maximum_area = 0

        for index in range(len(heights) + 1):
            current_height = 0 if index == len(heights) else heights[index]

            # 更矮柱出现时，出栈柱的左右第一个更矮位置都已确定。
            while (
                increasing_indices[-1] != -1
                and heights[increasing_indices[-1]] > current_height
            ):
                height = heights[increasing_indices.pop()]
                width = index - increasing_indices[-1] - 1
                maximum_area = max(maximum_area, height * width)

            increasing_indices.append(index)

        return maximum_area`,

    215: String.raw`import random
from typing import List


class Solution:
    def findKthLargest(self, nums: List[int], k: int) -> int:
        # 第 k 大等价于升序后的下标 len(nums) - k，只需定位而不必完整排序。
        target_index = len(nums) - k
        left = 0
        right = len(nums) - 1

        while left <= right:
            # 随机枢轴降低持续选到极端值的概率，三路划分还能一次跳过所有重复值。
            pivot_value = nums[random.randint(left, right)]
            equal_left, equal_right = self._three_way_partition(
                nums,
                left,
                right,
                pivot_value,
            )

            if target_index < equal_left:
                right = equal_left - 1
            elif target_index > equal_right:
                left = equal_right + 1
            else:
                return nums[target_index]

        raise ValueError("k is outside the valid range")

    def _three_way_partition(
        self,
        nums: List[int],
        left: int,
        right: int,
        pivot_value: int,
    ) -> tuple:
        smaller_end = left
        current = left
        larger_start = right

        # 循环中依次维护“小于枢轴 / 未处理 / 大于枢轴”三个区间。
        while current <= larger_start:
            if nums[current] < pivot_value:
                nums[smaller_end], nums[current] = nums[current], nums[smaller_end]
                smaller_end += 1
                current += 1
            elif nums[current] > pivot_value:
                nums[current], nums[larger_start] = nums[larger_start], nums[current]
                larger_start -= 1
            else:
                current += 1

        return smaller_end, larger_start`,

    347: String.raw`import heapq
from collections import Counter
from typing import List


class Solution:
    def topKFrequent(self, nums: List[int], k: int) -> List[int]:
        frequency = Counter(nums)
        # 小根堆只保留目前频率最高的 k 项，堆顶是其中最应该被淘汰的一项。
        min_heap = []

        for value, count in frequency.items():
            heapq.heappush(min_heap, (count, value))
            if len(min_heap) > k:
                heapq.heappop(min_heap)

        return [value for _, value in min_heap]`,

    295: String.raw`import heapq


class MedianFinder:
    def __init__(self):
        # 较小一半用负数模拟大根堆，较大一半使用小根堆。
        self.smaller_half = []
        self.larger_half = []

    def addNum(self, num: int) -> None:
        # 先经由左堆把分界处最大值送到右堆，保证左侧所有数都不大于右侧。
        heapq.heappush(self.smaller_half, -num)
        largest_smaller = -heapq.heappop(self.smaller_half)
        heapq.heappush(self.larger_half, largest_smaller)

        # 最终左堆最多只比右堆多一个元素，中位数因此始终位于两个堆顶。
        if len(self.larger_half) > len(self.smaller_half):
            smallest_larger = heapq.heappop(self.larger_half)
            heapq.heappush(self.smaller_half, -smallest_larger)

    def findMedian(self) -> float:
        if len(self.smaller_half) > len(self.larger_half):
            return float(-self.smaller_half[0])
        return (-self.smaller_half[0] + self.larger_half[0]) / 2.0`,

    121: String.raw`from typing import List


class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        # 最低价只来自当前日期之前，因此当前差价天然满足“先买后卖”。
        minimum_price = prices[0]
        maximum_profit = 0

        for price in prices[1:]:
            maximum_profit = max(maximum_profit, price - minimum_price)
            minimum_price = min(minimum_price, price)

        return maximum_profit`,

    55: String.raw`from typing import List


class Solution:
    def canJump(self, nums: List[int]) -> bool:
        # farthest_reachable 覆盖一个连续可达前缀；扫描位置一旦越界就无法再推进。
        farthest_reachable = 0

        for index, maximum_jump in enumerate(nums):
            if index > farthest_reachable:
                return False
            farthest_reachable = max(
                farthest_reachable,
                index + maximum_jump,
            )
            if farthest_reachable >= len(nums) - 1:
                return True

        return True`,

    45: String.raw`from typing import List


class Solution:
    def jump(self, nums: List[int]) -> int:
        jump_count = 0
        # current_end 是当前跳数能覆盖的边界，farthest_reachable 是下一层的边界。
        current_end = 0
        farthest_reachable = 0

        for index in range(len(nums) - 1):
            farthest_reachable = max(
                farthest_reachable,
                index + nums[index],
            )

            # 扫完当前覆盖层才增加一次跳跃，等价于对隐式图进行分层 BFS。
            if index == current_end:
                jump_count += 1
                current_end = farthest_reachable

        return jump_count`,

    763: String.raw`from typing import List


class Solution:
    def partitionLabels(self, s: str) -> List[int]:
        # 当前片段必须延伸到其中每个字符的最后位置；到达 end 才能安全切分。
        last_index = {character: index for index, character in enumerate(s)}
        partition_lengths = []
        start = 0
        end = 0

        for index, character in enumerate(s):
            end = max(end, last_index[character])
            if index == end:
                partition_lengths.append(end - start + 1)
                start = index + 1

        return partition_lengths`,

    70: String.raw`class Solution:
    def climbStairs(self, n: int) -> int:
        # 每级只能由前一级或前两级到达，用两个变量滚动保存相邻 DP 状态。
        previous = 1
        current = 1

        for _ in range(n):
            previous, current = current, previous + current

        return previous`,

    118: String.raw`from typing import List


class Solution:
    def generate(self, numRows: int) -> List[List[int]]:
        # 每行边界固定为 1，内部元素由上一行左上和右上两个状态相加得到。
        triangle = []

        for row_index in range(numRows):
            row = [1] * (row_index + 1)
            for column in range(1, row_index):
                row[column] = (
                    triangle[row_index - 1][column - 1]
                    + triangle[row_index - 1][column]
                )
            triangle.append(row)

        return triangle`,

    198: String.raw`from typing import List


class Solution:
    def rob(self, nums: List[int]) -> int:
        # 两个滚动状态分别表示 dp[i-2] 与 dp[i-1]，当前房屋只有“偷或不偷”。
        best_before_previous = 0
        best_through_previous = 0

        for money in nums:
            best_before_previous, best_through_previous = (
                best_through_previous,
                max(best_through_previous, best_before_previous + money),
            )

        return best_through_previous`,

    279: String.raw`class Solution:
    def numSquares(self, n: int) -> int:
        # minimum_count[total] 表示凑出 total 所需的最少完全平方数个数。
        minimum_count = [0] + [float("inf")] * n

        square = 1
        while square * square <= n:
            square_value = square * square
            # 容量正序遍历允许同一个平方数重复使用，这是完全背包的关键。
            for total in range(square_value, n + 1):
                minimum_count[total] = min(
                    minimum_count[total],
                    minimum_count[total - square_value] + 1,
                )
            square += 1

        return minimum_count[n]`,

    322: String.raw`from typing import List


class Solution:
    def coinChange(self, coins: List[int], amount: int) -> int:
        # minimum_coins[total] 表示凑成 total 的最少硬币数，哨兵值代表尚不可达。
        minimum_coins = [amount + 1] * (amount + 1)
        minimum_coins[0] = 0

        # 硬币可无限次使用，所以同一轮容量从小到大更新。
        for coin in coins:
            for total in range(coin, amount + 1):
                minimum_coins[total] = min(
                    minimum_coins[total],
                    minimum_coins[total - coin] + 1,
                )

        if minimum_coins[amount] == amount + 1:
            return -1
        return minimum_coins[amount]`,

    139: String.raw`from typing import List


class Solution:
    def wordBreak(self, s: str, wordDict: List[str]) -> bool:
        words = set(wordDict)
        maximum_word_length = max(map(len, words))
        # can_split[end] 表示前 end 个字符能否被完整拆分。
        can_split = [False] * (len(s) + 1)
        can_split[0] = True

        for end in range(1, len(s) + 1):
            # 只枚举可能形成字典单词的后缀长度，避免无意义的更长切分。
            earliest_start = max(0, end - maximum_word_length)
            for start in range(earliest_start, end):
                if can_split[start] and s[start:end] in words:
                    can_split[end] = True
                    break

        return can_split[len(s)]`,

    300: String.raw`from bisect import bisect_left
from typing import List


class Solution:
    def lengthOfLIS(self, nums: List[int]) -> int:
        # smallest_tail[i] 是长度为 i+1 的递增子序列可取得的最小末尾值。
        # 它未必是最终序列本身，但末尾越小，未来越容易继续延长。
        smallest_tail = []

        for value in nums:
            position = bisect_left(smallest_tail, value)
            if position == len(smallest_tail):
                smallest_tail.append(value)
            else:
                smallest_tail[position] = value

        return len(smallest_tail)`,

    152: String.raw`from typing import List


class Solution:
    def maxProduct(self, nums: List[int]) -> int:
        # 同时记录以当前位置结尾的最大积和最小积，因为负数会让二者互换角色。
        maximum_ending_here = nums[0]
        minimum_ending_here = nums[0]
        best_product = nums[0]

        for value in nums[1:]:
            # 乘负数前先交换，之后仍可用同一套“继续相乘或从当前值重启”的转移。
            if value < 0:
                maximum_ending_here, minimum_ending_here = (
                    minimum_ending_here,
                    maximum_ending_here,
                )

            maximum_ending_here = max(value, maximum_ending_here * value)
            minimum_ending_here = min(value, minimum_ending_here * value)
            best_product = max(best_product, maximum_ending_here)

        return best_product`,

    416: String.raw`from typing import List


class Solution:
    def canPartition(self, nums: List[int]) -> bool:
        total_sum = sum(nums)
        if total_sum % 2 == 1:
            return False

        target = total_sum // 2
        # reachable[s] 表示能否用已经处理过的数字恰好组成和 s。
        reachable = [False] * (target + 1)
        reachable[0] = True

        for value in nums:
            # 容量倒序保证本轮不会再次读取刚写入的状态，每个数只使用一次。
            for current_sum in range(target, value - 1, -1):
                reachable[current_sum] = (
                    reachable[current_sum]
                    or reachable[current_sum - value]
                )

        return reachable[target]`,

    32: String.raw`class Solution:
    def longestValidParentheses(self, s: str) -> int:
        # longest_ending_at[i] 只记录“恰好以 i 结尾”的最长有效括号长度。
        longest_ending_at = [0] * len(s)
        longest_length = 0

        for index in range(1, len(s)):
            if s[index] != ")":
                continue

            if s[index - 1] == "(":
                # 形如 ...()：当前这对括号可直接接到 i-2 结尾的有效段之后。
                previous_length = longest_ending_at[index - 2] if index >= 2 else 0
                longest_ending_at[index] = previous_length + 2
            else:
                # 形如 ...))：跨过前一段，寻找能与当前右括号配对的左括号。
                previous_length = longest_ending_at[index - 1]
                matching_index = index - previous_length - 1
                if matching_index >= 0 and s[matching_index] == "(":
                    earlier_length = (
                        longest_ending_at[matching_index - 1]
                        if matching_index >= 1
                        else 0
                    )
                    longest_ending_at[index] = previous_length + 2 + earlier_length

            longest_length = max(longest_length, longest_ending_at[index])

        return longest_length`,

    62: String.raw`class Solution:
    def uniquePaths(self, m: int, n: int) -> int:
        # 更新前 path_count[column] 来自上方，更新后的左邻项来自左方。
        path_count = [1] * n

        for _ in range(1, m):
            for column in range(1, n):
                path_count[column] += path_count[column - 1]

        return path_count[-1]`,

    64: String.raw`from typing import List


class Solution:
    def minPathSum(self, grid: List[List[int]]) -> int:
        rows = len(grid)
        columns = len(grid[0])
        # 一维数组滚动保存当前列的最小路径和；无穷大屏蔽首列不存在的左邻路径。
        minimum_sum = [float("inf")] * columns
        minimum_sum[0] = 0

        for row in range(rows):
            for column in range(columns):
                from_above = minimum_sum[column]
                from_left = minimum_sum[column - 1] if column > 0 else float("inf")
                minimum_sum[column] = grid[row][column] + min(from_above, from_left)

        return minimum_sum[-1]`,

    5: String.raw`class Solution:
    def longestPalindrome(self, s: str) -> str:
        best_start = 0
        best_length = 1

        # 回文串由中心决定；奇数长度和偶数长度分别使用一个中心或两个中心。
        def expand(left: int, right: int) -> None:
            nonlocal best_start, best_length

            while left >= 0 and right < len(s) and s[left] == s[right]:
                current_length = right - left + 1
                if current_length > best_length:
                    best_start = left
                    best_length = current_length
                left -= 1
                right += 1

        for center in range(len(s)):
            expand(center, center)
            expand(center, center + 1)

        return s[best_start:best_start + best_length]`,

    1143: String.raw`class Solution:
    def longestCommonSubsequence(self, text1: str, text2: str) -> int:
        rows = len(text1) + 1
        columns = len(text2) + 1
        # longest[row][column] 表示两个前缀 text1[:row] 与 text2[:column] 的 LCS 长度。
        longest = [[0] * columns for _ in range(rows)]

        for row in range(1, rows):
            for column in range(1, columns):
                if text1[row - 1] == text2[column - 1]:
                    # 末尾字符相同时共同接入；不同时舍弃一侧末尾并取较优状态。
                    longest[row][column] = longest[row - 1][column - 1] + 1
                else:
                    longest[row][column] = max(
                        longest[row - 1][column],
                        longest[row][column - 1],
                    )

        return longest[-1][-1]`,

    72: String.raw`class Solution:
    def minDistance(self, word1: str, word2: str) -> int:
        rows = len(word1) + 1
        columns = len(word2) + 1
        # distance[row][column] 表示 word1 的前 row 个字符转成 word2 前 column 个字符的代价。
        distance = [[0] * columns for _ in range(rows)]

        for row in range(rows):
            distance[row][0] = row
        for column in range(columns):
            distance[0][column] = column

        for row in range(1, rows):
            for column in range(1, columns):
                if word1[row - 1] == word2[column - 1]:
                    distance[row][column] = distance[row - 1][column - 1]
                else:
                    # 三个前驱依次对应删除、插入、替换，选择代价最小的一步。
                    distance[row][column] = 1 + min(
                        distance[row - 1][column],
                        distance[row][column - 1],
                        distance[row - 1][column - 1],
                    )

        return distance[-1][-1]`,

    136: String.raw`from typing import List


class Solution:
    def singleNumber(self, nums: List[int]) -> int:
        # 异或满足交换律且 x ^ x = 0，成对数字会抵消，只留下唯一值。
        unique_value = 0

        for value in nums:
            unique_value ^= value

        return unique_value`,

    169: String.raw`from typing import List


class Solution:
    def majorityElement(self, nums: List[int]) -> int:
        # 不同元素两两抵消后，出现次数超过一半的元素一定仍能成为最终候选者。
        candidate = None
        balance = 0

        for value in nums:
            if balance == 0:
                candidate = value
            balance += 1 if value == candidate else -1

        return candidate`,

    75: String.raw`from typing import List


class Solution:
    def sortColors(self, nums: List[int]) -> None:
        # 始终维护 [0, next_zero) 全是 0，(next_two, end] 全是 2。
        next_zero = 0
        current = 0
        next_two = len(nums) - 1

        while current <= next_two:
            if nums[current] == 0:
                nums[next_zero], nums[current] = nums[current], nums[next_zero]
                next_zero += 1
                current += 1
            elif nums[current] == 2:
                # 右侧换回来的数尚未检查，因此这里只收缩右边界，不移动 current。
                nums[current], nums[next_two] = nums[next_two], nums[current]
                next_two -= 1
            else:
                current += 1`,

    31: String.raw`from typing import List


class Solution:
    def nextPermutation(self, nums: List[int]) -> None:
        # 最长非递增后缀已经是该前缀下的最大排列，必须从它左侧寻找改小幅度的位置。
        pivot = len(nums) - 2
        while pivot >= 0 and nums[pivot] >= nums[pivot + 1]:
            pivot -= 1

        if pivot >= 0:
            # 后缀非递增，最右侧大于 pivot 的数就是能让字典序增幅最小的后继。
            successor = len(nums) - 1
            while nums[successor] <= nums[pivot]:
                successor -= 1
            nums[pivot], nums[successor] = nums[successor], nums[pivot]

        # 交换后将后缀反转为升序，得到严格大于原排列的最小结果。
        left = pivot + 1
        right = len(nums) - 1
        while left < right:
            nums[left], nums[right] = nums[right], nums[left]
            left += 1
            right -= 1`,

    287: String.raw`from typing import List


class Solution:
    def findDuplicate(self, nums: List[int]) -> int:
        # 把下标看作节点、nums[index] 看作下一节点；重复值会形成环的入口。
        slow = nums[0]
        fast = nums[0]

        while True:
            slow = nums[slow]
            fast = nums[nums[fast]]
            if slow == fast:
                break

        # 相遇后从起点与相遇点同步前进，二者再次相遇处就是环入口。
        entry = nums[0]
        while entry != slow:
            entry = nums[entry]
            slow = nums[slow]

        return entry`,
};
