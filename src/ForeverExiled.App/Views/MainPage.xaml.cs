using ForeverExiled.App.ViewModels;

namespace ForeverExiled.App.Views;

public partial class MainPage : ContentPage
{
    private readonly MainViewModel _viewModel;

    public MainPage(MainViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = _viewModel = viewModel;
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();

        try
        {
            await _viewModel.InitializeAsync();
        }
        catch (Exception ex)
        {
            _viewModel.StatusMessage = "Startup error: " + ex.Message;
        }
    }
}
