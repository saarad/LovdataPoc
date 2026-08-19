using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace LovdataPocApi.Infrastructure.Lovdata;

public sealed class LovdataClient(HttpClient httpClient, ILogger<LovdataClient> logger) : ILovdataClient
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<LovdataSearchResponse> SearchAsync(string query, int limit = 20, int offset = 0, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(query);
        var endpoint = $"v1/search?query={Uri.EscapeDataString(query)}&limit={Math.Clamp(limit, 1, 100)}&offset={Math.Max(offset, 0)}";
        return await GetRequiredAsync<LovdataSearchResponse>(endpoint, cancellationToken);
    }

    public Task<LovdataDocument?> GetDocumentAsync(string dokId, CancellationToken cancellationToken = default) =>
        GetOrNullAsync<LovdataDocument>($"documentMeta?dokID={Uri.EscapeDataString(dokId)}", cancellationToken);

    public Task<LovdataDocumentIndex?> GetDocumentIndexAsync(string refId, CancellationToken cancellationToken = default) =>
        GetOrNullAsync<LovdataDocumentIndex>($"documentIndex?refID={Uri.EscapeDataString(refId)}", cancellationToken);

    public Task<LovdataRenderedDocument?> RenderDocumentAsync(string refId, CancellationToken cancellationToken = default) =>
        GetOrNullAsync<LovdataRenderedDocument>($"renderRefID?refID={Uri.EscapeDataString(refId)}&format=json", cancellationToken);

    private async Task<T> GetRequiredAsync<T>(string endpoint, CancellationToken cancellationToken)
    {
        var result = await GetOrNullAsync<T>(endpoint, cancellationToken);
        return result ?? throw new LovdataApiException(HttpStatusCode.NotFound, endpoint);
    }

    private async Task<T?> GetOrNullAsync<T>(string endpoint, CancellationToken cancellationToken)
    {
        using var response = await httpClient.GetAsync(endpoint, cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return default;
        }

        if (!response.IsSuccessStatusCode)
        {
            var detail = await response.Content.ReadAsStringAsync(cancellationToken);
            logger.LogWarning("Lovdata request to {Endpoint} failed with {StatusCode}", endpoint, (int)response.StatusCode);
            throw new LovdataApiException(response.StatusCode, endpoint, detail);
        }

        return await response.Content.ReadFromJsonAsync<T>(JsonOptions, cancellationToken)
            ?? throw new LovdataApiException(response.StatusCode, endpoint, "Response did not contain JSON.");
    }
}
