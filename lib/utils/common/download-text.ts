export function downloadText(fileName: string, text: string, type = "text/plain"): void {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));

  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  // revoking synchronously cancels the download in some browsers
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
