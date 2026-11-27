using Microsoft.Maui;
using Microsoft.Maui.Hosting;

namespace ForeverExiled.App.WinUI;

/// <summary>WinUI entry point for the desktop app (MAUI hosts the UI itself).</summary>
public partial class App : MauiWinUIApplication
{
    public App()
    {
        InitializeComponent();
    }

    protected override MauiApp CreateMauiApp() => MauiProgram.CreateMauiApp();
}
