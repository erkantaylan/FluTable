using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace FluentTable.Components.Shared;

public partial class AppGrid<TItem> : ComponentBase, IAsyncDisposable
{
    [Inject] private IJSRuntime JS { get; set; } = default!;

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
    private IJSObjectReference?                 _jsModule;
    private bool                                _needsJsInit;

    private bool HasSelection =>
        IsSelectedSelector is not null && Items.Any(IsSelectedSelector);

    // Called by AppGridColumn<TItem>.OnInitialized
    internal void RegisterColumn(AppGridColumn<TItem> col)
    {
        if (_columns.Contains(col)) return;
        _columns.Add(col);
        _needsJsInit = true;
        StateHasChanged();
    }

    internal void TriggerStateUpdate() => StateHasChanged();

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (firstRender || _needsJsInit)
        {
            _needsJsInit = false;
            _jsModule ??= await JS.InvokeAsync<IJSObjectReference>("import", "/app-grid.js");
            await _jsModule.InvokeVoidAsync("init", _tableId);
        }
    }

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

    public async ValueTask DisposeAsync()
    {
        if (_jsModule is not null)
            try { await _jsModule.DisposeAsync(); } catch { /* ignore dispose errors */ }
    }
}
