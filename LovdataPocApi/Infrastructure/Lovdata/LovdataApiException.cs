using System.Net;

namespace LovdataPocApi.Infrastructure.Lovdata;

public sealed class LovdataApiException(HttpStatusCode statusCode, string endpoint, string? detail = null)
    : Exception($"Lovdata request to '{endpoint}' failed with status {(int)statusCode}.{(string.IsNullOrWhiteSpace(detail) ? string.Empty : $" {detail}")}")
{
    public HttpStatusCode StatusCode { get; } = statusCode;
    public string Endpoint { get; } = endpoint;
}
