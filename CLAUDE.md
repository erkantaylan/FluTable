# FluentTable Project

## Stack
- .NET 10, Blazor Web App (Server-side interactive), FluentUI Blazor v4.14
- Created from `fluentblazor` template (`dotnet new fluentblazor`)
- Single project (no Client/WASM split)

## Custom DataGrid Component

We built a fully custom generic DataGrid instead of using FluentDataGrid.
**Reason**: FluentDataGrid's resize JS stores all column sizes as pixels after first drag with no compensation mechanism, making it impossible to maintain 100% table width without patching its private JS state.

### Files

| File | Purpose |
|------|---------|
| `Components/Shared/AppGrid.razor` | Template — table structure, toolbar, row actions |
| `Components/Shared/AppGrid.razor.cs` | Code-behind — column registration, row ops, JS init |
| `Components/Shared/AppGrid.razor.css` | Scoped styles using FluentUI CSS tokens |
| `Components/Shared/AppGridColumn.razor` | Headless column definition, registers with parent via CascadingValue |
| `wwwroot/app-grid.js` | Column resize JS — percentage-based, maintains 100% width |

### How It Works

**Column registration**: `AppGridColumn<TItem>` renders nothing. On `OnInitialized` it calls `Grid.RegisterColumn(this)` via a `CascadingValue`. The grid re-renders once columns are registered (two-pass render, normal Blazor pattern).

**Resize logic** (`app-grid.js`):
- On first `init(tableId)`, reads each flex column's `clientWidth` and converts to `%` of table width
- On drag: increases dragged column `%`, decreases the next flex column `%` to compensate
- Total always = 100% — no MutationObserver hacks needed
- Fixed columns (`ag-col-fixed`) are excluded from resize math
- Uses `AbortController` for cleanup on re-init

**Column types**:
- Fixed/non-resizable: `Resizable="false"` or explicit `Width="40px"` → gets class `ag-col-fixed`, no resize handle
- Flex/resizable: default → gets class `ag-col-flex`, resize handle shown in header

### Usage

```razor
<AppGrid TItem="MyModel"
         Items="@_rows"
         NewRowFactory="@(() => new MyModel())"
         IsSelectedSelector="@(r => r.IsSelected)">

    <AppGridColumn TItem="MyModel" Header="" Width="40px" Resizable="false">
        <CellTemplate>
            <FluentCheckbox @bind-Value="context.IsSelected" />
        </CellTemplate>
    </AppGridColumn>

    <AppGridColumn TItem="MyModel" Header="Title">
        <CellTemplate>@context.Title</CellTemplate>
    </AppGridColumn>

    <AppGridColumn TItem="MyModel" Header="Notes" Multiline="true">
        <CellTemplate>@context.Notes</CellTemplate>
    </AppGridColumn>

    <AppGridColumn TItem="MyModel" Header="Date">
        <CellTemplate>@context.Date.ToString("yyyy-MM-dd")</CellTemplate>
    </AppGridColumn>

</AppGrid>
```

### Parameters — AppGrid

| Parameter | Type | Description |
|-----------|------|-------------|
| `Items` | `List<TItem>` | The data rows |
| `NewRowFactory` | `Func<TItem>?` | If provided, grid handles add/insert internally |
| `IsSelectedSelector` | `Func<TItem, bool>?` | Used to detect selection for "Delete Selected" button |
| `OnAddRow` | `EventCallback` | Fires when no `NewRowFactory` is set |
| `OnInsertAt` | `EventCallback<int>` | Fires insert at index when no factory |
| `OnDeleteRow` | `EventCallback<int>` | Fires after internal delete |
| `OnDeleteSelected` | `EventCallback` | Fires after internal delete selected |

### Parameters — AppGridColumn

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `Header` | `string` | required | Column header text |
| `Width` | `string?` | `null` | e.g. `"40px"` or `"20%"`. If null, distributed equally |
| `Resizable` | `bool` | `true` | Whether resize handle appears |
| `Multiline` | `bool` | `false` | `white-space: pre-wrap` on cells |
| `CellTemplate` | `RenderFragment<TItem>?` | — | Cell content |
| `HeaderTemplate` | `RenderFragment?` | — | Custom header content |

### Row Actions (built-in)
Each row shows three icon buttons on hover:
- **↑ Insert above** — inserts `NewRowFactory()` at `index`
- **↓ Insert below** — inserts `NewRowFactory()` at `index + 1`
- **Delete** — removes row at `index`

Toolbar shows:
- **Add Row** — appends `NewRowFactory()` to end
- **Delete Selected** — removes all rows where `IsSelectedSelector` returns true (only visible when selection exists)

## Current Home Page (`Components/Pages/Home.razor`)
- `@rendermode InteractiveServer`
- Uses `AppGrid<TableRow>` with 4 columns: checkbox, title, multiline notes, date
- 100 seed rows generated with `SeedData.Generate(100)` using `Random(42)`
- `NewRowFactory` provided so the grid manages add/insert/delete internally

## Known Decisions
- **No FluentDataGrid used** — replaced entirely with custom AppGrid
- **FluentUI Blazor v4.14 still installed** — used for `FluentCheckbox`, `FluentButton`, design tokens
- `ResizableColumns` parameter on `FluentDataGrid` does NOT exist on `TemplateColumn` or `PropertyColumn` in v4.14 (column-level, only grid-level)
- `MultiLine="true"` is the correct attribute for multiline cells in FluentDataGrid (if ever used again)
- `@rendermode InteractiveServer` required on pages that use JS interop

## Run & Build
```bash
make run      # dotnet run
make build    # dotnet build
make rider    # open in JetBrains Rider
```
