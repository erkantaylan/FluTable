let prevTemplate = null;
let busy = false;

export function initDataGrid() {
    // Delay to let FluentDataGrid's own OnAfterRenderAsync and its resize JS finish first
    setTimeout(setup, 300);
}

function setup() {
    const grid = document.querySelector('fluent-data-grid');
    if (!grid) return;

    // Set inline minWidth/maxWidth on the checkbox header cell.
    // The FluentDataGrid resize JS reads element.style.minWidth (inline, not computed)
    // to determine the minimum drag size — CSS !important does NOT affect this.
    const chkHeader = grid.querySelector('.col-checkbox[role=columnheader]');
    if (chkHeader) {
        chkHeader.style.minWidth = '40px';
        chkHeader.style.maxWidth = '40px';
    }

    const observer = new MutationObserver(() => {
        if (busy) return;
        busy = true;
        requestAnimationFrame(() => {
            fixLayout(grid);
            busy = false;
        });
    });

    const watch = el => observer.observe(el, { attributes: true, attributeFilter: ['style'] });
    watch(grid);
    grid.querySelectorAll('fluent-data-grid-row').forEach(watch);
}

function fixLayout(grid) {
    // Find the element that actually has gridTemplateColumns as an inline style
    const rows = [...grid.querySelectorAll('fluent-data-grid-row')];
    const source = [grid, ...rows].find(el => el.style.gridTemplateColumns);
    if (!source) return;

    const template = source.style.gridTemplateColumns;
    if (!template || template === prevTemplate) return;

    const parts = template.trim().split(/\s+/);
    if (parts.length < 4) return;

    const containerWidth = grid.clientWidth;
    if (!containerWidth) return;

    // Only fully normalize once all columns are pixel-based.
    // While fr units are present CSS grid handles 100% width correctly on its own.
    const allPx = parts.every(p => p.endsWith('px'));

    if (!allPx) {
        // Just ensure checkbox is locked; CSS handles the rest
        if (parseFloat(parts[0]) !== 40) {
            parts[0] = '40px';
            applyTemplate(grid, source, rows, parts.join(' '));
            prevTemplate = parts.join(' ');
        } else {
            prevTemplate = template;
        }
        return;
    }

    // All pixel — need to normalize to maintain 100% container width
    const widths = parts.map(parseFloat);
    const prevParts = prevTemplate ? prevTemplate.trim().split(/\s+/) : null;

    // Determine which column the user just resized so we can compensate a DIFFERENT one
    let changedIdx = -1;
    if (prevParts && prevParts.every(p => p.endsWith('px'))) {
        for (let i = 0; i < parts.length; i++) {
            if (Math.abs(parseFloat(parts[i]) - parseFloat(prevParts[i])) > 1) {
                changedIdx = i;
                break;
            }
        }
    }

    // Checkbox (index 0) is always locked to 40px
    widths[0] = 40;

    // If Notes (index 2) was resized → compensate with Title (index 1)
    // Otherwise → Notes (index 2) absorbs the change
    const compensateIdx = changedIdx === 2 ? 1 : 2;

    const fixedSum = widths.reduce((sum, w, i) => i === compensateIdx ? sum : sum + w, 0);
    widths[compensateIdx] = Math.max(50, containerWidth - fixedSum);

    const newTemplate = widths.map(w => Math.round(w) + 'px').join(' ');
    prevTemplate = newTemplate;

    if (newTemplate !== template) {
        applyTemplate(grid, source, rows, newTemplate);
    }
}

function applyTemplate(grid, source, rows, template) {
    // Apply to the source element and every row that already has the style set
    [grid, ...rows].forEach(el => {
        if (el === source || el.style.gridTemplateColumns) {
            el.style.gridTemplateColumns = template;
        }
    });
}
