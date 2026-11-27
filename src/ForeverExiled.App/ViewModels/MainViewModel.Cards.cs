using CommunityToolkit.Mvvm.ComponentModel;

namespace ForeverExiled.App.ViewModels;

/// <summary>
/// The hover card: one floating cluster jewel card, positioned in the coordinates of whichever
/// view is being hovered. Kept on the main view model because both the Cluster Lab and the Meta
/// tab show cluster jewels and share the single card.
/// </summary>
public partial class MainViewModel
{
    /// <summary>The jewel under the pointer, or null when nothing is hovered.</summary>
    [ObservableProperty]
    private JewelCard? _itemCard;

    [ObservableProperty]
    private bool _isItemCardVisible;

    [ObservableProperty]
    private double _itemCardX;

    [ObservableProperty]
    private double _itemCardY;

    public void ShowItemCard(JewelCard? card, double x, double y)
    {
        if (card is null)
        {
            HideItemCard();
            return;
        }

        ItemCard = card;
        ItemCardX = x;
        ItemCardY = y;
        IsItemCardVisible = true;
    }

    public void MoveItemCard(double x, double y)
    {
        if (!IsItemCardVisible)
        {
            return;
        }

        ItemCardX = x;
        ItemCardY = y;
    }

    public void HideItemCard()
    {
        if (IsItemCardVisible)
        {
            IsItemCardVisible = false;
        }
    }
}
