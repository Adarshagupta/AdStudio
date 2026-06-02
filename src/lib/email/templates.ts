import "server-only";

type TemplateInput = {
  headline: string;
  body: string;
  actionLabel?: string;
  actionUrl?: string;
  footer?: string;
};

export function renderEmail({
  headline,
  body,
  actionLabel,
  actionUrl,
  footer,
}: TemplateInput) {
  const text = [
    headline,
    "",
    body,
    actionUrl && actionLabel ? `${actionLabel}: ${actionUrl}` : actionUrl,
    "",
    footer ?? "Ad Studio",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#fafafa;color:#18181b;font-family:Inter,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e4e4e7;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 8px;">
                <div style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:12px;background:#f3e8ff;color:#581c87;font-weight:600;font-size:14px;">A</div>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 28px 8px;">
                <h1 style="margin:0;font-size:22px;line-height:30px;font-weight:500;color:#18181b;">${escapeHtml(headline)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 22px;">
                <p style="margin:0;font-size:14px;line-height:24px;color:#52525b;">${escapeHtml(body).replace(/\n/g, "<br>")}</p>
              </td>
            </tr>
            ${
              actionLabel && actionUrl
                ? `<tr>
              <td style="padding:0 28px 28px;">
                <a href="${escapeAttribute(actionUrl)}" style="display:inline-block;border-radius:999px;background:#9333ea;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;padding:12px 18px;">${escapeHtml(actionLabel)}</a>
              </td>
            </tr>`
                : ""
            }
            <tr>
              <td style="border-top:1px solid #f4f4f5;padding:18px 28px;color:#71717a;font-size:12px;line-height:20px;">
                ${escapeHtml(footer ?? "Ad Studio")}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { text, html };
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
