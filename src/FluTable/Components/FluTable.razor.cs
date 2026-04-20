using Microsoft.AspNetCore.Components;

namespace FluTable.Components;

public partial class FluTable<TItem> : ComponentBase
{
    // ── Inline SVG icons (row-hover actions) ──────────────────────────
    private static readonly MarkupString IconDelete    = new("<svg width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" fill=\"none\"><path d=\"M3 4h10M6 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1M5 4v9a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V4\" stroke=\"currentColor\" stroke-width=\"1.25\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>");
    private static readonly MarkupString IconArrowUp   = new("<svg width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" fill=\"none\"><path d=\"M8 13V3M4 7l4-4 4 4\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>");
    private static readonly MarkupString IconArrowDown = new("<svg width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" fill=\"none\"><path d=\"M8 3v10M4 9l4 4 4-4\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>");

    [Parameter] public List<TItem>         Items          { get; set; } = [];
    [Parameter] public RenderFragment?     ChildContent   { get; set; }
    [Parameter] public RenderFragment?     EmptyContent   { get; set; }

    // When provided, row-hover insert/delete buttons mutate Items directly.
    // When null, the grid falls back to the OnInsertAt/OnDeleteRow callbacks.
    [Parameter] public Func<TItem>?        NewRowFactory  { get; set; }

    [Parameter] public bool                ShowRowActions { get; set; } = true;

    [Parameter] public EventCallback<int>  OnInsertAt     { get; set; }
    [Parameter] public EventCallback<int>  OnDeleteRow    { get; set; }

    private readonly List<FluTableColumn<TItem>> _columns = [];
    private readonly string                      _tableId = "ag-" + Guid.NewGuid().ToString("N")[..8];

    // ── Sort state ──────────────────────────────────────────────────────────
    // null column = no sort (source order). Third click clears.
    private FluTableColumn<TItem>? _sortCol;
    private bool                   _sortAsc;

    // Called by FluTableColumn<TItem>.OnInitialized
    internal void RegisterColumn(FluTableColumn<TItem> col)
    {
        if (_columns.Contains(col)) return;
        _columns.Add(col);
        StateHasChanged();
    }

    private void HandleHeaderClick(FluTableColumn<TItem> col)
    {
        if (!col.Sortable) return;

        if (_sortCol != col)
        {
            _sortCol = col;
            _sortAsc = true;
        }
        else if (_sortAsc)
        {
            _sortAsc = false;
        }
        else
        {
            _sortCol = null;
        }
    }

    private string SortAria(FluTableColumn<TItem> col)
    {
        if (!col.Sortable) return "none";
        if (_sortCol != col) return "none";
        return _sortAsc ? "ascending" : "descending";
    }

    private IReadOnlyList<TItem> GetDisplayItems()
    {
        if (_sortCol is null) return Items;

        var col = _sortCol;

        if (col.Comparer is not null)
        {
            var sorted = new List<TItem>(Items);
            sorted.Sort(col.Comparer);
            if (!_sortAsc) sorted.Reverse();
            return sorted;
        }

        var sortBy = col.SortBy!;
        var cmp    = Comparer<object?>.Create((a, b) =>
        {
            if (a is null && b is null) return 0;
            if (a is null) return -1;
            if (b is null) return 1;
            if (a is IComparable ca) return ca.CompareTo(b);
            return string.Compare(a.ToString(), b.ToString(), StringComparison.Ordinal);
        });

        return _sortAsc
            ? Items.OrderBy(sortBy, cmp).ToList()
            : Items.OrderByDescending(sortBy, cmp).ToList();
    }

    // ── Row-hover actions ───────────────────────────────────────────────────
    // Row actions operate on indices into the source Items list. When sorting
    // is active, templates pass the source index (not the display index).

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
}
