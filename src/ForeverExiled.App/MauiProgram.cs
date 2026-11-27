using Microsoft.Extensions.DependencyInjection;
using ForeverExiled.App.ViewModels;
using ForeverExiled.App.Views;
using ForeverExiled.Core.Analysis;
using ForeverExiled.Core.Net;
using Microsoft.Extensions.Logging;
using Microsoft.Maui.Storage;

namespace ForeverExiled.App;

public static class MauiProgram
{
    public static MauiApp CreateMauiApp()
    {
        var builder = MauiApp.CreateBuilder();

        builder.UseMauiApp<App>();

#if DEBUG
        builder.Logging.AddDebug();
#endif

        // ---- core services
        builder.Services.AddSingleton(_ => new PoeNinjaClient());
        builder.Services.AddSingleton(_ => new SnapshotStore(
            Path.Combine(FileSystem.Current.AppDataDirectory, "forever-exiled")));
        builder.Services.AddSingleton<SyncService>();
        builder.Services.AddSingleton<MetaAnalyzer>();

        // ---- mvvm
        builder.Services.AddSingleton<MainViewModel>();
        builder.Services.AddSingleton<MainPage>();

        return builder.Build();
    }
}
