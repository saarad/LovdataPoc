using Microsoft.Extensions.Options;
using System.Net.Http.Headers;

namespace LovdataPocApi.Infrastructure.Lovdata;

public static class LovdataServiceCollectionExtensions
{
    public static IServiceCollection AddLovdataClient(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<LovdataOptions>()
            .Bind(configuration.GetSection(LovdataOptions.SectionName))
            .Validate(options => Uri.TryCreate(options.BaseUrl, UriKind.Absolute, out _), "Lovdata:BaseUrl must be an absolute URL.")
            .ValidateOnStart();

        services.AddHttpClient<ILovdataClient, LovdataClient>((serviceProvider, client) =>
        {
            var options = serviceProvider.GetRequiredService<IOptions<LovdataOptions>>().Value;
            client.BaseAddress = new Uri(options.BaseUrl.TrimEnd('/') + "/", UriKind.Absolute);
            client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            if (!string.IsNullOrWhiteSpace(options.ApiKey))
            {
                client.DefaultRequestHeaders.Add("X-API-Key", options.ApiKey);
            }
        });

        return services;
    }
}
