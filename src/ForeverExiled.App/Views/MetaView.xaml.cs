using ForeverExiled.App.ViewModels;

namespace ForeverExiled.App.Views;

public partial class MetaView : ContentView
{
    private const double CardOffsetX = 18;
    private const double CardOffsetY = 14;
    private const double CardWidth = 348;
    private const double CardHeightFallback = 380;

    private ComboItem? _hovered;

    private double _cardHeight;

    public MetaView() => InitializeComponent();

    private void OnJewelPointerEntered(object? sender, PointerEventArgs e) => ShowCard(sender, e);

    private void OnJewelPointerMoved(object? sender, PointerEventArgs e) => ShowCard(sender, e);

    private void OnJewelPointerExited(object? sender, PointerEventArgs e)
    {
        _hovered = null;
        (BindingContext as MainViewModel)?.HideItemCard();
    }

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

        if (!ReferenceEquals(item, _hovered))
        {
            _hovered = item;
            viewModel.ShowItemCard(item.ItemCard, 0, 0);
            _cardHeight = MeasureCard();
        }

        var x = ItemCardPlacement.Place(point.X, CardOffsetX, MetaRoot.Width, CardWidth);
        var y = ItemCardPlacement.PlaceVertical(point.Y, CardOffsetY, MetaRoot.Height, _cardHeight);
        viewModel.MoveItemCard(x, y);
    }

    private double MeasureCard()
    {
        if (ItemCardHost.Content is VisualElement card)
        {
            var measured = card.Measure(CardWidth, double.PositiveInfinity);
            if (measured.Request.Height > 0)
            {
                return measured.Request.Height;
            }
        }

        return CardHeightFallback;
    }
}
