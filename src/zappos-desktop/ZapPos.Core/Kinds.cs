namespace ZapPos.Core;

// Values are stored in the database as lower-case text (see ZapPos.Server/Db/Migrations). Never renumber or rename.

public enum OrderKind { Retail, DineIn, Takeaway, Delivery }

/// <summary>Open = being taken; Sent = at least one line went to the kitchen; Paid and Voided are final.</summary>
public enum OrderStatus { Open, Sent, Paid, Voided }

/// <summary>Every change to stock is one of these movements; stock on hand = the sum of movements, never an overwritten total.</summary>
public enum StockMovementKind { Receive, Sale, KitchenUse, Waste, Adjust, TransferOut, TransferIn, Return }

public enum PaymentMethod { Cash, Card, JazzCash, Easypaisa, Bank, Other }

/// <summary>What a kitchen ticket is: a new order, items added later, a cancellation, or a reprint of an earlier ticket.</summary>
public enum TicketKind { New, AddOn, Cancel, Reprint }

public static class KindText
{
    public static string ToDb<T>(this T value) where T : struct, Enum => value.ToString().ToLowerInvariant();

    public static T Parse<T>(string text) where T : struct, Enum =>
        Enum.TryParse<T>(text, ignoreCase: true, out var v) && Enum.IsDefined(v)
            ? v
            : throw new ArgumentException($"'{text}' is not a valid {typeof(T).Name}.");
}
