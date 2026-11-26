type Notice = { email: string; titulo: string; tipo: string; codigo?: string; situacao?: string; parecer?: string };

export function buildNotice(data: Notice) {
  const protocol = data.tipo === "protocolo";
  const details = protocol
    ? `Seu TCC foi recebido.\nCódigo de acompanhamento: ${data.codigo}\nGuarde este código e use-o com o e-mail desta mensagem.`
    : `Parecer do orientador: ${data.situacao === "aprovado" ? "Aprovado. Consulte o prazo de entrega da versão final." : "Ajustes solicitados."}` +
      (data.parecer ? `\n\nObservações:\n${data.parecer}` : "");
  return {
    from: "TCC | Coordenação <tcc@avisos.tadsedc.site>",
    to: [data.email],
    subject: protocol ? "TCC recebido — código de acompanhamento" : "TCC — parecer do orientador",
    text: `Trabalho: ${data.titulo}\n\n${details}\n\nAcompanhe em https://tadsedc.site/tcc/\n\nCoordenação de TADS e EDC · AEMS`,
  };
}
