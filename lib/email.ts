import { EmailClient } from "@azure/communication-email";

function getClient() {
  const conn = process.env.ACS_CONNECTION_STRING;
  const sender = process.env.ACS_SENDER; // e.g. no-reply@your-verified-domain.com
  if (!conn || !sender) return null;
  return { client: new EmailClient(conn), sender };
}

/** Returns detailed status so callers can log/inspect. */
export async function sendTaskCreatedEmail(args: {
  to: string;
  title: string;
  body?: string;
  taskId?: string;
}) {
  const cfg = getClient();
  if (!cfg) {
    const msg =
      "[email] ACS not configured (missing ACS_CONNECTION_STRING or ACS_SENDER).";
    console.warn(msg);
    return { ok: false, status: "NotConfigured", id: null, error: msg };
  }

  const { client, sender } = cfg;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const link = args.taskId && appUrl ? `${appUrl}/tasks/${args.taskId}` : "";
  const subject = `New Task: ${args.title}`;

  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5">
      <h2 style="margin:0 0 8px">A new task was created</h2>
      <p style="margin:0 0 12px"><strong>Title:</strong> ${escapeHtml(
        args.title
      )}</p>
      ${
        args.body
          ? `<p style="white-space:pre-wrap;margin:0 0 12px"><strong>Details:</strong><br>${escapeHtml(
              args.body
            )}</p>`
          : ""
      }
      ${
        link
          ? `<p style="margin:0 0 12px"><a href="${link}">Open this task</a></p>`
          : ""
      }
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
      <p style="color:#6b7280;font-size:12px">This is an automated notification from TaskHub.</p>
    </div>
  `;

  try {
    const poller = await client.beginSend({
      senderAddress: sender,
      content: {
        subject,
        html,
        plainText: `${args.title}\n\n${args.body || ""}\n${link}`,
      },
      recipients: { to: [{ address: args.to }] },
    });

    // Wait for ACS to complete the job and return the final status.
    const result = await poller.pollUntilDone();
    const status = result.status || "Unknown";
    const id = (result as any)?.id || (result as any)?.operationId || null;

    console.log("[email][ACS] result:", { status, id });

    return { ok: status === "Succeeded", status, id, error: null };
  } catch (err: any) {
    console.error("[email][ACS] send failed:", err?.message || err);
    return {
      ok: false,
      status: "Failed",
      id: null,
      error: String(err?.message || err),
    };
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
