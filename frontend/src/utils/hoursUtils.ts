import { OperatingStatus } from '../types';

export function evaluateOperatingHours(openingHours: string | null | undefined): OperatingStatus {
  if (!openingHours || openingHours.trim() === '') {
    return {
      isOpen: null,
      statusLabel: 'Hours not listed',
      badgeVariant: 'slate',
      detailText: 'Standard campus access',
    };
  }

  const raw = openingHours.trim().toLowerCase();

  // 1. 24/7 or Always Open
  if (raw.includes('24 hours') || raw.includes('24/7') || raw.includes('always open')) {
    return {
      isOpen: true,
      statusLabel: 'Open 24/7',
      badgeVariant: 'emerald',
      detailText: 'Open all day and night',
    };
  }

  // 2. Appointment or explicitly closed
  if (raw.includes('appointment')) {
    return {
      isOpen: false,
      statusLabel: 'By Appointment',
      badgeVariant: 'amber',
      detailText: openingHours,
    };
  }

  if (raw === 'closed') {
    return {
      isOpen: false,
      statusLabel: 'Closed',
      badgeVariant: 'rose',
      detailText: 'Currently closed to public',
    };
  }

  // 3. Time Range Parser: HH:MM - HH:MM
  if (raw.includes('-')) {
    const parts = raw.split('-');
    if (parts.length === 2) {
      const startMatch = parts[0].trim().match(/^(\d{1,2}):(\d{2})$/);
      const endMatch = parts[1].trim().match(/^(\d{1,2}):(\d{2})$/);

      if (startMatch && endMatch) {
        const startMinutes = parseInt(startMatch[1], 10) * 60 + parseInt(startMatch[2], 10);
        const endMinutes = parseInt(endMatch[1], 10) * 60 + parseInt(endMatch[2], 10);

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        let isOpenNow = false;
        if (startMinutes <= endMinutes) {
          // Normal daily interval (e.g. 08:00 - 18:00)
          isOpenNow = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
        } else {
          // Overnight interval (e.g. 20:00 - 04:00)
          isOpenNow = currentMinutes >= startMinutes || currentMinutes <= endMinutes;
        }

        const formattedStart = parts[0].trim();
        const formattedEnd = parts[1].trim();

        if (isOpenNow) {
          return {
            isOpen: true,
            statusLabel: 'Open now',
            badgeVariant: 'emerald',
            detailText: `Closes at ${formattedEnd}`,
          };
        } else {
          return {
            isOpen: false,
            statusLabel: 'Closed',
            badgeVariant: 'rose',
            detailText: `Opens at ${formattedStart}`,
          };
        }
      }
    }
  }

  return {
    isOpen: null,
    statusLabel: 'Hours vary',
    badgeVariant: 'amber',
    detailText: openingHours,
  };
}
