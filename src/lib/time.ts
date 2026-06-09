/**
 * Time synchronization and Vietnam timezone support module.
 */

// This will store the difference: serverTime - clientLocalTime (in ms)
let serverClientOffset = 0;

/**
 * Initializes the time difference by fetching the server's time.
 * This guarantees all devices have the exact same reference time as the server.
 */
export async function initTimeSync(): Promise<void> {
  try {
    const start = Date.now();
    const res = await fetch(`/api/server-time?t=${start}`);
    if (res.ok) {
      const data = await res.json();
      const end = Date.now();
      const latency = (end - start) / 2;
      // Adjust offset with estimated simple latency
      serverClientOffset = (data.time + latency) - end;
      console.log(`[TimeSync] Initialized offset: ${serverClientOffset}ms (Latency: ${latency}ms)`);
    }
  } catch (error) {
    console.warn("[TimeSync] Failed to fetch server time, using client clock as fallback.", error);
  }
}

/**
 * Gets the current synchronized time as a standard Date object.
 * Adjusts for any local device clock drift.
 */
export function getSyncedTime(): Date {
  return new Date(Date.now() + serverClientOffset);
}

/**
 * Parses an ISO string (like YYYY-MM-DDTHH:mm or similar) into a Date object.
 * If the string lacks a timezone offset, we STRICTLY treat it as Vietnam Timezone (UTC +7).
 */
export function parseAsVietnamTime(timeStr: string): Date {
  if (!timeStr) return getSyncedTime();
  
  // If the string already has a timezone indicator (Z or +/- followed by hours), parse normally
  const hasTimezone = timeStr.includes("Z") || 
                      (timeStr.includes("+") && timeStr.indexOf("+") > 11) || 
                      (timeStr.lastIndexOf("-") > 11); 
                      
  if (hasTimezone) {
    return new Date(timeStr);
  }
  
  // If there's no timezone (like from a local datetime-local picker), 
  // append the Vietnam timezone offset +07:00 so it represents the exact Vietnam moment correctly.
  return new Date(timeStr + "+07:00");
}

/**
 * Formats a Date or ISO string into a standard Vietnamese visual datetime template (HH:MM DD/MM/YYYY)
 * in the absolute Vietnam timezone (UTC+7 / Indochina Time), independent of the browser's timezone.
 */
export function formatInVietnamTime(dateOrStr: Date | string | number | undefined): string {
  if (!dateOrStr) return "";
  
  let d: Date;
  if (dateOrStr instanceof Date) {
    d = dateOrStr;
  } else if (typeof dateOrStr === "string") {
    d = parseAsVietnamTime(dateOrStr);
  } else {
    d = new Date(dateOrStr);
  }

  try {
    // Format to Vietnam zone "Asia/Ho_Chi_Minh"
    const formatter = new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
    const parts = formatter.formatToParts(d);
    
    let day = "", month = "", year = "", hour = "", minute = "";
    for (const part of parts) {
      if (part.type === "day") day = part.value;
      if (part.type === "month") month = part.value;
      if (part.type === "year") year = part.value;
      if (part.type === "hour") hour = part.value;
      if (part.type === "minute") minute = part.value;
    }
    
    return `${hour}:${minute} ${day}/${month}/${year}`;
  } catch (e) {
    // Fallback if formatting fails
    const fallbackDate = new Date(dateOrStr);
    return `${fallbackDate.getHours().toString().padStart(2, '0')}:${fallbackDate.getMinutes().toString().padStart(2, '0')} ${fallbackDate.getDate().toString().padStart(2, '0')}/${(fallbackDate.getMonth() + 1).toString().padStart(2, '0')}/${fallbackDate.getFullYear()}`;
  }
}

/**
 * Formats a Date object to a string format suitable for datetime-local input
 * (YYYY-MM-DDTHH:mm) in the Vietnam (Asia/Ho_Chi_Minh) timezone.
 */
export function formatToVietnamLocalInput(date: Date): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    let year = "", month = "", day = "", hour = "", minute = "";
    for (const part of parts) {
      if (part.type === "year") year = part.value;
      if (part.type === "month") month = part.value;
      if (part.type === "day") day = part.value;
      if (part.type === "hour") hour = part.value;
      if (part.type === "minute") minute = part.value;
    }
    // Normalize "24" hour string to "00"
    if (hour === "24") hour = "00";
    return `${year}-${month}-${day}T${hour}:${minute}`;
  } catch (e) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
