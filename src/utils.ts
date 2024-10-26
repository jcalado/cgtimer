export class Utils {
  /**
   * Converts milliseconds from midnight to HH:mm:ss format
   * @param ms Number of milliseconds from midnight
   * @returns Formatted time string in HH:mm:ss format
   * @example
   * Utils.msToTime(3661000) // returns "01:01:01"
   * Utils.msToTime(-3661000) // returns "-01:01:01"
   */
  public static msToTime(ms: number): string {
    const isNegative = ms < 0;
    ms = Math.abs(ms);
    
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    return isNegative ? `-${timeString}` : timeString;
  }

  // You can add other utility methods here
}