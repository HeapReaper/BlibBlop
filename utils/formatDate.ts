export function formatDate(date: Date | string): string {
  let dateObj: Date;

  if (typeof date === 'string') {
    // Parse date string as yyyy-mm-dd without time
    const [year, month, day] = date.split('-').map(Number);
    // Create a date in Europe/Amsterdam timezone by treating as UTC midnight first
    // (This avoids timezone shift when converting)
    dateObj = new Date(Date.UTC(year, month - 1, day));
  } else {
    dateObj = date;
  }

  // Use Intl.DateTimeFormat with Europe/Amsterdam timezone
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Amsterdam',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Format the date
  const formatted = formatter.format(dateObj); // e.g. "11/05/2001"

  // Replace slashes with dashes to get dd-mm-yyyy
  return formatted.replace(/\//g, '-');
}
