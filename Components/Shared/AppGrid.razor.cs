using Microsoft.AspNetCore.Components;

namespace FluentTable.Components.Shared;

public partial class AppGrid<TItem> : ComponentBase
{
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

    private readonly List<AppGridColumn<TItem>> _columns  = [];
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

    // Called by AppGridColumn<TItem>.OnInitialized
    internal void RegisterColumn(AppGridColumn<TItem> col)
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
