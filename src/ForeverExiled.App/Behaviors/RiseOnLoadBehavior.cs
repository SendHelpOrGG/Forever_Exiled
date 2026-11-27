namespace ForeverExiled.App.Behaviors;

/// <summary>
/// Cards arrive rather than appear: a short fade with a small upward slide, staggered by
/// <see cref="Delay"/> down a list. Cheap by construction - it touches opacity and translation
/// only, and stops itself the moment the animation ends.
/// </summary>
public sealed class RiseOnLoadBehavior : Behavior<VisualElement>
{
    /// <summary>Milliseconds to wait before starting, so a list cascades instead of flashing.</summary>
    public int Delay { get; set; }

    protected override void OnAttachedTo(VisualElement bindable)
    {
        base.OnAttachedTo(bindable);

        bindable.Opacity = 0;
        bindable.TranslationY = 10;
        _ = PlayAsync(bindable);
    }

    protected override void OnDetachingFrom(VisualElement bindable)
    {
        base.OnDetachingFrom(bindable);

        bindable.Opacity = 1;
        bindable.TranslationY = 0;
    }

    private async Task PlayAsync(VisualElement view)
    {
        try
        {
            if (Delay > 0)
            {
                await Task.Delay(Delay);
            }

            await Task.WhenAll(
                view.FadeTo(1, 180, Easing.CubicOut),
                view.TranslateTo(0, 0, 220, Easing.CubicOut));
        }
        catch (Exception)
        {
            // a view torn down mid-animation is not an error
            view.Opacity = 1;
            view.TranslationY = 0;
        }
    }
}
