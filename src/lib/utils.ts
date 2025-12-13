import { differenceInDays, parseISO } from 'date-fns';

export function isPriorityOrder(dateCreated: string, status: string): boolean {
    const COMPLETED_STATUSES = ['completed', 'cancelled', 'refunded', 'failed', 'trash'];

    if (!dateCreated) return false;
    if (COMPLETED_STATUSES.includes(status.toLowerCase())) return false;

    const date = parseISO(dateCreated);
    const now = new Date();
    // Check if more than 4 days have passed
    return differenceInDays(now, date) > 4;
}
