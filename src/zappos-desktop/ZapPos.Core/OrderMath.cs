namespace ZapPos.Core;

public sealed record PricedLine(Money UnitPrice, decimal Quantity, Money ModifiersPerUnit, Money Discount)
{
    /// <summary>(unit price + modifiers) × quantity − line discount, never below zero.</summary>
    public Money Total
    {
        get
        {
            var gross = (UnitPrice + ModifiersPerUnit).Times(Quantity);
            var net = gross - Discount;
            return net < Money.Zero ? Money.Zero : net;
        }
    }
}

public sealed record OrderTotals(Money Subtotal, Money Discount, Money Tax, Money Rounding, Money Total);

/// <summary>
/// Bill arithmetic, kept in one place so the counter screen, the receipt and the server always agree.
/// Tax is a branch-level rate in basis points (e.g. 1600 = 16%), either added on top or already inside prices.
/// </summary>
public static class OrderMath
{
    public static OrderTotals Totals(IEnumerable<PricedLine> lines, Money orderDiscount, int taxBasisPoints, bool pricesIncludeTax, bool roundToRupee)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(taxBasisPoints);
        var subtotal = lines.Aggregate(Money.Zero, (sum, l) => sum + l.Total);
        var discount = orderDiscount > subtotal ? subtotal : orderDiscount;
        var afterDiscount = subtotal - discount;

        Money tax, beforeRounding;
        if (pricesIncludeTax)
        {
            // Tax already inside the price: tax = amount × rate / (1 + rate).
            tax = new Money((long)Math.Round(afterDiscount.Paisa * taxBasisPoints / (10_000m + taxBasisPoints), MidpointRounding.AwayFromZero));
            beforeRounding = afterDiscount;
        }
        else
        {
            tax = afterDiscount.Percent(taxBasisPoints);
            beforeRounding = afterDiscount + tax;
        }

        var total = roundToRupee ? beforeRounding.ToWholeRupees() : beforeRounding;
        return new OrderTotals(subtotal, discount, tax, total - beforeRounding, total);
    }

    /// <summary>Change to hand back; negative means the customer still owes money.</summary>
    public static Money Change(Money total, Money tendered) => tendered - total;
}
