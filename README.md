# FluTable

A zero-dependency generic Blazor data grid that maintains 100% table width under column resize, supports double-click auto-fit, and exposes every cell and header through `RenderFragment` templates.

Built because `FluentDataGrid` locks column widths to absolute pixels after the first drag — there's no way to stay at 100% of the container without patching its private JS state. FluTable is percentage-based from the ground up.

## Features

- **Percentage-based column resize** — total table width always equals 100%, no horizontal scroll surprises
- **Double-click auto-fit** — reads the natural content width of every cell in a column and sizes to it
- **Generic `<TItem>`** — works with any model, no reflection, no attributes
- **`CellTemplate` and `HeaderTemplate`** — put any Razor markup in cells and headers (icons, badges, buttons, subtitles)
- **Multi-line cells** — set `Multiline="true"` for `white-space: pre-wrap` cells
- **Built-in row actions** — hover-reveal insert-above, insert-below, delete icons with an optional `NewRowFactory`
- **CSS variable theming** — customize font size, cell padding, and wrapper margin from the consuming app
- **Zero runtime dependencies** — only `Microsoft.AspNetCore.App`, no FluentUI, no MudBlazor, no third-party icon packs
- **.NET 10, Blazor Server + WebAssembly**

## Installation

```bash
dotnet add package FluTable
```

Then add the script reference to your `App.razor` (or `_Host.cshtml`, wherever your root layout lives):

```razor
<script type="module" src="@Assets["_content/FluTable/app-grid.js"]"></script>
```

The script self-initializes via `MutationObserver` — no JS interop call required from Blazor. It watches for `[data-ag-table]` elements and wires resize handles automatically, so it works with Server, WebAssembly, and enhanced navigation without manual setup.

> **Important**: pages that render a `<FluTable>` must use an interactive render mode (`@rendermode InteractiveServer` or `InteractiveWebAssembly`) because the resize handles depend on JS interop.

## Usage

```razor
@page "/meetings"
@rendermode InteractiveServer

<FluTable TItem="Meeting" Items="@_rows" NewRowFactory="@(() => new Meeting())">

    <FluTableColumn TItem="Meeting" Header="" Width="40px" Resizable="false">
        <CellTemplate>
            <input type="checkbox" @bind="context.IsSelected" />
        </CellTemplate>
    </FluTableColumn>

    <FluTableColumn TItem="Meeting" Header="Title">
        <CellTemplate>@context.Title</CellTemplate>
    </FluTableColumn>

    <FluTableColumn TItem="Meeting" Header="Notes" Multiline="true">
        <CellTemplate>@context.Notes</CellTemplate>
    </FluTableColumn>

    <FluTableColumn TItem="Meeting" Header="Date">
        <CellTemplate>@context.Date.ToString("yyyy-MM-dd")</CellTemplate>
    </FluTableColumn>

</FluTable>

@code {
    private List<Meeting> _rows = new();

    private sealed class Meeting
    {
        public bool     IsSelected { get; set; }
        public string   Title      { get; set; } = "";
        public string   Notes      { get; set; } = "";
        public DateTime Date       { get; set; }
    }
}
```

### Rich header templates

Any Razor markup works inside a `HeaderTemplate`:

```razor
<FluTableColumn TItem="Meeting" Header="Title">
    <HeaderTemplate>
        <strong>Title</strong>
        <span class="badge">@_rows.Count</span>
    </HeaderTemplate>
    <CellTemplate>@context.Title</CellTemplate>
</FluTableColumn>
```

### Interaction model

| Gesture | Result |
|---------|--------|
| Drag resize handle | Continuously resize the column; takes width from the next flex column to compensate |
| Double-click resize handle | Auto-fit the column to its widest content (header + body cells) |
| Hover row (with `ShowRowActions="true"`) | Reveal insert-above, insert-below, and delete icons on the right |

The last flex column deliberately has **no** resize handle — there's no right-hand neighbor to donate from, so dragging/double-clicking would be a no-op.

## FluTable parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `Items` | `List<TItem>` | required | The row data. Mutated in-place by row actions when `NewRowFactory` is set. |
| `ChildContent` | `RenderFragment?` | — | Column definitions (`<FluTableColumn>` children). |
| `NewRowFactory` | `Func<TItem>?` | `null` | When set, row-action insert buttons call this to produce new rows and mutate `Items` directly. |
| `ShowRowActions` | `bool` | `true` | Toggles the hover-reveal insert/delete buttons on each row. |
| `OnInsertAt` | `EventCallback<int>` | — | Fired when `NewRowFactory` is `null` and the user clicks insert above/below. Receives the target index. |
| `OnDeleteRow` | `EventCallback<int>` | — | Fired after a row is deleted. |

## FluTableColumn parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `Header` | `string` | required | Plain-text header. Overridden by `HeaderTemplate` if set. |
| `Width` | `string?` | `null` | e.g. `"40px"` or `"20%"`. If `null`, flex columns share the remaining space equally on first render. |
| `Resizable` | `bool` | `true` | `false` marks the column as fixed — no resize handle, width not included in resize math. |
| `Multiline` | `bool` | `false` | Applies `white-space: pre-wrap; word-break: break-word` to cells in this column. |
| `CellTemplate` | `RenderFragment<TItem>?` | — | Cell content. `context` is the row item. |
| `HeaderTemplate` | `RenderFragment?` | — | Custom header markup. |

## CSS variable theming

FluTable's internal CSS reads these custom properties with sensible fallbacks. Set them on any ancestor element and they cascade in:

| Variable | Default | Effect |
|----------|---------|--------|
| `--ag-font-size` | `14px` | Body cell font size |
| `--ag-cell-padding` | `4px` | Vertical padding on each body cell |
| `--ag-margin` | `0px` | Outer margin on the grid wrapper |

```razor
<div style="--ag-font-size:16px; --ag-cell-padding:6px;">
    <FluTable TItem="Meeting" Items="@_rows">...</FluTable>
</div>
```

The grid also reads FluentUI design tokens (`--accent-fill-rest`, `--neutral-foreground-rest`, etc.) when available, falling back to Microsoft-ish defaults otherwise — so it themes nicely in a FluentUI Blazor app without requiring it as a dependency.

## Requirements

- .NET 10
- A Blazor host (Server, WebAssembly, or Hybrid) with interactive rendering enabled on the consuming page

## License

MIT
