namespace LovdataPocApi.Infrastructure.Lovdata;

public sealed class LovdataOptions
{
    public const string SectionName = "Lovdata";

    /// <summary>Base address of either the local mock or the real Lovdata API.</summary>
    public required string BaseUrl { get; init; }

    /// <summary>Optional API key. Keep real keys in App Service settings or user secrets, never source control.</summary>
    public string? ApiKey { get; init; }
}
