type Notice = { email: string; titulo: string; tipo: string; codigo?: string; situacao?: string; parecer?: string };
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);

export function buildNotice(data: Notice) {
  const protocol = data.tipo === "protocolo";
  const approved = !protocol && data.situacao === "aprovado";
  const heading = protocol ? "TCC recebido" : approved ? "Aprovado para a banca" : "Ajustes solicitados";
  const intro = protocol
    ? "Guarde seu código de acompanhamento e use-o com o e-mail desta mensagem."
    : approved
    ? "Aguarde o agendamento da banca pela coordenação. Este parecer autoriza a apresentação e não é a aprovação final do trabalho."
    : "Confira as orientações abaixo e acompanhe o trabalho no portal.";
  const details = protocol
    ? `${heading}.\nCódigo de acompanhamento: ${data.codigo}\n${intro}`
    : `Parecer do orientador: ${heading}. ${intro}` + (data.parecer ? `\n\nObservações:\n${data.parecer}` : "");
  const block = protocol
    ? `<p style="padding:16px;background:#edf5fc;border-radius:12px"><strong>Código de acompanhamento</strong><br><span style="font-family:monospace;word-break:break-all">${escapeHtml(data.codigo ?? "")}</span></p>`
    : data.parecer
    ? `<p style="padding:16px;background:#edf5fc;border-radius:12px;overflow-wrap:anywhere"><strong>Observações do orientador</strong><br>${escapeHtml(data.parecer).replace(/\r?\n/g, "<br>")}</p>`
    : "";
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f3f6fb;color:#10213d;font-family:Arial,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fb"><tr><td align="center" style="padding:20px 12px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px">
  <tr><td bgcolor="#084879" style="padding:20px 24px;color:#fff;border-radius:18px 18px 0 0">
    <strong style="font-size:21px">&lt;/&gt;&nbsp; Coordenação</strong><br><span style="color:#d9eafa;font-size:13px">TADS e EDC · AEMS</span>
  </td></tr>
  <tr><td bgcolor="#ffffff" style="padding:24px;border:1px solid #dfe6f1;border-radius:0 0 18px 18px;font-size:16px;line-height:1.55">
    <span style="color:#116bb0;font-size:12px;letter-spacing:1px;font-weight:bold">PORTAL DE TCC</span>
    <h1 style="margin:8px 0 12px;font-size:26px;line-height:1.2">${heading}</h1>
    <p style="overflow-wrap:anywhere"><strong>Trabalho:</strong> ${escapeHtml(data.titulo)}</p>
    <p>${intro}</p>${block}
    <p style="margin:24px 0 8px"><a href="https://tadsedc.site/tcc/" style="display:inline-block;background:#116bb0;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Acompanhar no portal</a></p>
  </td></tr></table></td></tr></table></body></html>`;
  return {
    from: "TCC | Coordenação <tcc@avisos.tadsedc.site>",
    to: [data.email],
    subject: protocol ? "TCC recebido — código de acompanhamento" : `TCC — ${heading.toLowerCase()}`,
    text: `Trabalho: ${data.titulo}\n\n${details}\n\nAcompanhe em https://tadsedc.site/tcc/\n\nCoordenação de TADS e EDC · AEMS`,
    html,
  };
}
