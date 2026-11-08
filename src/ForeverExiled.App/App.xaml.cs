using Microsoft.Extensions.DependencyInjection;
using ForeverExiled.App.Views;

namespace ForeverExiled.App;

public partial class App : Application
{
    private readonly IServiceProvider _services;

    public App(IServiceProvider services)
    {
        InitializeComponent();
        _services = services;
        UserAppTheme = AppTheme.Dark;
    }

    protected override Window CreateWindow(IActivationState? activationState)
    {
        var page = _services.GetRequiredService<MainPage>();

        return new Window(page)
        {
            Title = "Forever Exiled — PoE 1 Cluster Meta",
            Width = 1500,
            Height = 920,
            MinimumWidth = 1180,
            MinimumHeight = 720,
        };
    }
}
