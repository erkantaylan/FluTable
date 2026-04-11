# FluTable Project

## Stack
- .NET 10, Blazor Web App (Server-side interactive), FluentUI Blazor v4.14
- Two projects:
  - **FluTable** (`FluTable/FluTable.csproj`) — standalone Razor Class Library, the grid component
  - **FluTable.Demo** (`FluTable.Demo.csproj`) — the demo app that consumes the library

## Custom DataGrid Component

We built a fully custom generic DataGrid instead of using FluentDataGrid.
**Reason**: FluentDataGrid's resize JS stores all column sizes as pixels after first drag with no compensation mechanism, making it impossible to maintain 100% table width without patching its private JS state.

### Files

| File | Purpose |
|------|---------|
| `FluTable/Components/FluTable.razor` | Template — table structure, toolbar, row actions |
| `FluTable/Components/FluTable.razor.cs` | Code-behind — column registration, row ops |
| `FluTable/Components/FluTable.razor.css` | Scoped styles using FluentUI CSS tokens |
| `FluTable/Components/FluTableColumn.razor` | Headless column definition, registers with parent via CascadingValue |
| `FluTable/wwwroot/app-grid.js` | Column resize JS — percentage-based, maintains 100% width |

### How It Works

**Column registration**: `FluTableColumn<TItem>` renders nothing. On `OnInitialized` it calls `Grid.RegisterColumn(this)` via a `CascadingValue`. The grid re-renders once columns are registered (two-pass render, normal Blazor pattern).

**Resize logic** (`app-grid.js`):
- On first init, reads each flex column's `clientWidth` and converts to `%` of table width
- On drag: increases dragged column `%`, decreases the next flex column `%` to compensate
- On double-click resize handle: auto-fits the column to its natural content width, then compensates from the next flex column
- Total always = 100% — no MutationObserver hacks needed
- Fixed columns (`ag-col-fixed`) are excluded from resize math
- Uses `AbortController` for cleanup on re-init
- Auto-initializes via MutationObserver on any `[data-ag-table]` element

**Column types**:
- Fixed/non-resizable: `Resizable="false"` or explicit `Width="40px"` → gets class `ag-col-fixed`, no resize handle
- Flex/resizable: default → gets class `ag-col-flex`, resize handle shown in header. Last flex column has no handle (nothing to donate from).

### Usage

```razor
<FluTable TItem="MyModel"
          Items="@_rows"
          NewRowFactory="@(() => new MyModel())"
          IsSelectedSelector="@(r => r.IsSelected)">

    <FluTableColumn TItem="MyModel" Header="" Width="40px" Resizable="false">
        <CellTemplate>
            <FluentCheckbox @bind-Value="context.IsSelected" />
        </CellTemplate>
    </FluTableColumn>

    <FluTableColumn TItem="MyModel" Header="Title">
        <CellTemplate>@context.Title</CellTemplate>
    </FluTableColumn>

    <FluTableColumn TItem="MyModel" Header="Notes" Multiline="true">
        <CellTemplate>@context.Notes</CellTemplate>
    </FluTableColumn>

    <FluTableColumn TItem="MyModel" Header="Date">
        <CellTemplate>@context.Date.ToString("yyyy-MM-dd")</CellTemplate>
    </FluTableColumn>

</FluTable>
```

### Parameters — FluTable

| Parameter | Type | Description |
|-----------|------|-------------|
| `Items` | `List<TItem>` | The data rows |
| `NewRowFactory` | `Func<TItem>?` | If provided, grid handles add/insert internally |
| `IsSelectedSelector` | `Func<TItem, bool>?` | Used to detect selection for "Delete Selected" button |
| `OnAddRow` | `EventCallback` | Fires when no `NewRowFactory` is set |
| `OnInsertAt` | `EventCallback<int>` | Fires insert at index when no factory |
| `OnDeleteRow` | `EventCallback<int>` | Fires after internal delete |
| `OnDeleteSelected` | `EventCallback` | Fires after internal delete selected |

### Parameters — FluTableColumn

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `Header` | `string` | required | Column header text |
| `Width` | `string?` | `null` | e.g. `"40px"` or `"20%"`. If null, distributed equally |
| `Resizable` | `bool` | `true` | Whether resize handle appears |
| `Multiline` | `bool` | `false` | `white-space: pre-wrap` on cells |
| `CellTemplate` | `RenderFragment<TItem>?` | — | Cell content |
| `HeaderTemplate` | `RenderFragment?` | — | Custom header content (any markup — icons, badges, etc.) |

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
- Uses `FluTable<TableRow>` with 4 columns: checkbox, title, multiline notes, date
- All three content columns use `HeaderTemplate` with FluentUI icons, a row-count badge on Title, and a multi-line subtitle on Notes
- 100 seed rows generated with `SeedData.Generate(100)` using `Random(42)`
- `NewRowFactory` provided so the grid manages add/insert/delete internally

## Known Decisions
- **No FluentDataGrid used** — replaced entirely with custom FluTable
- **FluentUI Blazor v4.14 installed in both projects** — library uses `FluentButton`, `FluentCheckbox`, and icons for the toolbar and row actions; demo uses them for cell templates
- `@rendermode InteractiveServer` required on pages that use JS interop
- Package script must be referenced from the consumer as `_content/FluTable/app-grid.js`

## Run & Build
```bash
make run      # dotnet run (from FluTable.Demo.csproj)
make build    # dotnet build FluTable.slnx
make rider    # open solution in JetBrains Rider
```
