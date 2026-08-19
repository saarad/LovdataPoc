namespace LovdataPocApi.Infrastructure.Lovdata;

/// <summary>
/// Application boundary for regulatory content. HMS features should depend on this
/// interface, not on the mock routes or HTTP details.
/// </summary>
public interface ILovdataClient
{
    Task<LovdataSearchResponse> SearchAsync(string query, int limit = 20, int offset = 0, CancellationToken cancellationToken = default);
    Task<LovdataDocument?> GetDocumentAsync(string dokId, CancellationToken cancellationToken = default);
    Task<LovdataDocumentIndex?> GetDocumentIndexAsync(string refId, CancellationToken cancellationToken = default);
    Task<LovdataRenderedDocument?> RenderDocumentAsync(string refId, CancellationToken cancellationToken = default);
}
