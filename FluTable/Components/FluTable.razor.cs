using Microsoft.AspNetCore.Components;

namespace FluTable.Components;

public partial class FluTable<TItem> : ComponentBase
{
    // ── Inline SVG icons (no external dependency) ─────────────────────
    private static readonly MarkupString IconAdd       = new("<svg width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" fill=\"none\"><path d=\"M8 3v10M3 8h10\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"/></svg>");
    private static readonly MarkupString IconDelete    = new("<svg width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" fill=\"none\"><path d=\"M3 4h10M6 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1M5 4v9a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V4\" stroke=\"currentColor\" stroke-width=\"1.25\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>");
    private static readonly MarkupString IconArrowUp   = new("<svg width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" fill=\"none\"><path d=\"M8 13V3M4 7l4-4 4 4\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>");
    private static readonly MarkupString IconArrowDown = new("<svg width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" fill=\"none\"><path d=\"M8 3v10M4 9l4 4 4-4\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>");

    // Data
    [Parameter] public List<TItem>             Items      { get; set; } = [];
    [Parameter] public RenderFragment?         ChildContent { get; set; }

    // Optional factory — if provided the grid handles add/insert internally
    [Parameter] public Func<TItem>?            NewRowFactory       { get; set; }

    // Selection indicator — e.g. r => r.IsSelected
    [Parameter] public Func<TItem, bool>?      IsSelectedSelector  { get; set; }

    // Callbacks for when no NewRowFactory is supplied
    [Parameter] public EventCallback           OnAddRow            { get; set; }
    [Parameter] public EventCallback<int>      OnInsertAt          { get; set; }
    [Parameter] public EventCallback<int>      OnDeleteRow         { get; set; }
    [Parameter] public EventCallback           OnDeleteSelected    { get; set; }

    private readonly List<FluTableColumn<TItem>> _columns  = [];
    private readonly string                     _tableId  = "ag-" + Guid.NewGuid().ToString("N")[..8];

    private bool _showRowActions = true;
    private bool ShowRowActions
    {
        get => _showRowActions;
        set { _showRowActions = value; }
    }

    private int _fontSize    = 14;
    private int _cellPadding = 4;
    private int _outerMargin = 0;

    private string WrapperStyle =>
        $"--ag-font-size:{_fontSize}px;--ag-cell-padding:{_cellPadding}px;--ag-margin:{_outerMargin}px";

    private bool HasSelection =>
        IsSelectedSelector is not null && Items.Any(IsSelectedSelector);

    // Called by FluTableColumn<TItem>.OnInitialized
    internal void RegisterColumn(FluTableColumn<TItem> col)
    {
        if (_columns.Contains(col)) return;
        _columns.Add(col);
        StateHasChanged();
    }

    internal void TriggerStateUpdate() => StateHasChanged();

    // ── Row operations ──────────────────────────────────────────────────────

    private Task HandleAddRow()
    {
        if (NewRowFactory is not null)
        {
            Items.Add(NewRowFactory());
            StateHasChanged();
            return Task.CompletedTask;
        }
        return OnAddRow.InvokeAsync();
    }

    private Task HandleInsertAbove(int index)
    {
        if (NewRowFactory is not null)
        {
            Items.Insert(index, NewRowFactory());
            StateHasChanged();
            return Task.CompletedTask;
        }
        return OnInsertAt.InvokeAsync(index);
    }

    private Task HandleInsertBelow(int index)
    {
        if (NewRowFactory is not null)
        {
            Items.Insert(index + 1, NewRowFactory());
            StateHasChanged();
            return Task.CompletedTask;
        }
        return OnInsertAt.InvokeAsync(index + 1);
    }

    private Task HandleDeleteRow(int index)
    {
        if (index >= 0 && index < Items.Count)
        {
            Items.RemoveAt(index);
            StateHasChanged();
        }
        return OnDeleteRow.HasDelegate ? OnDeleteRow.InvokeAsync(index) : Task.CompletedTask;
    }

    private Task HandleDeleteSelected()
    {
        if (IsSelectedSelector is not null)
        {
            Items.RemoveAll(item => IsSelectedSelector(item));
            StateHasChanged();
        }
        return OnDeleteSelected.HasDelegate ? OnDeleteSelected.InvokeAsync() : Task.CompletedTask;
    }
}
