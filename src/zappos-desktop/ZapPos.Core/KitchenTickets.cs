namespace ZapPos.Core;

public sealed record KitchenLine(Guid LineId, Guid StationId, string ItemName, decimal Quantity, IReadOnlyList<string> Modifiers, string? Note);

public sealed record KitchenTicket(
    TicketKind Kind, string OrderNumber, Guid StationId, string? Table, int CounterNumber, DateTimeOffset At, IReadOnlyList<KitchenLine> Lines)
{
    /// <summary>Header line printed in large type: "#104", "ADD-ON to #104", "CANCEL #104", "REPRINT #104".</summary>
    public string Heading => Kind switch
    {
        TicketKind.New => OrderNumber,
        TicketKind.AddOn => $"ADD-ON to {OrderNumber}",
        TicketKind.Cancel => $"CANCEL {OrderNumber}",
        TicketKind.Reprint => $"REPRINT {OrderNumber}",
        _ => OrderNumber,
    };
}

/// <summary>
/// Splits the lines being sent into one ticket per kitchen station (grill, kitchen, drinks …), each with only
/// that station's items. All tickets of one send share the order's single number.
/// </summary>
public static class KitchenTickets
{
    public static IReadOnlyList<KitchenTicket> Split(
        TicketKind kind, string orderNumber, string? table, int counterNumber, DateTimeOffset at, IEnumerable<KitchenLine> lines) =>
        lines.GroupBy(l => l.StationId)
             .Select(g => new KitchenTicket(kind, orderNumber, g.Key, table, counterNumber, at, g.ToList()))
             .ToList();
}
