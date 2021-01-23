export const getFormattedTimeAtZone = (timezone: string): string => {
    let options = {
        timeZone: timezone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
      },
    formatter = new Intl.DateTimeFormat([], options);
    return formatter.format(new Date());
}