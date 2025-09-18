export function formatDate(date: Date | string): string {
  let dateObj: Date;

  if (typeof date === "string") {
    const [year, month, day] = date.split("-").map(Number);
    dateObj = new Date(Date.UTC(year, month - 1, day));
  } else {
    dateObj = date;
  }

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const formatted = formatter.format(dateObj);

  return formatted.replace(/\//g, "-");
}
