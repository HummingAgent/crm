import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a display name from name/email
 * If name exists, return it
 * If only email, extract first part and format nicely
 * e.g., "john.doe@example.com" -> "John Doe"
 */
export function formatDisplayName(name: string | null | undefined, email: string | null | undefined): string {
  if (name) return name;
  if (!email) return 'Unknown';
  
  // Extract the part before @
  const localPart = email.split('@')[0];
  
  // Replace common separators with spaces and capitalize each word
  return localPart
    .replace(/[._-]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format assignee string for display
 * Handles both names and email addresses stored in the assigned_to field
 * e.g., "Shawn" -> "Shawn", "john.doe@example.com" -> "John Doe"
 */
export function formatAssignee(assignedTo: string | null | undefined): string {
  if (!assignedTo) return '';
  
  // Check if it looks like an email
  if (assignedTo.includes('@')) {
    return formatDisplayName(null, assignedTo);
  }
  
  // It's already a name
  return assignedTo;
}

/**
 * Get short display name (first name only) for compact displays
 */
export function formatAssigneeShort(assignedTo: string | null | undefined): string {
  const fullName = formatAssignee(assignedTo);
  if (!fullName) return '';
  return fullName.split(' ')[0];
}

/**
 * Get initials from a display name
 */
export function getInitials(displayName: string): string {
  const words = displayName.trim().split(' ').filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}
