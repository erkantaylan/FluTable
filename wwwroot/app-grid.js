// Per-table state keyed by tableId
const grids = new Map();

export function init(tableId) {
    cleanup(tableId);

    const table = document.getElementById(tableId);
    if (!table) return;

    const cols = [...table.querySelectorAll('col')];
    const ths  = [...table.querySelectorAll('thead th')];

    // Clear any previously JS-set widths on flex columns, then switch to
    // auto layout so the browser computes natural content-based widths.
    // This fixes two things:
    //   1. Checkbox column no longer bloats when the actions column is toggled
    //      (old % widths no longer summing to 100% caused fixed layout to
    //       proportionally scale ALL columns, including fixed-pixel ones).
    //   2. Title and Date columns start at their natural content width instead
    //      of an arbitrary equal share.
    cols.forEach(c => {
        if (c.classList.contains('ag-col-flex')) c.style.width = '';
    });
    table.style.tableLayout = 'auto';

    // Reading offsetWidth forces a synchronous reflow, giving us the
    // auto-computed column widths before we lock everything down.
    const tableWidth = table.offsetWidth;

    ths.forEach((th, i) => {
        if (i < cols.length && cols[i].classList.contains('ag-col-flex')) {
            cols[i].style.width = pct(th.offsetWidth, tableWidth);
        }
    });

    // Lock into fixed layout so all subsequent resize math stays in %
    // and the total always equals 100% of the container.
    table.style.tableLayout = 'fixed';

    const ac = new AbortController();
    grids.set(tableId, ac);

    // Attach mousedown to every resize handle
    ths.forEach((th, colIdx) => {
        const handle = th.querySelector('.ag-resize-handle');
        if (!handle) return;

        handle.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;

            // Find the next flex column to the right that will absorb the delta
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
