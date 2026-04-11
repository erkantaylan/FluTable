# FluTable Project

## Stack
- .NET 10, Blazor Web App (Server-side interactive)
- Two projects, standard OSS layout:
  - **src/FluTable** (`src/FluTable/FluTable.csproj`) — standalone Razor Class Library, the grid component. **Zero external NuGet dependencies** — only `Microsoft.AspNetCore.App` FrameworkReference. Ships inline SVG icons and plain HTML so consumers don't need FluentUI Blazor.
  - **samples/FluTable.Demo** (`samples/FluTable.Demo/FluTable.Demo.csproj`) — the demo app that consumes the library. Uses FluentUI Blazor v4.14 for its own page chrome (layout, cell templates, toolbar).

## Repo layout
```
/
├── src/
│   └── FluTable/              # the published NuGet library
│       ├── FluTable.csproj
│       ├── Components/
│       │   ├── FluTable.razor, FluTable.razor.cs, FluTable.razor.css
│       │   ├── FluTableColumn.razor
│       │   └── _Imports.razor
│       └── wwwroot/
│           └── app-grid.js    # served as _content/FluTable/app-grid.js
├── samples/
│   └── FluTable.Demo/         # reference app that consumes the library
│       ├── FluTable.Demo.csproj
│       ├── Program.cs
│       ├── Components/
│       ├── wwwroot/
│       ├── Properties/
│       └── appsettings*.json
├── README.md                  # shipped inside the NuGet package
├── LICENSE                    # MIT
├── FluTable.slnx              # references both projects
├── Makefile                   # run / build / pack / push / publish
└── .env                       # NUGET_KEY (gitignored)
```

## Custom DataGrid Component

We built a fully custom generic DataGrid instead of using FluentDataGrid.
**Reason**: FluentDataGrid's resize JS stores all column sizes as pixels after first drag with no compensation mechanism, making it impossible to maintain 100% table width without patching its private JS state.

### Files

| File | Purpose |
|------|---------|
| `src/FluTable/Components/FluTable.razor` | Template — table structure + hover-reveal row actions |
| `src/FluTable/Components/FluTable.razor.cs` | Code-behind — column registration, row ops |
| `src/FluTable/Components/FluTable.razor.css` | Scoped styles using FluentUI CSS tokens |
| `src/FluTable/Components/FluTableColumn.razor` | Headless column definition, registers with parent via CascadingValue |
| `src/FluTable/wwwroot/app-grid.js` | Column resize JS — percentage-based, maintains 100% width |

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
          ShowRowActions="@_editMode"
          NewRowFactory="@(() => new MyModel())">

    <FluTableColumn TItem="MyModel" Header="" Width="40px" Resizable="false">
        <CellTemplate>
            <input type="checkbox" @bind="context.IsSelected" />
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

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `Items` | `List<TItem>` | `[]` | The data rows. Mutated in-place by row actions when `NewRowFactory` is set. |
| `ChildContent` | `RenderFragment?` | — | Column definitions (`<FluTableColumn>` children) |
| `NewRowFactory` | `Func<TItem>?` | `null` | When set, row-action insert buttons call this to produce new rows |
| `ShowRowActions` | `bool` | `true` | Toggles the hover-reveal insert/delete icon column |
| `OnInsertAt` | `EventCallback<int>` | — | Fired when `NewRowFactory` is null and the user inserts a row |
| `OnDeleteRow` | `EventCallback<int>` | — | Fired after a row is deleted |

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
When `ShowRowActions="true"`, each row shows three icon buttons on hover (inline SVG, no external icon pack):
- **↑ Insert above** — inserts `NewRowFactory()` at `index`
- **↓ Insert below** — inserts `NewRowFactory()` at `index + 1`
- **Delete** — removes row at `index`

There is no toolbar inside the library — Add Row, Delete Selected, and any edit-mode toggle live in the consuming app (see `samples/FluTable.Demo/Components/Pages/Home.razor` for the demo's version).

### Theming via CSS variables
The library's scoped CSS reads these custom properties with fallbacks, so consumers can set them on any ancestor element and they cascade in:
- `--ag-font-size` (default `14px`) — body cell font size
- `--ag-cell-padding` (default `4px`) — vertical padding on each body cell
- `--ag-margin` (default `0px`) — outer margin on the grid wrapper

It also reads FluentUI design tokens (`--accent-fill-rest`, `--neutral-foreground-rest`, etc.) with Microsoft-ish defaults via `var(--token, #fallback)` so it themes cleanly in FluentUI apps without depending on them.

## Current Home Page (`samples/FluTable.Demo/Components/Pages/Home.razor`)
- `@rendermode InteractiveServer`
- Uses `FluTable<TableRow>` with 4 columns: checkbox, title, multiline notes, date
- All three content columns use `HeaderTemplate` with FluentUI icons, a row-count badge on Title, and a multi-line subtitle on Notes
- 100 seed rows generated with `SeedData.Generate(100)` using `Random(42)`
- `NewRowFactory` provided so the grid manages add/insert/delete internally

## Known Decisions
- **No FluentDataGrid used** — replaced entirely with custom FluTable
- **FluentUI Blazor only in the demo** — the library itself is dependency-free (only `Microsoft.AspNetCore.App`). Row-action buttons are plain `<button>` with inline SVG icons. CSS uses FluentUI tokens with `var(--token, #fallback)` so it themes cleanly with FluentUI and still looks acceptable without it.
- **Toolbar is demo-level**, not library-level. Add Row / Delete Selected / Edit rows toggle / font-padding-margin settings all live in `samples/FluTable.Demo/Components/Pages/Home.razor` and drive the grid via its public parameters (`Items`, `ShowRowActions`, `NewRowFactory`) and wrapper-level CSS variables.
- `@rendermode InteractiveServer` required on pages that use JS interop
- Package script must be referenced from the consumer as `_content/FluTable/app-grid.js` (demo wires this up in `samples/FluTable.Demo/Components/App.razor`)

## NuGet package
- **Published as** `FluTable` on https://www.nuget.org/packages/FluTable
- **Current version**: `0.1.0` (metadata in `src/FluTable/FluTable.csproj` — PackageId, Version, Authors, Description, tags, `MIT` license expression, README path, project/repository URLs)
- **README.md** at repo root is shipped inside the package via `<None Include="..\..\README.md" Pack="true" />`
- **Symbols package** (`.snupkg`) is built alongside the `.nupkg` so consumers can step into source in their debugger
- **XML docs** are generated, with CS1591 suppressed until the public API has full `///` coverage
- **Publish secret** lives in `.env` at repo root (gitignored), format `NUGET_KEY=...`. Never pass the key on the command line — the Makefile reads `.env` automatically.

## GitHub
- Remote: `git@github.com:erkantaylan/FluTable.git` (branch `master`)

## Run & Build
```bash
make run       # dotnet run (from FluTable.Demo.csproj)
make build     # dotnet build FluTable.slnx
make clean     # dotnet clean FluTable.slnx
make restore   # dotnet restore FluTable.slnx
make rider     # open solution in JetBrains Rider
```

## NuGet publish flow
```bash
make pack      # dotnet pack → src/FluTable/bin/Release/FluTable.X.Y.Z.nupkg
make push      # push the newest non-symbols .nupkg to nuget.org (needs NUGET_KEY in .env)
make publish   # pack + push in one shot
```
To release a new version: bump `<Version>` in `src/FluTable/FluTable.csproj`, then `make publish`.
