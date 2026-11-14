using System.Security.Cryptography;
using System.Text;

namespace ZapPos.Core;

/// <summary>
/// Hashing for staff PINs and owner passwords (PBKDF2-SHA256, random salt). Only the hash is stored.
/// Format: "pbkdf2-sha256$&lt;iterations&gt;$&lt;salt base64&gt;$&lt;hash base64&gt;".
/// </summary>
public static class Secrets
{
    private const int Iterations = 100_000, SaltBytes = 16, HashBytes = 32;
    private const string Scheme = "pbkdf2-sha256";

    public static bool IsValidPin(string? pin) => pin is { Length: >= 4 and <= 6 } && pin.All(char.IsAsciiDigit);
    public static bool IsValidPassword(string? password) => password is { Length: >= 8 and <= 128 };

    public static string Hash(string secret)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltBytes);
        var hash = Rfc2898DeriveBytes.Pbkdf2(Encoding.UTF8.GetBytes(secret), salt, Iterations, HashAlgorithmName.SHA256, HashBytes);
        return $"{Scheme}${Iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
    }

    public static bool Verify(string secret, string stored)
    {
        var parts = stored.Split('$');
        if (parts.Length != 4 || parts[0] != Scheme || !int.TryParse(parts[1], out var iterations) || iterations < 10_000) return false;
        byte[] salt, expected;
        try { salt = Convert.FromBase64String(parts[2]); expected = Convert.FromBase64String(parts[3]); }
        catch (FormatException) { return false; }
        var actual = Rfc2898DeriveBytes.Pbkdf2(Encoding.UTF8.GetBytes(secret), salt, iterations, HashAlgorithmName.SHA256, expected.Length);
        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }

    /// <summary>A random, URL-safe session token for a signed-in counter user.</summary>
    public static string NewToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    /// <summary>Tokens are stored hashed, so a copied database can't be used to sign in.</summary>
    public static string TokenHash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
