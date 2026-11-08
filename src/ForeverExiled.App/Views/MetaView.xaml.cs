using ForeverExiled.App.ViewModels;

namespace ForeverExiled.App.Views;

public partial class MetaView : ContentView
{
    private const double CardOffsetX = 18;
    private const double CardOffsetY = 14;
    private const double CardWidth = 292;
    private const double CardHeight = 380;

    public MetaView() => InitializeComponent();

    private void OnJewelPointerEntered(object? sender, PointerEventArgs e) => ShowCard(sender, e);

    private void OnJewelPointerMoved(object? sender, PointerEventArgs e) => ShowCard(sender, e);

    private void OnJewelPointerExited(object? sender, PointerEventArgs e) =>
        (BindingContext as MainViewModel)?.HideItemCard();

    private void ShowCard(object? sender, PointerEventArgs e)
    {
        if (sender is not View { BindingContext: ComboItem item } || BindingContext is not MainViewModel viewModel)
        {
            return;
        }

        if (e.GetPosition(MetaRoot) is not { } point)
        {
            viewModel.HideItemCard();
            return;
        }

        var x = ItemCardPlacement.Place(point.X, CardOffsetX, MetaRoot.Width, CardWidth);
        var y = ItemCardPlacement.Place(point.Y, CardOffsetY, MetaRoot.Height, CardHeight);
        viewModel.ShowItemCard(item.ItemCard, x, y);
    }
}
