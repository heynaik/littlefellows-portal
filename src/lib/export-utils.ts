
/**
 * Flattens a nested JSON object into a single-depth object for CSV export.
 * Specifically tailored for WooCommerce Order objects but generic enough for most uses.
 */
function flattenObject(obj: any, prefix = ''): any {
    return Object.keys(obj).reduce((acc: any, k) => {
        const pre = prefix.length ? prefix + '.' : '';
        if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
            Object.assign(acc, flattenObject(obj[k], pre + k));
        } else if (Array.isArray(obj[k])) {
            // specific handling for line items to be readable
            if (k === 'line_items') {
                acc[pre + k] = obj[k].map((i: any) => `${i.name} (x${i.quantity})`).join('; ');
            } else {
                acc[pre + k] = JSON.stringify(obj[k]);
            }
        } else {
            acc[pre + k] = obj[k];
        }
        return acc;
    }, {});
}

/**
 * Converts an array of objects to CSV format and triggers a browser download.
 * @param data Array of objects to export
 * @param filename Name of the file to download (without extension)
 */
export function exportToCSV(data: any[], filename: string) {
    if (!data || !data.length) return;

    // 1. Flatten Data
    const flatData = data.map(item => {
        // Pick specific high-level fields to avoid overly massive CSVs unless needed
        // For now, let's flatten a curated subset
        const curated = {
            id: item.id,
            number: item.number,
            status: item.status,
            date_created: item.date_created,
            total: item.total,
            currency: item.currency,
            customer_first_name: item.billing?.first_name,
            customer_last_name: item.billing?.last_name,
            customer_email: item.billing?.email,
            customer_phone: item.billing?.phone,
            shipping_address: `${item.shipping?.address_1}, ${item.shipping?.city}, ${item.shipping?.state}, ${item.shipping?.postcode}`,
            payment_method: item.payment_method_title,
            items: item.line_items?.map((i: any) => `${i.name} x${i.quantity}`).join(' | '),
            assigned_vendor: item.vendor_name || '',
            // Add more as needed
        };
        return curated;
    });

    // 2. Extract Headers
    const headers = Object.keys(flatData[0]);

    // 3. Create CSV Content
    const csvContent = [
        headers.join(','), // Header Row
        ...flatData.map(row => headers.map(fieldName => {
            let value = (row as any)[fieldName] || '';
            // Escape quotes and wrap in quotes if contains comma
            const stringValue = String(value).replace(/"/g, '""');
            return `"${stringValue}"`;
        }).join(','))
    ].join('\n');

    // 4. Trigger Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
