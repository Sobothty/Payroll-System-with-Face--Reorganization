from decimal import Decimal, ROUND_HALF_UP

from app.models import TaxBracket


def _decimal(value: float | int | Decimal | None) -> Decimal:
    if value is None:
        return Decimal("0.00")
    if isinstance(value, Decimal):
        return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_cambodia_tax(monthly_earnings: Decimal, tax_brackets: list[TaxBracket]) -> Decimal:
    if not tax_brackets or monthly_earnings <= 0:
        return Decimal("0.00")

    sorted_brackets = sorted(tax_brackets, key=lambda b: _decimal(b.min_salary))
    tax = Decimal("0.00")
    earnings = _decimal(monthly_earnings)

    for bracket in sorted_brackets:
        if not bracket.is_active:
            continue

        min_sal = _decimal(bracket.min_salary)
        max_sal = _decimal(bracket.max_salary) if bracket.max_salary else None
        rate = Decimal(str(bracket.tax_rate))

        if earnings <= min_sal:
            break

        if max_sal is None:
            taxable_in_bracket = earnings - min_sal
        else:
            taxable_in_bracket = min(earnings, max_sal) - min_sal

        tax += taxable_in_bracket * rate

    return tax.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
