using ForeverExiled.App.ViewModels;

namespace ForeverExiled.App.Views.Controls;

/// <summary>
/// The cluster jewel card. Built in code rather than XAML because every line comes from
/// <see cref="JewelCard"/> with its own colour and weight, and a flat list is far easier to
/// reason about than a nest of nested bindable layouts.
/// </summary>
public sealed class ClusterJewelCard : ContentView
{
    public static readonly BindableProperty CardProperty = BindableProperty.Create(
        nameof(Card),
        typeof(JewelCard),
        typeof(ClusterJewelCard),
        propertyChanged: (bindable, _, _) => ((ClusterJewelCard)bindable).Rebuild());

    private static readonly Color BandTop = Color.FromArgb("#7C6B33");
    private static readonly Color BandMiddle = Color.FromArgb("#4A3F1D");
    private static readonly Color BandBottom = Color.FromArgb("#2A2412");
    private static readonly Color CardBackground = Color.FromArgb("#08090A");
    private static readonly Color CardStroke = Color.FromArgb("#8D8B76");
    private static readonly Color DividerColor = Color.FromArgb("#4B4A40");

    public ClusterJewelCard()
    {
        WidthRequest = 292;
        InputTransparent = true;
    }

    public JewelCard? Card
    {
        get => (JewelCard?)GetValue(CardProperty);
        set => SetValue(CardProperty, value);
    }

    /// <summary>The mod tags a notable is gated by, as the same coloured chips the tables use.</summary>
    private static FlexLayout BuildTags(IReadOnlyList<TagChipItem> chips)
    {
        var row = new FlexLayout
        {
            Direction = FlexDirection.Row,
            Wrap = FlexWrap.Wrap,
            JustifyContent = FlexJustify.Center,
            Margin = new Thickness(0, 3, 0, 4),
        };

        foreach (var chip in chips)
        {
            row.Add(new Border
            {
                BackgroundColor = chip.TintColor,
                Stroke = chip.BorderColor,
                StrokeThickness = 1,
                StrokeShape = new RoundRectangle { CornerRadius = 3 },
                Padding = new Thickness(5, 0),
                Margin = new Thickness(2, 0),
                Content = new Label
                {
                    Text = chip.Label,
                    TextColor = chip.TextColor,
                    FontSize = 11.5,
                    FontFamily = "Segoe UI",
                },
            });
        }

        return row;
    }

    private void Rebuild()
    {
        if (Card is not { } card)
        {
            Content = null;
            return;
        }

        var body = new VerticalStackLayout { Spacing = 0, Padding = new Thickness(12, 8, 12, 9) };

        foreach (var line in card.Lines)
        {
            if (line.ShowDivider)
            {
                body.Add(new BoxView
                {
                    HeightRequest = 1,
                    Color = DividerColor,
                    Margin = new Thickness(0, 6),
                });
                continue;
            }

            if (line.IsTags)
            {
                body.Add(BuildTags(line.Chips));
                continue;
            }

            body.Add(new Label
            {
                Text = line.Text,
                TextColor = line.Color,
                FontSize = line.FontSize,
                FontAttributes = line.Attributes,
                FontFamily = "Palatino Linotype",
                HorizontalTextAlignment = TextAlignment.Center,
                LineBreakMode = LineBreakMode.WordWrap,
            });
        }

        if (card.HasIcon)
        {
            body.Add(new BoxView { HeightRequest = 1, Color = DividerColor, Margin = new Thickness(0, 8, 0, 4) });
            body.Add(new Image
            {
                Source = card.IconSource,
                WidthRequest = 34,
                HeightRequest = 34,
                Aspect = Aspect.AspectFit,
                HorizontalOptions = LayoutOptions.Center,
                Margin = new Thickness(0, 3, 0, 0),
            });
        }

        var band = new Grid { Padding = new Thickness(8, 7, 8, 9) };
        band.Background = new LinearGradientBrush(
            new GradientStopCollection
            {
                new GradientStop(BandTop, 0f),
                new GradientStop(BandMiddle, 0.46f),
                new GradientStop(BandBottom, 1f),
            },
            new Point(0, 0),
            new Point(0, 1));

        if (card.HasIcon)
        {
            var frame = new Border
            {
                Stroke = Color.FromArgb("#5C5643D8"),
                StrokeThickness = 1,
                BackgroundColor = Color.FromArgb("#6B000000"),
                WidthRequest = 34,
                HeightRequest = 34,
                StrokeShape = new RoundRectangle { CornerRadius = 17 },
                HorizontalOptions = LayoutOptions.Start,
                VerticalOptions = LayoutOptions.Center,
                Padding = 3,
                Content = new Image { Source = card.IconSource, Aspect = Aspect.AspectFit },
            };

            band.Add(frame);
        }

        var titles = new VerticalStackLayout
        {
            Spacing = 1,
            HorizontalOptions = LayoutOptions.Center,
            VerticalOptions = LayoutOptions.Center,
        };

        if (card.HasName)
        {
            titles.Add(new Label
            {
                Text = card.Name,
                TextColor = card.NameColor,
                FontSize = 18.5,
                FontAttributes = FontAttributes.Bold,
                FontFamily = "Palatino Linotype",
                HorizontalTextAlignment = TextAlignment.Center,
            });
        }

        titles.Add(new Label
        {
            Text = card.BaseType,
            TextColor = card.HasName ? Color.FromArgb("#F0EADD") : card.NameColor,
            FontSize = 15.5,
            FontAttributes = FontAttributes.Bold,
            FontFamily = "Palatino Linotype",
            HorizontalTextAlignment = TextAlignment.Center,
        });

        band.Add(titles);

        var shell = new VerticalStackLayout { Spacing = 0 };
        shell.Add(band);
        shell.Add(body);

        Content = new Border
        {
            BackgroundColor = CardBackground,
            Stroke = CardStroke,
            StrokeThickness = 1,
            StrokeShape = new RoundRectangle { CornerRadius = 2 },
            Padding = 0,
            Content = shell,
        };
    }
}
