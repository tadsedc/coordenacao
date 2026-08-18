/* ==========================================================================
   SERVICE: DOCX GENERATOR - ESTÁGIO & EXPERIÊNCIA
   ========================================================================== */

export async function generateDocx(templateUrl, data, outputFilename = 'documento.docx') {
  if (!window.PizZip || !window.docxtemplater || !window.saveAs) {
    throw new Error('Bibliotecas de geração de documento não carregadas.');
  }

  const response = await fetch(templateUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Modelo não encontrado: ${templateUrl}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const zip = new window.PizZip(arrayBuffer);
  
  const doc = new window.docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
    nullGetter: () => ''
  });

  doc.render(data);

  const out = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });

  window.saveAs(out, outputFilename);
}
