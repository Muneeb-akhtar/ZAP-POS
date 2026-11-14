namespace ZapPos.Core;

public sealed record RecipePart(Guid IngredientId, decimal QuantityPerUnit);

/// <summary>
/// What a sale takes out of stock. A menu item with a recipe uses its ingredients (1 burger = 1 bun + 1 patty …);
/// an item without a recipe that is stock-tracked (a soft drink, a shirt) uses itself.
/// </summary>
public static class Recipes
{
    public static IReadOnlyDictionary<Guid, decimal> StockUse(
        IEnumerable<(Guid ItemId, decimal Quantity)> lines,
        IReadOnlyDictionary<Guid, IReadOnlyList<RecipePart>> recipes,
        IReadOnlySet<Guid> stockTrackedItems)
    {
        var use = new Dictionary<Guid, decimal>();
        foreach (var (itemId, quantity) in lines)
        {
            if (quantity <= 0) throw new ArgumentException("Quantities must be above zero; cancellations are separate records.");
            if (recipes.TryGetValue(itemId, out var parts) && parts.Count > 0)
            {
                foreach (var part in parts) Add(use, part.IngredientId, part.QuantityPerUnit * quantity);
            }
            else if (stockTrackedItems.Contains(itemId))
            {
                Add(use, itemId, quantity);
            }
        }
        return use;
    }

    private static void Add(Dictionary<Guid, decimal> use, Guid id, decimal qty) =>
        use[id] = Math.Round(use.GetValueOrDefault(id) + qty, 3, MidpointRounding.AwayFromZero);
}
