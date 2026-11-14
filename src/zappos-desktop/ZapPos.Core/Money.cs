using System.Globalization;

namespace ZapPos.Core;

/// <summary>
/// An amount in Pakistani rupees, stored as whole paisa (1 rupee = 100 paisa) so sums never drift.
/// Screens usually show whole rupees; the database keeps paisa (needed for tax and per-kg items).
/// </summary>
public readonly record struct Money(long Paisa) : IComparable<Money>
{
    public static readonly Money Zero = new(0);

    public static Money FromRupees(decimal rupees) =>
        new((long)Math.Round(rupees * 100m, MidpointRounding.AwayFromZero));

    public decimal Rupees => Paisa / 100m;

    public static Money operator +(Money a, Money b) => new(checked(a.Paisa + b.Paisa));
    public static Money operator -(Money a, Money b) => new(checked(a.Paisa - b.Paisa));
    public static Money operator -(Money a) => new(-a.Paisa);
    public static bool operator <(Money a, Money b) => a.Paisa < b.Paisa;
    public static bool operator >(Money a, Money b) => a.Paisa > b.Paisa;
    public static bool operator <=(Money a, Money b) => a.Paisa <= b.Paisa;
    public static bool operator >=(Money a, Money b) => a.Paisa >= b.Paisa;

    /// <summary>Price × quantity (quantity may be fractional, e.g. 1.250 kg), rounded to the nearest paisa.</summary>
    public Money Times(decimal quantity) =>
        new((long)Math.Round(Paisa * quantity, MidpointRounding.AwayFromZero));

    /// <summary>A share in basis points (1700 = 17%), rounded to the nearest paisa.</summary>
    public Money Percent(int basisPoints) =>
        new((long)Math.Round(Paisa * basisPoints / 10_000m, MidpointRounding.AwayFromZero));

    /// <summary>Rounded to whole rupees (cash rounding), halves away from zero.</summary>
    public Money ToWholeRupees() =>
        new((long)Math.Round(Paisa / 100m, MidpointRounding.AwayFromZero) * 100);

    public int CompareTo(Money other) => Paisa.CompareTo(other.Paisa);

    /// <summary>"Rs 1,250" or "Rs 1,250.50" (paisa only when there are any).</summary>
    public override string ToString()
    {
        var culture = CultureInfo.InvariantCulture;
        var sign = Paisa < 0 ? "-" : "";
        var abs = Math.Abs(Rupees);
        var text = abs == decimal.Truncate(abs) ? abs.ToString("#,0", culture) : abs.ToString("#,0.00", culture);
        return $"{sign}Rs {text}";
    }
}
