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
            // the lab is 470 + a centre column + a rail: 1180 left the centre with ~170px, so a
            // skill name had nowhere to go. The window now stops before the layout breaks.
            MinimumWidth = 1280,
            MinimumHeight = 760,
        };
    }
}
