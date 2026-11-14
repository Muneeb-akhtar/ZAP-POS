using System.Text.RegularExpressions;

namespace ZapPos.Core;

/// <summary>
/// The numbers printed on paper. Only ZAP Server hands them out (one place, one sequence), so every
/// counter slip and kitchen ticket for an order shows the same number and two counters never clash.
/// </summary>
public static partial class Numbering
{
    /// <summary>Order / token number for kitchen tickets, the counter slip and pickup: "#104". Restarts each business day.</summary>
    public static string OrderNumber(int sequence) =>
        sequence > 0 ? $"#{sequence}" : throw new ArgumentOutOfRangeException(nameof(sequence));

    /// <summary>
    /// Order number given by a counter while the main PC is unreachable: "C2-07".
    /// Prefixed by the counter so it can never collide with another counter or the server sequence.
    /// </summary>
    public static string OfflineOrderNumber(int counterNumber, int sequence) =>
        counterNumber > 0 && sequence > 0 ? $"C{counterNumber}-{sequence:00}" : throw new ArgumentOutOfRangeException(nameof(sequence));

    /// <summary>Tax invoice number, one unbroken series per branch that never restarts: "GLB-2026-004512".</summary>
    public static string InvoiceNumber(string branchCode, int year, long sequence)
    {
        if (!IsValidBranchCode(branchCode)) throw new ArgumentException("Branch code must be 2–6 capital letters or digits, e.g. GLB.", nameof(branchCode));
        if (sequence <= 0) throw new ArgumentOutOfRangeException(nameof(sequence));
        return $"{branchCode}-{year}-{sequence:000000}";
    }

    public static bool IsValidBranchCode(string? code) => code is not null && BranchCodePattern().IsMatch(code);

    [GeneratedRegex("^[A-Z0-9]{2,6}$")]
    private static partial Regex BranchCodePattern();
}
