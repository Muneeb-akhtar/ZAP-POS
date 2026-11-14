namespace ZapPos.Core;

/// <summary>
/// Which business day a moment belongs to, in Pakistan time (UTC+5, no daylight saving).
/// Restaurants often close after midnight, so the day starts at <c>dayStartHour</c> (default 4 AM):
/// an order at 1:30 AM on the 15th still belongs to the 14th. Order numbers restart per business day.
/// </summary>
public static class BusinessDay
{
    public static readonly TimeSpan PakistanOffset = TimeSpan.FromHours(5);

    public static DateOnly For(DateTimeOffset moment, int dayStartHour = 4)
    {
        if (dayStartHour is < 0 or > 12) throw new ArgumentOutOfRangeException(nameof(dayStartHour), "Day start must be between 0 and 12 (midnight to noon).");
        var local = moment.ToOffset(PakistanOffset).AddHours(-dayStartHour);
        return DateOnly.FromDateTime(local.DateTime);
    }
}
