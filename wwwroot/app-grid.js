// ── Per-table state ────────────────────────────────────────────────────────
// tableId → { ac: AbortController | null, colgroupObs: MutationObserver | null }
const grids = new Map();

// ── Table initialization ───────────────────────────────────────────────────

function initTable(table) {
    const id = table.id;
    if (!id) return;

    cleanup(id);

    const cols    = [...table.querySelectorAll(':scope > colgroup > col')];
    const ths     = [...table.querySelectorAll(':scope > thead > tr > th')];
    const colgroup = table.querySelector(':scope > colgroup');

    // Always watch the colgroup so future column additions/removals trigger reinit.
    // This fires in a microtask — before the browser paints — so no flicker.
    let colgroupObs = null;
    if (colgroup) {
        colgroupObs = new MutationObserver(() => initTable(table));
        colgroupObs.observe(colgroup, { childList: true });
    }

    if (cols.length === 0) {
        // No columns yet (first render before column registration completes).
        // Colgroup observer will reinit once cols arrive.
        grids.set(id, { ac: null, colgroupObs });
        return;
    }

    // ── Width initialisation ─────────────────────────────────────────────

    const isReinit = cols.some(c =>
        c.classList.contains('ag-col-flex') && c.style.width !== ''
    );

    if (isReinit) {
        redistributeFlex(table, cols, ths);
    } else {
        // First init: temporarily switch to auto layout so the browser
        // computes natural content widths, then lock them in as percentages.

        // Clear any previous flex widths and let auto layout breathe.
        cols.forEach(c => {
            if (c.classList.contains('ag-col-flex')) c.style.width = '';
        });
        table.style.tableLayout = 'auto';

        // ── Batch reads (single reflow) ──────────────────────────────────
        const tableWidth = table.offsetWidth;
        const thWidths   = ths.map(th => th.offsetWidth);

        // ── Batch writes (no reflows) ────────────────────────────────────
        ths.forEach((_, i) => {
            if (i < cols.length && cols[i].classList.contains('ag-col-flex')) {
                cols[i].style.width = pct(thWidths[i], tableWidth);
            }
        });
        table.style.tableLayout = 'fixed';
    }

    // ── Resize handles ───────────────────────────────────────────────────

    const ac = new AbortController();

    ths.forEach((th, colIdx) => {
        const handle = th.querySelector('.ag-resize-handle');
        if (!handle) return;

        handle.addEventListener('mousedown', e => {
            if (e.button !== 0) return;

            const nextIdx = findNextFlex(cols, colIdx + 1);
            if (nextIdx === -1) return;

            // ── Batch read before drag starts ──────────────────────────
            const startX     = e.clientX;
            const startW     = th.offsetWidth;
            const startNextW = ths[nextIdx].offsetWidth;
            const minW       = 40;

            handle.classList.add('dragging');
            document.body.style.cursor     = 'col-resize';
            document.body.style.userSelect = 'none';

            const onMove = ev => {
                const diff        = ev.clientX - startX;
                const maxDiff     = startNextW - minW;
                const clampedDiff = Math.min(diff, maxDiff);
                const clampedW    = Math.max(minW, startW + clampedDiff);
                const newNextW    = startNextW - clampedDiff;
                const tw          = table.offsetWidth;
                cols[colIdx].style.width  = pct(clampedW, tw);
                cols[nextIdx].style.width = pct(newNextW, tw);
            };

            const onUp = () => {
                handle.classList.remove('dragging');
                document.body.style.cursor     = '';
                document.body.style.userSelect = '';
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup',   onUp);
            };

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup',   onUp);
            e.preventDefault();
        }, { signal: ac.signal });
    });

    grids.set(id, { ac, colgroupObs });
}

// ── Redistribute flex-column widths proportionally ─────────────────────────
// Called on reinit (e.g. actions column added/removed). No table-layout switch
// needed — just redistribute the existing proportions into the new available space.

function redistributeFlex(table, cols, ths) {
    // ── Batch reads ──────────────────────────────────────────────────────
    const tableWidth = table.offsetWidth;

    let fixedTotal = 0;
    cols.forEach((col, i) => {
        if (col.classList.contains('ag-col-fixed') && i < ths.length) {
            const w = col.style.width;
            fixedTotal += (w && w.endsWith('px')) ? parseFloat(w) : ths[i].offsetWidth;
        }
    });

    const available = tableWidth - fixedTotal;
    const flexItems = [];
    let   flexTotal = 0;

    ths.forEach((th, i) => {
        if (i < cols.length && cols[i].classList.contains('ag-col-flex')) {
            flexItems.push({ col: cols[i], w: th.offsetWidth });
            flexTotal += th.offsetWidth;
        }
    });

    if (flexTotal === 0) return;

    // ── Batch writes ─────────────────────────────────────────────────────
    flexItems.forEach(({ col, w }) => {
        col.style.width = pct(w / flexTotal * available, tableWidth);
    });
}

// ── Helpers ────────────────────────────────────────────────────────────────

function cleanup(id) {
    const state = grids.get(id);
    if (!state) return;
    state.ac?.abort();
    state.colgroupObs?.disconnect();
    grids.delete(id);
}

function findNextFlex(cols, fromIdx) {
    for (let i = fromIdx; i < cols.length; i++) {
        if (cols[i].classList.contains('ag-col-flex')) return i;
    }
    return -1;
}

function pct(px, total) {
    return (px / total * 100).toFixed(3) + '%';
}

// ── Auto-discovery ─────────────────────────────────────────────────────────
// Watch the document for [data-ag-table] elements being added or removed.
// This handles:
//   • SSR pages  — tables are present when the module runs
//   • Interactive render — tables appear after Blazor hydrates
//   • Enhanced navigation — tables appear/disappear as pages change

new MutationObserver(mutations => {
    for (const { addedNodes, removedNodes } of mutations) {
        for (const node of addedNodes) {
            if (node.nodeType !== 1) continue;
            if (node.matches('[data-ag-table]'))                    initTable(node);
            else node.querySelectorAll?.('[data-ag-table]').forEach(initTable);
        }
        for (const node of removedNodes) {
            if (node.nodeType !== 1) continue;
            if (node.matches('[data-ag-table]'))                          cleanup(node.id);
            else node.querySelectorAll?.('[data-ag-table]').forEach(t => cleanup(t.id));
        }
    }
}).observe(document.body, { childList: true, subtree: true });

// Init any tables that are already in the DOM when this module loads
// (covers SSR-rendered pages where the table exists before JS runs).
document.querySelectorAll('[data-ag-table]').forEach(initTable);
