namespace ZapPos.Core;

public enum Role { Owner, Manager, Cashier, Waiter }

[Flags]
public enum Permission
{
    None = 0,
    TakeOrders = 1 << 0,
    TakePayment = 1 << 1,
    Reprint = 1 << 2,
    Void = 1 << 3,               // void a bill or cancel an order line
    CancelAfterCooking = 1 << 4, // cancel what the kitchen already started
    BigDiscount = 1 << 5,        // discount above the branch limit
    OpenDrawer = 1 << 6,         // open the cash drawer without a sale
    ManageItems = 1 << 7,        // items, menu, prices, recipes
    ManageStock = 1 << 8,        // receive, adjust, waste, transfers
    ManageUsers = 1 << 9,
    Reports = 1 << 10,
    Settings = 1 << 11,
}

/// <summary>
/// Who may do what. Checked on ZAP Server for every request (the counter app only hides buttons).
/// Actions a cashier can't do themselves are done with a manager's PIN at the counter.
/// </summary>
public static class Roles
{
    private const Permission CashierSet = Permission.TakeOrders | Permission.TakePayment | Permission.Reprint;
    private const Permission ManagerSet = CashierSet | Permission.Void | Permission.CancelAfterCooking | Permission.BigDiscount
        | Permission.OpenDrawer | Permission.ManageItems | Permission.ManageStock | Permission.Reports;

    public static Permission PermissionsOf(Role role) => role switch
    {
        Role.Owner => ManagerSet | Permission.ManageUsers | Permission.Settings,
        Role.Manager => ManagerSet,
        Role.Cashier => CashierSet,
        Role.Waiter => Permission.TakeOrders,
        _ => Permission.None,
    };

    public static bool Can(Role role, Permission permission) => (PermissionsOf(role) & permission) == permission;
}
