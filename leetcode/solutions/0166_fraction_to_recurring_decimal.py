class Solution:
    def fractionToDecimal(self, numerator: int, denominator: int) -> str:
        if numerator == 0:
            return "0"

        sign = "-" if (numerator < 0) ^ (denominator < 0) else ""
        numerator, denominator = abs(numerator), abs(denominator)

        integer, remainder = divmod(numerator, denominator)
        if remainder == 0:
            return sign + str(integer)

        digits = []
        seen = {}

        while remainder:
            if remainder in seen:
                start = seen[remainder]
                digits.insert(start, "(")
                digits.append(")")
                break

            seen[remainder] = len(digits)
            remainder *= 10
            digit, remainder = divmod(remainder, denominator)
            digits.append(str(digit))

        return sign + str(integer) + "." + "".join(digits)
