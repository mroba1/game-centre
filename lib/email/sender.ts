export interface EmailSender {
  send(to: string, subject: string, html: string): Promise<void>;
}

/** Dev/MVP default — logs instead of sending, so the app runs with zero email-provider setup. */
class ConsoleEmailSender implements EmailSender {
  async send(to: string, subject: string, html: string): Promise<void> {
    console.log(`[email:dev] to=${to} subject="${subject}"\n${html}`);
  }
}

// Swap point for Resend/SendGrid/SES later (see docs/architecture.md §2.3) —
// add an adapter implementing EmailSender and select it here based on env,
// with zero changes to any calling code.
export const emailSender: EmailSender = new ConsoleEmailSender();
