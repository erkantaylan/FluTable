// Per-table state keyed by tableId
const grids = new Map();

export function init(tableId) {
    cleanup(tableId);

    const table = document.getElementById(tableId);
    if (!table) return;

    const cols = [...table.querySelectorAll('col')];
    const ths  = [...table.querySelectorAll('thead th')];

    // First init vs reinit:
    //   First init  — no JS-set widths yet; temporarily switch to auto layout
    //                 so the browser computes content-based natural widths
    //                 (Title → widest title text, Date → date text width).
    //   Reinit      — flex cols already have JS-set % widths (e.g. after the
    //                 Edit-rows toggle adds/removes the actions column).
    //                 Mathematically redistribute those widths to fill the new
    //                 available space — no layout switch, no flicker.
    const isReinit = cols.some(c =>
        c.classList.contains('ag-col-flex') && c.style.width !== ''
    );

    if (isReinit) {
        redistributeFlex(table, cols, ths);
    } else {
        cols.forEach(c => {
            if (c.classList.contains('ag-col-flex')) c.style.width = '';
        });
        table.style.tableLayout = 'auto';
        const tableWidth = table.offsetWidth;   // forces reflow
        ths.forEach((th, i) => {
            if (i < cols.length && cols[i].classList.contains('ag-col-flex')) {
                cols[i].style.width = pct(th.offsetWidth, tableWidth);
            }
        });
        table.style.tableLayout = 'fixed';
    }

    const ac = new AbortController();
    grids.set(tableId, ac);

    // Attach mousedown to every resize handle
    ths.forEach((th, colIdx) => {
        const handle = th.querySelector('.ag-resize-handle');
        if (!handle) return;

        handle.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;

            const nextIdx = findNextFlex(cols, colIdx + 1);
            if (nextIdx === -1) return;

            const startX     = e.clientX;
            const startW     = th.offsetWidth;
            const startNextW = ths[nextIdx].offsetWidth;
            const minW       = 40;

            handle.classList.add('dragging');
            document.body.style.cursor     = 'col-resize';
            document.body.style.userSelect = 'none';

            const onMove = (e) => {
                const diff        = e.clientX - startX;
                const maxDiff     = startNextW - minW;
                const clampedDiff = Math.min(diff, maxDiff);
                const clampedW    = Math.max(minW, startW + clampedDiff);
                const newNextW    = startNextW - clampedDiff;

                const tw = table.offsetWidth;
                cols[colIdx].style.width  = pct(clampedW,  tw);
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
}

// Redistribute flex-col widths proportionally to fill the space left after
// fixed columns, without touching table-layout (no visual flicker).
// Uses specified pixel values from inline styles for fixed cols (more reliable
// than offsetWidth, which can be skewed by overflow-scaling in fixed layout).
function redistributeFlex(table, cols, ths) {
    const tableWidth = table.offsetWidth;

    let fixedTotal = 0;
    cols.forEach((col, i) => {
        if (col.classList.contains('ag-col-fixed') && i < ths.length) {
            const w = col.style.width;
            fixedTotal += (w && w.endsWith('px')) ? parseFloat(w) : ths[i].offsetWidth;
        }
    });

    const available  = tableWidth - fixedTotal;
    const flexItems  = [];
    let   flexTotal  = 0;

    ths.forEach((th, i) => {
        if (i < cols.length && cols[i].classList.contains('ag-col-flex')) {
            flexItems.push({ col: cols[i], w: th.offsetWidth });
            flexTotal += th.offsetWidth;
        }
    });

    if (flexTotal === 0) return;

    flexItems.forEach(({ col, w }) => {
        col.style.width = pct(w / flexTotal * available, tableWidth);
    });
}

function cleanup(tableId) {
    grids.get(tableId)?.abort();
    grids.delete(tableId);
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
