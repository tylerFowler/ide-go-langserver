import { NotificationOptions, ErrorNotificationOptions } from "atom";

export interface Notifier {
  notify(message: string, options?: NotificationOptions): void,
  warn(message: string, options?: NotificationOptions): void,
  error(message: string|Error, options?: ErrorNotificationOptions): void
}

export class AtomNotifier implements Notifier {
  notify(message: string, options?: NotificationOptions): void {
    atom.notifications.addInfo(message, options);
  }

  warn(message: string, options?: NotificationOptions): void {
    atom.notifications.addWarning(message, options);
  }

  error(message: string|Error, options: ErrorNotificationOptions): void {
    atom.notifications.addError(message.toString(), options);
  }
}