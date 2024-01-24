export const getFormattedTimeAtZone = (timezone: string): string => {
    const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
      };
    const formatter = new Intl.DateTimeFormat([], options);
    return formatter.format(new Date());
}