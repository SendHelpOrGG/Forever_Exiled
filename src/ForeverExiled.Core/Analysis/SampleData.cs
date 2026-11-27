using System.Text.Json;
using ForeverExiled.Core.Models;

namespace ForeverExiled.Core.Analysis;

/// <summary>
/// The bundled offline snapshot. It lets the app open with a fully populated UI on a
/// fresh machine (or while poe.ninja is rate-limiting) and is always labelled as sample
/// data in the shell so it can never be mistaken for a live pull.
/// </summary>
public static class SampleData
{
    private const string ResourceName = "ForeverExiled.Core.Resources.demo-snapshot.json";

    private static SnapshotDocument? _cached;

    public static SnapshotDocument Load()
    {
        if (_cached is not null)
        {
            return _cached;
        }

        var assembly = typeof(SampleData).Assembly;
        using var stream = assembly.GetManifestResourceStream(ResourceName);
        if (stream is null)
        {
            _cached = new SnapshotDocument
            {
                LeagueUrl = "sample",
                LeagueName = "Sample",
                Source = SnapshotDocument.SourceSample,
            };
            return _cached;
        }

        using var reader = new StreamReader(stream);
        var json = reader.ReadToEnd();
        var document = JsonSerializer.Deserialize<SnapshotDocument>(json, SnapshotStore.JsonOptions)
                       ?? new SnapshotDocument();
        document.Source = SnapshotDocument.SourceSample;
        _cached = document;
        return _cached;
    }

    public static SnapshotDocument LoadCopy()
    {
        var json = JsonSerializer.Serialize(Load(), SnapshotStore.JsonOptions);
        return JsonSerializer.Deserialize<SnapshotDocument>(json, SnapshotStore.JsonOptions)
               ?? new SnapshotDocument();
    }
}
